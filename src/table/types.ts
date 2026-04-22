import * as vscode from 'vscode';

export type Alignment = 'left' | 'center' | 'right' | 'none';

/**
 * Parsed representation of a single Markdown pipe table.
 */
export interface TableModel {
  /** Header cell values (trimmed, pipes unescaped). */
  headers: string[];
  /** Column alignments derived from the separator row. */
  alignments: Alignment[];
  /** Body rows, each an array of cell strings. */
  rows: string[][];
  /** Range in the document covering the entire table block. */
  range: vscode.Range;
  /** Leading whitespace/indent on each line, preserved on emit. */
  indent: string;
  /** Line ending style used by the source document. */
  eol: string;
}

/**
 * Cursor position expressed as table coordinates.
 * rowIndex: -1 = header row, 0+ = body row index.
 */
export interface TableCursor {
  rowIndex: number;
  columnIndex: number;
}
