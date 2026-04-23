import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';
import { Alignment, TableModel } from '../types';

/**
 * Shared helper: load the table at the cursor, run a transform on the model,
 * then write it back. Returns the new cursor position (caller can ignore).
 */
async function transformTable(
  transform: (model: TableModel, coords: { rowIndex: number; columnIndex: number }) => TableModel | null
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

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
  const newModel = transform(model, coords);
  if (!newModel) return;

  const formatted = formatTable(newModel);
  await editor.edit((edit) => {
    edit.replace(location.range, formatted);
  });
}

/** Get the default alignment from user config. */
function defaultAlignment(): Alignment {
  const config = vscode.workspace.getConfiguration('markdownForge');
  return (config.get<Alignment>('defaultAlignment') ?? 'left');
}

export async function insertRowAboveCommand(): Promise<void> {
  await transformTable((model, { rowIndex }) => {
    const newRow = Array(model.headers.length).fill('');
    const insertAt = Math.max(0, rowIndex); // header row treated as index 0
    const rows = [...model.rows];
    rows.splice(insertAt, 0, newRow);
    return { ...model, rows };
  });
}

export async function insertRowBelowCommand(): Promise<void> {
  await transformTable((model, { rowIndex }) => {
    const newRow = Array(model.headers.length).fill('');
    const insertAt = rowIndex < 0 ? 0 : rowIndex + 1;
    const rows = [...model.rows];
    rows.splice(insertAt, 0, newRow);
    return { ...model, rows };
  });
}

export async function insertColumnLeftCommand(): Promise<void> {
  await transformTable((model, { columnIndex }) => {
    return insertColumnAt(model, columnIndex);
  });
}

export async function insertColumnRightCommand(): Promise<void> {
  await transformTable((model, { columnIndex }) => {
    return insertColumnAt(model, columnIndex + 1);
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
  await transformTable((model, { rowIndex }) => {
    if (rowIndex < 0) {
      vscode.window.showInformationMessage('Markdown Foundry: cannot delete the header row.');
      return null;
    }
    if (model.rows.length === 0) return null;
    const rows = [...model.rows];
    rows.splice(rowIndex, 1);
    return { ...model, rows };
  });
}

export async function deleteColumnCommand(): Promise<void> {
  await transformTable((model, { columnIndex }) => {
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
    return { ...model, headers, alignments, rows };
  });
}

export async function moveRowUpCommand(): Promise<void> {
  await transformTable((model, { rowIndex }) => {
    if (rowIndex <= 0) return null;
    const rows = [...model.rows];
    [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
    return { ...model, rows };
  });
}

export async function moveRowDownCommand(): Promise<void> {
  await transformTable((model, { rowIndex }) => {
    if (rowIndex < 0 || rowIndex >= model.rows.length - 1) return null;
    const rows = [...model.rows];
    [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
    return { ...model, rows };
  });
}

export async function moveColumnLeftCommand(): Promise<void> {
  await transformTable((model, { columnIndex }) => {
    if (columnIndex <= 0) return null;
    return swapColumns(model, columnIndex, columnIndex - 1);
  });
}

export async function moveColumnRightCommand(): Promise<void> {
  await transformTable((model, { columnIndex }) => {
    if (columnIndex >= model.headers.length - 1) return null;
    return swapColumns(model, columnIndex, columnIndex + 1);
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
