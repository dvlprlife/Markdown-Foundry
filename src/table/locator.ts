import * as vscode from 'vscode';
import { TableCursor } from './types';

/**
 * Matches an unescaped pipe anywhere in a line. GFM does not require rows to
 * have leading/trailing pipes (`a | b` is a valid row), so any unescaped pipe
 * makes a line row-like. Escaped pipes (\|) do not count.
 */
const UNESCAPED_PIPE_RE = /(?<!\\)\|/;

/**
 * Matches a separator row: pipes plus dashes, colons for alignment, whitespace.
 * Examples: |---|---|, |:--|--:|, | :---: | --- |
 */
const SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

/**
 * Result of locating a table in the document.
 */
export interface TableLocation {
  /** Range covering all lines of the table (header + separator + body). */
  range: vscode.Range;
  /** Line number of the header row. */
  headerLine: number;
  /** Line number of the separator row. */
  separatorLine: number;
  /** Line number of the last body row (inclusive). */
  lastBodyLine: number;
}

/**
 * Return the table containing the given line, or null if the line is not
 * inside a table. A table is the contiguous block of row-like lines around
 * the cursor, provided some line in the block is immediately followed by a
 * separator row: the topmost such pair is the header/separator, and the
 * block's last line is the last body row.
 */
export function locateTable(
  document: vscode.TextDocument,
  line: number
): TableLocation | null {
  if (line < 0 || line >= document.lineCount) {
    return null;
  }
  if (!isRowLike(document.lineAt(line).text)) {
    return null;
  }

  // Walk up and down from the cursor to the edges of the contiguous block
  // of row-like lines.
  let firstTableLine = line;
  while (firstTableLine > 0 && isRowLike(document.lineAt(firstTableLine - 1).text)) {
    firstTableLine--;
  }
  let lastBodyLine = line;
  while (
    lastBodyLine + 1 < document.lineCount &&
    isRowLike(document.lineAt(lastBodyLine + 1).text)
  ) {
    lastBodyLine++;
  }

  // The block's top line is not necessarily the header — prose containing a
  // pipe can sit directly above the table. The header is the topmost row
  // immediately followed by a separator.
  let headerLine = -1;
  for (let i = firstTableLine; i < lastBodyLine; i++) {
    if (SEPARATOR_RE.test(document.lineAt(i + 1).text)) {
      headerLine = i;
      break;
    }
  }
  if (headerLine === -1) {
    return null;
  }
  const separatorLine = headerLine + 1;

  // A cursor above the header (e.g. on prose-with-pipe stuck to the table)
  // is not inside the table.
  if (line < headerLine || line > lastBodyLine) {
    return null;
  }

  const startPos = new vscode.Position(headerLine, 0);
  const endLineText = document.lineAt(lastBodyLine).text;
  const endPos = new vscode.Position(lastBodyLine, endLineText.length);

  return {
    range: new vscode.Range(startPos, endPos),
    headerLine,
    separatorLine,
    lastBodyLine
  };
}

/**
 * Loose check: line looks like it could be part of a table.
 * Separator rows always contain a pipe, so this covers them too.
 */
function isRowLike(text: string): boolean {
  return UNESCAPED_PIPE_RE.test(text);
}

/**
 * Given a table location and a cursor position, return the (row, column) the
 * cursor is in. Returns null if the cursor is on the separator row.
 *
 * rowIndex: -1 for header row, 0..n for body rows.
 * columnIndex: 0-based cell index.
 */
export function cursorToTableCoords(
  document: vscode.TextDocument,
  location: TableLocation,
  position: vscode.Position
): TableCursor | null {
  if (position.line === location.separatorLine) {
    return null;
  }

  let rowIndex: number;
  if (position.line === location.headerLine) {
    rowIndex = -1;
  } else if (
    position.line > location.separatorLine &&
    position.line <= location.lastBodyLine
  ) {
    rowIndex = position.line - location.separatorLine - 1;
  } else {
    return null;
  }

  const lineText = document.lineAt(position.line).text;
  const columnIndex = characterOffsetToColumnIndex(lineText, position.character);
  return { rowIndex, columnIndex };
}

/**
 * Convert a character offset within a table row line to a cell index.
 * Respects escaped pipes (\|).
 */
function characterOffsetToColumnIndex(lineText: string, charOffset: number): number {
  let column = 0;
  let i = 0;
  // Skip leading indent, then consume a leading | if present. On pipeless
  // rows (`a | b`) the first pipe is a cell separator, not an opening
  // delimiter, so it must be counted below.
  while (i < lineText.length && /\s/.test(lineText[i])) {i++;}
  if (i < lineText.length && lineText[i] === '|') {i++;}

  while (i < charOffset && i < lineText.length) {
    if (lineText[i] === '\\' && i + 1 < lineText.length && lineText[i + 1] === '|') {
      i += 2;
      continue;
    }
    if (lineText[i] === '|') {
      column++;
    }
    i++;
  }
  return column;
}
