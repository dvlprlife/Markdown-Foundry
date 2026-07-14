import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords, TableLocation } from '../locator';
import { blankRowLike, cellCount, padCells } from '../cells';
import { documentEol, readTableLines, renderTableLines } from './tableEdit';

/**
 * Move cursor to the next cell.
 * If already at the last cell of the last row, add a new row and move there.
 */
export async function nextCellCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {return;}

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) {return;}

  const lines = readTableLines(document, location);
  const columnCount = cellCount(lines[0]);

  let targetRow = coords.rowIndex;
  let targetCol = coords.columnIndex + 1;

  if (targetCol >= columnCount) {
    targetCol = 0;
    targetRow = targetRow + 1;

    if (targetRow >= bodyRowCount(lines)) {
      await appendBlankRow(editor, location, lines);
      await moveCursorToCell(location.headerLine, targetRow, targetCol);
      return;
    }
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol);
}

function bodyRowCount(lines: string[]): number {
  return lines.length - 2;
}

/**
 * Append a row shaped like the table's last line — but never narrower than
 * the header — so its pipes line up with the table as it already is when
 * `alignOnEdit` is off, and every column can still be tabbed into.
 */
async function appendBlankRow(
  editor: vscode.TextEditor,
  location: TableLocation,
  lines: string[]
): Promise<void> {
  const reference = padCells(lines[lines.length - 1], cellCount(lines[0]), '  ');
  const next = [...lines, blankRowLike(reference)];
  const text = renderTableLines(next, location, documentEol(editor.document));
  await editor.edit((edit) => edit.replace(location.range, text));
}

export async function previousCellCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {return;}

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) {return;}

  const lines = readTableLines(document, location);

  let targetRow = coords.rowIndex;
  let targetCol = coords.columnIndex - 1;

  if (targetCol < 0) {
    targetCol = cellCount(lines[0]) - 1;
    targetRow = targetRow - 1;
    if (targetRow < -1) {return;}
  }

  await moveCursorToCell(location.headerLine, targetRow, targetCol);
}

/**
 * Enter inside a table: move to the first cell of the next row.
 * If on the last row, add a new row.
 */
export async function nextRowCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {return;}

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) {return;}

  const lines = readTableLines(document, location);
  const targetRow = coords.rowIndex + 1;

  if (targetRow >= bodyRowCount(lines)) {
    await appendBlankRow(editor, location, lines);
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
  if (!editor) {return;}
  const document = editor.document;

  // rowIndex: -1 = header, 0+ = body (offset by 2 to skip separator)
  const lineNumber =
    rowIndex === -1 ? headerLine : headerLine + 2 + rowIndex;

  if (lineNumber >= document.lineCount) {return;}
  const lineText = document.lineAt(lineNumber).text;

  const range = computeCellRange(lineText, columnIndex);
  if (!range) {return;}

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
 * as cell content, not as column separators, and rows without leading or
 * trailing pipes (`a | b`).
 */
export function computeCellRange(
  lineText: string,
  columnIndex: number
): { start: number; end: number } | undefined {
  let i = 0;
  // Mirrors characterOffsetToColumnIndex in locator.ts: skip leading indent,
  // then consume a leading | only if present — on pipeless rows the first
  // pipe is a cell separator, so column 0 starts at the first content.
  while (i < lineText.length && /\s/.test(lineText[i])) {i++;}
  if (i < lineText.length && lineText[i] === '|') {i++;}

  let startPos = columnIndex === 0 ? i : -1;
  let endPos = -1;
  let pipesSeen = 0;

  for (; i < lineText.length; i++) {
    if (lineText[i] === '\\' && lineText[i + 1] === '|') {
      i++;
      continue;
    }
    if (lineText[i] === '|') {
      pipesSeen++;
      if (pipesSeen === columnIndex) {
        startPos = i + 1;
      } else if (pipesSeen === columnIndex + 1) {
        endPos = i;
        break;
      }
    }
  }

  if (startPos === -1) {return undefined;}
  if (endPos === -1) {endPos = lineText.length;}

  // Skip all leading whitespace so right/center-aligned cells select their
  // content only, not the alignment padding formatTable inserts.
  let contentStart = startPos;
  while (contentStart < endPos && /\s/.test(lineText[contentStart])) {
    contentStart++;
  }

  // Whitespace-only cell: collapse to a cursor one space after the opening
  // pipe (the position formatTable pads to), matching prior behavior.
  if (contentStart === endPos) {
    const caret = lineText[startPos] === ' ' ? startPos + 1 : startPos;
    return { start: caret, end: caret };
  }

  let trimmedEnd = endPos;
  while (trimmedEnd > contentStart && /\s/.test(lineText[trimmedEnd - 1])) {
    trimmedEnd--;
  }

  return { start: contentStart, end: trimmedEnd };
}
