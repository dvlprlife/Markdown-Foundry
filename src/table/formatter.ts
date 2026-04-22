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

/**
 * Visual width of a string. For ASCII content this equals .length.
 * For non-ASCII content (CJK, emoji, etc.) this is an approximation using
 * character codepoints. A pure implementation would use the East Asian Width
 * algorithm; we keep this dependency-free and good enough for v1.
 */
export function visualWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (isWideCodePoint(code)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Returns true for codepoints that are typically rendered two columns wide
 * in monospaced fonts: CJK characters, fullwidth forms, most emoji.
 * Based on common East Asian Width ranges; simplified for v1.
 */
function isWideCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||    // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) ||    // CJK Radicals, Kangxi, etc.
    (code >= 0x3041 && code <= 0x33ff) ||    // Hiragana, Katakana, CJK symbols
    (code >= 0x3400 && code <= 0x4dbf) ||    // CJK Extension A
    (code >= 0x4e00 && code <= 0x9fff) ||    // CJK Unified Ideographs
    (code >= 0xa000 && code <= 0xa4cf) ||    // Yi
    (code >= 0xac00 && code <= 0xd7a3) ||    // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||    // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe4f) ||    // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) ||    // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) ||    // Fullwidth Signs
    (code >= 0x1f300 && code <= 0x1f64f) ||  // Emoji block 1
    (code >= 0x1f680 && code <= 0x1f6ff) ||  // Transport & Map Symbols
    (code >= 0x1f900 && code <= 0x1f9ff) ||  // Supplemental Symbols and Pictographs
    (code >= 0x20000 && code <= 0x2fffd)     // CJK Extension B-F
  );
}
