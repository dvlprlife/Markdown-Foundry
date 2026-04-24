import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';

/**
 * Move cursor to the next cell.
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

  let targetRow = coords.rowIndex;
  let targetCol = coords.columnIndex + 1;

  if (targetCol >= columnCount) {
    targetCol = 0;
    targetRow = targetRow + 1;

    if (targetRow >= model.rows.length) {
      const newRow = Array(columnCount).fill('');
      model.rows.push(newRow);
      const formatted = formatTable(model);
      await editor.edit((edit) => edit.replace(location.range, formatted));
      await moveCursorToCell(location.headerLine, targetRow, targetCol);
      return;
    }
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol);
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
    if (targetRow < -1) return;
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol);
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

  await moveCursorToCell(location.headerLine, targetRow, 0);
}

/**
 * Select the target cell's contents in the active editor. If the cell is
 * empty or whitespace-only, collapses to a zero-width cursor at the cell's
 * start (selection anchor === active).
 */
async function moveCursorToCell(
  headerLine: number,
  rowIndex: number,
  columnIndex: number
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;

  // rowIndex: -1 = header, 0+ = body (offset by 2 to skip separator)
  const lineNumber =
    rowIndex === -1 ? headerLine : headerLine + 2 + rowIndex;

  if (lineNumber >= document.lineCount) return;
  const lineText = document.lineAt(lineNumber).text;

  const range = computeCellRange(lineText, columnIndex);
  if (!range) return;

  const anchor = new vscode.Position(lineNumber, range.start);
  const active = new vscode.Position(lineNumber, range.end);
  editor.selection = new vscode.Selection(anchor, active);
  editor.revealRange(new vscode.Range(anchor, active));
}

/**
 * Given a table-row line and a 0-based column index, return the start/end
 * character offsets that cover the cell's non-whitespace content. Collapses
 * (start === end) for empty or whitespace-only cells. Returns undefined if
 * columnIndex exceeds the line's column count. Handles escaped pipes (\|)
 * as cell content, not as column separators.
 */
export function computeCellRange(
  lineText: string,
  columnIndex: number
): { start: number; end: number } | undefined {
  let startPos = -1;
  let endPos = -1;
  let pipesSeen = 0;

  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '\\' && lineText[i + 1] === '|') {
      i++;
      continue;
    }
    if (lineText[i] === '|') {
      if (pipesSeen === columnIndex) {
        startPos = i + 1;
      } else if (pipesSeen === columnIndex + 1) {
        endPos = i;
        break;
      }
      pipesSeen++;
    }
  }

  if (startPos === -1) return undefined;
  if (endPos === -1) endPos = lineText.length;

  // Skip the single pad space that formatTable inserts after the opening pipe.
  if (lineText[startPos] === ' ') startPos++;

  let trimmedEnd = endPos;
  while (trimmedEnd > startPos && /\s/.test(lineText[trimmedEnd - 1])) {
    trimmedEnd--;
  }

  return { start: startPos, end: trimmedEnd };
}
