import stringWidth from 'string-width';
import { Alignment, TableModel } from './types';

/**
 * Format a TableModel into a Markdown string with aligned columns.
 *
 * Alignment rules:
 *   - 'left':   padEnd to column width
 *   - 'right':  padStart to column width
 *   - 'center': pad both sides as evenly as possible (extra space on right)
 *   - 'none':   treated as 'left'
 *
 * The separator row uses: :--- / ---: / :---: / --- depending on alignment,
 * padded with dashes to match column width (minimum 3 dashes).
 */
export function formatTable(model: TableModel): string {
  const { headers, alignments, rows, indent, eol } = model;

  // Compute visual width of every cell across all rows.
  const columnWidths = computeColumnWidths(headers, rows);

  const headerLine = indent + formatRow(headers, columnWidths, alignments);
  const separatorLine = indent + formatSeparator(alignments, columnWidths);
  const bodyLines = rows.map((row) => indent + formatRow(row, columnWidths, alignments));

  return [headerLine, separatorLine, ...bodyLines].join(eol);
}

function computeColumnWidths(headers: string[], rows: string[][]): number[] {
  const widths = headers.map((h) => visualWidth(escapeForCell(h)));
  for (const row of rows) {
    for (let i = 0; i < widths.length; i++) {
      const cell = row[i] ?? '';
      widths[i] = Math.max(widths[i], visualWidth(escapeForCell(cell)));
    }
  }
  // Minimum width of 3 so separator row always has room for at least ---
  return widths.map((w) => Math.max(w, 3));
}

function formatRow(cells: string[], widths: number[], alignments: Alignment[]): string {
  const parts = widths.map((width, i) => {
    const raw = cells[i] ?? '';
    const escaped = escapeForCell(raw);
    return ' ' + padCell(escaped, width, alignments[i]) + ' ';
  });
  return '|' + parts.join('|') + '|';
}

function formatSeparator(alignments: Alignment[], widths: number[]): string {
  const parts = alignments.map((align, i) => {
    const width = widths[i];
    switch (align) {
      case 'left':
        return ' :' + '-'.repeat(Math.max(width - 1, 2)) + ' ';
      case 'right':
        return ' ' + '-'.repeat(Math.max(width - 1, 2)) + ': ';
      case 'center':
        return ' :' + '-'.repeat(Math.max(width - 2, 1)) + ': ';
      case 'none':
      default:
        return ' ' + '-'.repeat(width) + ' ';
    }
  });
  return '|' + parts.join('|') + '|';
}

function padCell(cell: string, width: number, alignment: Alignment): string {
  const diff = width - visualWidth(cell);
  if (diff <= 0) return cell;

  switch (alignment) {
    case 'right':
      return ' '.repeat(diff) + cell;
    case 'center': {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + cell + ' '.repeat(right);
    }
    case 'left':
    case 'none':
    default:
      return cell + ' '.repeat(diff);
  }
}

/**
 * Escape a cell value for output. We escape pipes so they don't break the row.
 */
function escapeForCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

// Delegates to `string-width` for grapheme-aware width calculation (CJK,
// emoji including ZWJ sequences, combining marks, variation selectors).
export function visualWidth(text: string): number {
  return stringWidth(text);
}
