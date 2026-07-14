import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { blankRowLike, cellCount, insertCell, padCells, removeCell, swapCells } from '../cells';
import { computeCellRange } from './navigate';
import { documentEol, readTableLines, renderTableLines } from './tableEdit';
import { Alignment, TableCursor } from '../types';

/** Index of the separator row within a table's raw lines. */
const SEPARATOR = 1;
/** Raw text of an empty cell: `|  |`. */
const EMPTY_CELL = '  ';

/**
 * Shared helper: load the raw lines of the table at the cursor, run a line
 * transform, then write them back — aligned or verbatim, per `alignOnEdit`.
 * If the transform returns a cursor, the selection is repositioned to a
 * collapsed caret at that cell's content start so repeated invocations keep
 * operating on the same (moved) content.
 */
async function transformTable(
  transform: (
    lines: string[],
    coords: TableCursor
  ) => { lines: string[]; cursor?: TableCursor } | null
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}

  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {
    vscode.window.showInformationMessage('Markdown Foundry: cursor is not inside a table.');
    return;
  }

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) {
    vscode.window.showInformationMessage('Markdown Foundry: cursor is on the separator row.');
    return;
  }

  const result = transform(readTableLines(document, location), coords);
  if (!result) {return;}

  const text = renderTableLines(result.lines, location, documentEol(document));
  const applied = await editor.edit((edit) => {
    edit.replace(location.range, text);
  });

  if (applied && result.cursor) {
    placeCaretInCell(editor, location.headerLine, result.cursor);
  }
}

function placeCaretInCell(
  editor: vscode.TextEditor,
  headerLine: number,
  cursor: TableCursor
): void {
  const lineNumber =
    cursor.rowIndex === -1 ? headerLine : headerLine + 2 + cursor.rowIndex;
  if (lineNumber >= editor.document.lineCount) {return;}

  const lineText = editor.document.lineAt(lineNumber).text;
  const range = computeCellRange(lineText, cursor.columnIndex);
  if (!range) {return;}

  const caret = new vscode.Position(lineNumber, range.start);
  editor.selection = new vscode.Selection(caret, caret);
  editor.revealRange(new vscode.Range(caret, caret));
}

/** Get the default alignment from user config. */
function defaultAlignment(): Alignment {
  const config = vscode.workspace.getConfiguration('markdownFoundry');
  return (config.get<Alignment>('defaultAlignment') ?? 'left');
}

/** Raw text of a separator cell carrying the given alignment. */
function separatorCell(alignment: Alignment): string {
  switch (alignment) {
    case 'left':
      return ' :--- ';
    case 'right':
      return ' ---: ';
    case 'center':
      return ' :---: ';
    case 'none':
    default:
      return ' --- ';
  }
}

/** Fill text used to grow a ragged row so `index` lands in the right column. */
function fillFor(lineIndex: number): string {
  return lineIndex === SEPARATOR ? separatorCell('none') : EMPTY_CELL;
}

/** Line index of a table row: -1 is the header, 0+ are body rows. */
function lineOf(rowIndex: number): number {
  return rowIndex === -1 ? 0 : rowIndex + 2;
}

export async function insertRowAboveCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    const insertAt = Math.max(0, rowIndex); // header row treated as index 0
    const next = [...lines];
    next.splice(insertAt + 2, 0, blankRowFrom(lines, rowIndex));
    return { lines: next, cursor: { rowIndex: insertAt, columnIndex } };
  });
}

export async function insertRowBelowCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    const insertAt = rowIndex < 0 ? 0 : rowIndex + 1;
    const next = [...lines];
    next.splice(insertAt + 2, 0, blankRowFrom(lines, rowIndex));
    return { lines: next, cursor: { rowIndex: insertAt, columnIndex } };
  });
}

/**
 * A blank row shaped like the cursor's row, but never narrower than the
 * header — a ragged neighbor must not hand the new row too few cells to put
 * the cursor in.
 */
