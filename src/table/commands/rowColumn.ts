import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';
import { computeCellRange } from './navigate';
import { Alignment, TableCursor, TableModel } from '../types';

/**
 * Shared helper: load the table at the cursor, run a transform on the model,
 * then write it back. If the transform returns a cursor, the selection is
 * repositioned to a collapsed caret at that cell's content start so repeated
 * invocations keep operating on the same (moved) content.
 */
async function transformTable(
  transform: (
    model: TableModel,
    coords: TableCursor
  ) => { model: TableModel; cursor?: TableCursor } | null
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

  const model = parseTable(document, location);
  const result = transform(model, coords);
  if (!result) {return;}

  const formatted = formatTable(result.model);
  const applied = await editor.edit((edit) => {
    edit.replace(location.range, formatted);
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

export async function insertRowAboveCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    const newRow = Array(model.headers.length).fill('');
    const insertAt = Math.max(0, rowIndex); // header row treated as index 0
    const rows = [...model.rows];
    rows.splice(insertAt, 0, newRow);
    return { model: { ...model, rows }, cursor: { rowIndex: insertAt, columnIndex } };
  });
}

export async function insertRowBelowCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    const newRow = Array(model.headers.length).fill('');
    const insertAt = rowIndex < 0 ? 0 : rowIndex + 1;
    const rows = [...model.rows];
    rows.splice(insertAt, 0, newRow);
    return { model: { ...model, rows }, cursor: { rowIndex: insertAt, columnIndex } };
  });
}

export async function insertColumnLeftCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    return { model: insertColumnAt(model, columnIndex), cursor: { rowIndex, columnIndex } };
  });
}

export async function insertColumnRightCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    return {
      model: insertColumnAt(model, columnIndex + 1),
      cursor: { rowIndex, columnIndex: columnIndex + 1 }
    };
  });
}

function insertColumnAt(model: TableModel, index: number): TableModel {
  const align = defaultAlignment();
  const headers = [...model.headers];
  const alignments = [...model.alignments];
  headers.splice(index, 0, '');
  alignments.splice(index, 0, align);
  const rows = model.rows.map((row) => {
    const r = [...row];
    r.splice(index, 0, '');
    return r;
  });
  return { ...model, headers, alignments, rows };
}

export async function deleteRowCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (rowIndex < 0) {
      vscode.window.showInformationMessage('Markdown Foundry: cannot delete the header row.');
      return null;
    }
    if (model.rows.length === 0) {return null;}
    const rows = [...model.rows];
    rows.splice(rowIndex, 1);
    const cursorRow = rows.length === 0 ? -1 : Math.min(rowIndex, rows.length - 1);
    return { model: { ...model, rows }, cursor: { rowIndex: cursorRow, columnIndex } };
  });
}

export async function deleteColumnCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (model.headers.length <= 1) {
      vscode.window.showInformationMessage('Markdown Foundry: cannot delete the last column.');
      return null;
    }
    const headers = [...model.headers];
    const alignments = [...model.alignments];
    headers.splice(columnIndex, 1);
    alignments.splice(columnIndex, 1);
    const rows = model.rows.map((row) => {
      const r = [...row];
      r.splice(columnIndex, 1);
      return r;
    });
    return {
      model: { ...model, headers, alignments, rows },
      cursor: { rowIndex, columnIndex: Math.min(columnIndex, headers.length - 1) }
    };
  });
}

export async function moveRowUpCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (rowIndex <= 0) {return null;}
    const rows = [...model.rows];
    [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
    return { model: { ...model, rows }, cursor: { rowIndex: rowIndex - 1, columnIndex } };
  });
}

export async function moveRowDownCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (rowIndex < 0 || rowIndex >= model.rows.length - 1) {return null;}
    const rows = [...model.rows];
    [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
    return { model: { ...model, rows }, cursor: { rowIndex: rowIndex + 1, columnIndex } };
  });
}

export async function moveColumnLeftCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (columnIndex <= 0) {return null;}
    return {
      model: swapColumns(model, columnIndex, columnIndex - 1),
      cursor: { rowIndex, columnIndex: columnIndex - 1 }
    };
  });
}

export async function moveColumnRightCommand(): Promise<void> {
  await transformTable((model, { rowIndex, columnIndex }) => {
    if (columnIndex >= model.headers.length - 1) {return null;}
    return {
      model: swapColumns(model, columnIndex, columnIndex + 1),
      cursor: { rowIndex, columnIndex: columnIndex + 1 }
    };
  });
}

function swapColumns(model: TableModel, a: number, b: number): TableModel {
  const headers = [...model.headers];
  const alignments = [...model.alignments];
  [headers[a], headers[b]] = [headers[b], headers[a]];
  [alignments[a], alignments[b]] = [alignments[b], alignments[a]];
  const rows = model.rows.map((row) => {
    const r = [...row];
    [r[a], r[b]] = [r[b], r[a]];
    return r;
  });
  return { ...model, headers, alignments, rows };
}
