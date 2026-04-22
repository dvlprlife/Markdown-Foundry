import * as vscode from 'vscode';
import { Alignment, TableModel } from './types';
import { TableLocation } from './locator';

/**
 * Parse the lines of a located table into a TableModel.
 *
 * Contract:
 *   - headers.length === alignments.length
 *   - every row in rows has exactly headers.length cells (padded/truncated as needed)
 *   - cell values are trimmed and have escaped pipes unescaped
 *   - indent is the leading whitespace of the header line
 */
export function parseTable(
  document: vscode.TextDocument,
  location: TableLocation
): TableModel {
  const headerText = document.lineAt(location.headerLine).text;
  const separatorText = document.lineAt(location.separatorLine).text;

  const indent = leadingIndent(headerText);
  const headers = splitRow(headerText);
  const alignments = parseAlignments(separatorText, headers.length);

  const rows: string[][] = [];
  for (let i = location.separatorLine + 1; i <= location.lastBodyLine; i++) {
    const row = splitRow(document.lineAt(i).text);
    rows.push(normalizeRowWidth(row, headers.length));
  }

  return {
    headers,
    alignments,
    rows,
    range: location.range,
    indent,
    eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
  };
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

  if (startsWithColon && endsWithColon) return 'center';
  if (endsWithColon) return 'right';
  if (startsWithColon) return 'left';
  return 'none';
}

/**
 * Make a row exactly `width` cells wide.
 * Pads with empty strings, truncates extras.
 */
function normalizeRowWidth(row: string[], width: number): string[] {
  if (row.length === width) return row;
  if (row.length < width) {
    return [...row, ...Array(width - row.length).fill('')];
  }
  return row.slice(0, width);
}
