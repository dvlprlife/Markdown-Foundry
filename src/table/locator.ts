import * as vscode from 'vscode';
import { TableCursor } from './types';

/**
 * Matches a line that looks like a table row: starts with optional whitespace,
 * contains at least one unescaped pipe, and ends with optional whitespace.
 * Handles escaped pipes (\|) which should NOT count as row separators.
 */
const TABLE_LINE_RE = /^\s*\|.*\|\s*$/;

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
 * inside a table. A table is defined as:
 *   - a header line (pipe row)
 *   - followed immediately by a separator line
 *   - followed by zero or more body lines (pipe rows)
 */
export function locateTable(
  document: vscode.TextDocument,
  line: number
): TableLocation | null {
  if (line < 0 || line >= document.lineCount) {
    return null;
  }

  // Walk upward to find the header row.
  // The line the cursor is on could be header, separator, or a body row.
  let headerLine = -1;
  let separatorLine = -1;

  // Scan upward until we find a non-table line.
  let start = line;
  while (start >= 0 && isTableLike(document.lineAt(start).text)) {
    start--;
  }
  const firstTableLine = start + 1;

  // From firstTableLine, the first line is the header, the next must be the separator.
  if (firstTableLine >= document.lineCount) {
    return null;
  }
  const potentialHeader = document.lineAt(firstTableLine).text;
  if (!TABLE_LINE_RE.test(potentialHeader)) {
    return null;
  }
  if (firstTableLine + 1 >= document.lineCount) {
    return null;
  }
  const potentialSeparator = document.lineAt(firstTableLine + 1).text;
  if (!SEPARATOR_RE.test(potentialSeparator)) {
    return null;
  }
  headerLine = firstTableLine;
  separatorLine = firstTableLine + 1;

  // Walk downward from separator to find the last body line.
  let lastBodyLine = separatorLine;
  for (let i = separatorLine + 1; i < document.lineCount; i++) {
    if (isTableLike(document.lineAt(i).text)) {
      lastBodyLine = i;
    } else {
      break;
    }
  }

  // Sanity: the cursor line must fall within [headerLine, lastBodyLine].
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
 * Accepts both pipe rows and separator rows.
 */
function isTableLike(text: string): boolean {
  return TABLE_LINE_RE.test(text) || SEPARATOR_RE.test(text);
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
  // Skip leading indent and the first |
  while (i < lineText.length && lineText[i] !== '|') i++;
  if (i < lineText.length) i++; // consume opening |

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
