import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';

/**
 * Move cursor to the start of the next cell.
 * If already at the last cell of the last row, add a new row and move there.
 */
export async function nextCellCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) return;

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) return;

  const model = parseTable(document, location);
  const columnCount = model.headers.length;

  // Determine destination cell.
  let targetRow = coords.rowIndex;
  let targetCol = coords.columnIndex + 1;

  if (targetCol >= columnCount) {
    targetCol = 0;
    targetRow = targetRow + 1;

    if (targetRow >= model.rows.length) {
      // Append a new empty row.
      const newRow = Array(columnCount).fill('');
      model.rows.push(newRow);
      const formatted = formatTable(model);
      await editor.edit((edit) => edit.replace(location.range, formatted));
      // Recalculate position after the edit.
      await moveCursorToCell(location.headerLine, targetRow, targetCol, model.indent, columnCount);
      return;
    }
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol, model.indent, columnCount);
}

export async function previousCellCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) return;

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) return;

  const model = parseTable(document, location);

  let targetRow = coords.rowIndex;
  let targetCol = coords.columnIndex - 1;

  if (targetCol < 0) {
    targetCol = model.headers.length - 1;
    targetRow = targetRow - 1;
    if (targetRow < -1) return; // at start of table, do nothing
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol, model.indent, model.headers.length);
}

/**
 * Enter inside a table: move to the first cell of the next row.
 * If on the last row, add a new row.
 */
export async function nextRowCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) return;

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) return;

  const model = parseTable(document, location);
  const columnCount = model.headers.length;
  const targetRow = coords.rowIndex + 1;

  if (targetRow >= model.rows.length) {
    const newRow = Array(columnCount).fill('');
    model.rows.push(newRow);
    const formatted = formatTable(model);
    await editor.edit((edit) => edit.replace(location.range, formatted));
  }

  await moveCursorToCell(location.headerLine, targetRow, 0, model.indent, columnCount);
}

/**
 * Move the cursor into the first character of the given cell (after the
 * leading pipe and padding space).
 *
 * This is an approximation: because the table may have been reformatted,
 * we re-read the line and find the Nth pipe, then position one space past it.
 */
async function moveCursorToCell(
  headerLine: number,
  rowIndex: number,
  columnIndex: number,
  _indent: string,
  _columnCount: number
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;

  // rowIndex: -1 = header, 0+ = body (offset by 2 to skip separator)
  const lineNumber =
    rowIndex === -1 ? headerLine : headerLine + 2 + rowIndex;

  if (lineNumber >= document.lineCount) return;
  const lineText = document.lineAt(lineNumber).text;

  let pipesSeen = 0;
  let charPos = 0;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '\\' && lineText[i + 1] === '|') {
      i++;
      continue;
    }
    if (lineText[i] === '|') {
      if (pipesSeen === columnIndex) {
        charPos = i + 2; // skip pipe and one pad space
        break;
      }
      pipesSeen++;
    }
  }

  const newPos = new vscode.Position(lineNumber, Math.min(charPos, lineText.length));
  editor.selection = new vscode.Selection(newPos, newPos);
  editor.revealRange(new vscode.Range(newPos, newPos));
}