function blankRowFrom(lines: string[], rowIndex: number): string {
  const reference = lines[lineOf(rowIndex)];
  return blankRowLike(padCells(reference, cellCount(lines[0]), EMPTY_CELL));
}

export async function insertColumnLeftCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    const index = columnOf(lines, columnIndex);
    return { lines: insertColumnAt(lines, index), cursor: { rowIndex, columnIndex: index } };
  });
}

export async function insertColumnRightCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    const index = columnOf(lines, columnIndex + 1);
    return { lines: insertColumnAt(lines, index), cursor: { rowIndex, columnIndex: index } };
  });
}

/**
 * A body row wider than the header lets the cursor report a column past the
 * header's last one. Clamping keeps the new column inside the table, the way
 * Array.splice clamps a past-the-end index.
 */
function columnOf(lines: string[], index: number): number {
  return Math.min(index, cellCount(lines[0]));
}

function insertColumnAt(lines: string[], index: number): string[] {
  const newCell = separatorCell(defaultAlignment());
  const columns = cellCount(lines[0]);
  return lines.map((line, i) => {
    const cell = i === SEPARATOR ? newCell : EMPTY_CELL;
    return insertCell(padCells(line, columns, fillFor(i)), index, cell);
  });
}

export async function deleteRowCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    if (rowIndex < 0) {
      vscode.window.showInformationMessage('Markdown Foundry: cannot delete the header row.');
      return null;
    }
    if (lines.length <= 2) {return null;}
    const next = [...lines];
    next.splice(rowIndex + 2, 1);
    const remaining = next.length - 2;
    const cursorRow = remaining === 0 ? -1 : Math.min(rowIndex, remaining - 1);
    return { lines: next, cursor: { rowIndex: cursorRow, columnIndex } };
  });
}

export async function deleteColumnCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    const columns = cellCount(lines[0]);
    if (columns <= 1) {
      vscode.window.showInformationMessage('Markdown Foundry: cannot delete the last column.');
      return null;
    }
    // A cursor in a body row wider than the header can point past the last
    // column; there is nothing there to delete.
    if (columnIndex >= columns) {
      return null;
    }
    return {
      lines: lines.map((line) => removeCell(line, columnIndex)),
      cursor: { rowIndex, columnIndex: Math.min(columnIndex, columns - 2) }
    };
  });
}

export async function moveRowUpCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    if (rowIndex <= 0) {return null;}
    return {
      lines: swapLines(lines, rowIndex + 2, rowIndex + 1),
      cursor: { rowIndex: rowIndex - 1, columnIndex }
    };
  });
}

export async function moveRowDownCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    if (rowIndex < 0 || rowIndex >= lines.length - 3) {return null;}
    return {
      lines: swapLines(lines, rowIndex + 2, rowIndex + 3),
      cursor: { rowIndex: rowIndex + 1, columnIndex }
    };
  });
}

function swapLines(lines: string[], a: number, b: number): string[] {
  const next = [...lines];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export async function moveColumnLeftCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    if (columnIndex <= 0 || columnIndex >= cellCount(lines[0])) {return null;}
    return {
      lines: swapColumns(lines, columnIndex, columnIndex - 1),
      cursor: { rowIndex, columnIndex: columnIndex - 1 }
    };
  });
}

export async function moveColumnRightCommand(): Promise<void> {
  await transformTable((lines, { rowIndex, columnIndex }) => {
    if (columnIndex >= cellCount(lines[0]) - 1) {return null;}
    return {
      lines: swapColumns(lines, columnIndex, columnIndex + 1),
      cursor: { rowIndex, columnIndex: columnIndex + 1 }
    };
  });
}

function swapColumns(lines: string[], a: number, b: number): string[] {
  const columns = cellCount(lines[0]);
  return lines.map((line, i) => swapCells(padCells(line, columns, fillFor(i)), a, b));
}
