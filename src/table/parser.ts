import * as vscode from 'vscode';
import { Alignment, TableModel } from './types';
import { TableLocation } from './locator';

/**
 * Parse the lines of a located table into a TableModel.
 *
 * Contract:
 *   - headers.length === alignments.length === the table's column count
 *   - the column count is the widest of the header, the separator and every
 *     body row, so no cell is ever dropped
 *   - every row in rows has exactly headers.length cells (short rows padded)
 *   - cell values are trimmed and have escaped pipes unescaped
 *   - indent is the leading whitespace of the header line
 */
export function parseTable(
  document: vscode.TextDocument,
  location: TableLocation
): TableModel {
  const lines: string[] = [];
  for (let i = location.headerLine; i <= location.lastBodyLine; i++) {
    lines.push(document.lineAt(i).text);
  }
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  return parseTableFromLines(lines, location.range, eol);
}

/**
 * Parse raw table lines — header, separator, then body rows — into a
 * TableModel. Lets edited lines be re-parsed without a TextDocument.
 */
export function parseTableFromLines(
  lines: string[],
  range: vscode.Range,
  eol: string
): TableModel {
  const headerText = lines[0] ?? '';
  const separatorText = lines[1] ?? '';

  const indent = leadingIndent(headerText);
  const headerCells = splitRow(headerText);
  const bodyCells = lines.slice(2).map(splitRow);

  // Widening to the widest row rather than the header's width is what keeps a
  // body cell past the last header column from being deleted on re-emit.
  const columns = bodyCells.reduce(
    (widest, row) => Math.max(widest, row.length),
    Math.max(headerCells.length, splitRow(separatorText).length)
  );

  const headers = normalizeRowWidth(headerCells, columns);
  const alignments = parseAlignments(separatorText, columns);
  const rows = bodyCells.map((row) => normalizeRowWidth(row, columns));

  return { headers, alignments, rows, range, indent, eol };
}

function leadingIndent(text: string): string {
  const match = text.match(/^\s*/);
  return match ? match[0] : '';
}

/**
 * Split a pipe-delimited row into cells.
 * Respects escaped pipes (\|) which become literal | in the resulting cell.
 * Strips a single leading and trailing | if present.
 */
export function splitRow(lineText: string): string[] {
  const trimmed = lineText.trim();
  // Tokenize, treating \| as literal |
  const cells: string[] = [];
  let current = '';
  let i = 0;

  // Strip leading |
  if (trimmed.startsWith('|')) {
    i = 1;
  }

  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }

  // If the line did not end with |, the trailing content is the last cell.
  // If it did end with |, the above loop already pushed the final cell and
  // current is empty — skip it.
  if (current.length > 0 || !trimmed.endsWith('|')) {
    cells.push(current.trim());
  }

  return cells;
}

/**
 * Parse the alignment markers from the separator row.
 * Pads or truncates to match the number of headers.
 */
export function parseAlignments(separatorText: string, expectedLength: number): Alignment[] {
  const cells = splitRow(separatorText);
  const alignments: Alignment[] = cells.map(cellToAlignment);

  while (alignments.length < expectedLength) {
    alignments.push('none');
  }
  return alignments.slice(0, expectedLength);
}

function cellToAlignment(cell: string): Alignment {
  const trimmed = cell.trim();
  const startsWithColon = trimmed.startsWith(':');
  const endsWithColon = trimmed.endsWith(':');

  if (startsWithColon && endsWithColon) {return 'center';}
  if (endsWithColon) {return 'right';}
  if (startsWithColon) {return 'left';}
  return 'none';
}

/**
 * Make a row exactly `width` cells wide.
 * Pads with empty strings, truncates extras.
 */
function normalizeRowWidth(row: string[], width: number): string[] {
  if (row.length === width) {return row;}
  if (row.length < width) {
    return [...row, ...Array(width - row.length).fill('')];
  }
  return row.slice(0, width);
}
