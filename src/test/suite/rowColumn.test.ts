import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  insertRowAboveCommand,
  insertRowBelowCommand,
  insertColumnLeftCommand,
  insertColumnRightCommand,
  deleteRowCommand,
  deleteColumnCommand,
  moveRowUpCommand,
  moveRowDownCommand,
  moveColumnLeftCommand,
  moveColumnRightCommand
} from '../../table/commands/rowColumn';
import { computeCellRange } from '../../table/commands/navigate';

const TABLE = [
  '| A | B | C |',
  '| --- | --- | --- |',
  '| a1 | b1 | c1 |',
  '| a2 | b2 | c2 |',
  '| a3 | b3 | c3 |'
].join('\n');

async function openTable(content: string = TABLE): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
  return vscode.window.showTextDocument(doc);
}

function placeCursorInCell(editor: vscode.TextEditor, line: number, columnIndex: number): void {
  const range = computeCellRange(editor.document.lineAt(line).text, columnIndex);
  assert.ok(range, `no cell ${columnIndex} on line ${line}`);
  const pos = new vscode.Position(line, range.start);
  editor.selection = new vscode.Selection(pos, pos);
}

function cellAt(document: vscode.TextDocument, line: number, columnIndex: number): string {
  const lineText = document.lineAt(line).text;
  const range = computeCellRange(lineText, columnIndex);
  assert.ok(range, `no cell ${columnIndex} on line ${line}`);
  return lineText.slice(range.start, range.end);
}

function assertCaretInCell(editor: vscode.TextEditor, line: number, columnIndex: number): void {
  assert.ok(editor.selection.isEmpty, 'caret should be collapsed (no selection)');
  const range = computeCellRange(editor.document.lineAt(line).text, columnIndex);
  assert.ok(range, `no cell ${columnIndex} on line ${line}`);
  assert.strictEqual(editor.selection.active.line, line, 'caret line');
  assert.strictEqual(editor.selection.active.character, range.start, 'caret at cell content start');
}

suite('rowColumn: move commands keep the cursor on the moved content', () => {
  test('move row up follows the moved row, same column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 1); // a2 row, column B
    await moveRowUpCommand();
    assert.strictEqual(cellAt(editor.document, 2, 0), 'a2');
    assert.strictEqual(cellAt(editor.document, 3, 0), 'a1');
    assertCaretInCell(editor, 2, 1);
  });

  test('move row up twice moves the same row two positions', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 4, 2); // a3 row, column C
    await moveRowUpCommand();
    await moveRowUpCommand();
    assert.strictEqual(cellAt(editor.document, 2, 0), 'a3');
    assert.strictEqual(cellAt(editor.document, 3, 0), 'a1');
    assert.strictEqual(cellAt(editor.document, 4, 0), 'a2');
    assertCaretInCell(editor, 2, 2);
  });

  test('move row down twice moves the same row two positions', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 2, 0); // a1 row
    await moveRowDownCommand();
    await moveRowDownCommand();
    assert.strictEqual(cellAt(editor.document, 2, 0), 'a2');
    assert.strictEqual(cellAt(editor.document, 3, 0), 'a3');
    assert.strictEqual(cellAt(editor.document, 4, 0), 'a1');
    assertCaretInCell(editor, 4, 0);
  });

  test('move column left twice moves the same column two positions', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 2); // a2 row, column C
    await moveColumnLeftCommand();
    await moveColumnLeftCommand();
    assert.strictEqual(cellAt(editor.document, 0, 0), 'C');
    assert.strictEqual(cellAt(editor.document, 3, 0), 'c2');
    assertCaretInCell(editor, 3, 0);
  });

  test('move column right twice moves the same column two positions', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 2, 0); // a1 row, column A
    await moveColumnRightCommand();
    await moveColumnRightCommand();
    assert.strictEqual(cellAt(editor.document, 0, 2), 'A');
    assert.strictEqual(cellAt(editor.document, 2, 2), 'a1');
    assertCaretInCell(editor, 2, 2);
  });

  test('move column from the header row follows the moved column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 0, 1); // header, column B
    await moveColumnRightCommand();
    assert.strictEqual(cellAt(editor.document, 0, 2), 'B');
    assert.strictEqual(cellAt(editor.document, 0, 1), 'C');
    assertCaretInCell(editor, 0, 2);
  });
});

suite('rowColumn: insert commands place the cursor in the new row/column', () => {
  test('insert row above puts the caret in the inserted row, same column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 1); // a2 row, column B
    await insertRowAboveCommand();
    assert.strictEqual(cellAt(editor.document, 3, 0), '');
    assert.strictEqual(cellAt(editor.document, 4, 0), 'a2');
    assertCaretInCell(editor, 3, 1);
  });

  test('insert row below puts the caret in the inserted row, same column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 2); // a2 row, column C
    await insertRowBelowCommand();
    assert.strictEqual(cellAt(editor.document, 4, 0), '');
    assert.strictEqual(cellAt(editor.document, 5, 0), 'a3');
    assertCaretInCell(editor, 4, 2);
  });

  test('insert column left puts the caret in the new column, same row', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 1); // a2 row, column B
    await insertColumnLeftCommand();
    assert.strictEqual(cellAt(editor.document, 3, 1), '');
    assert.strictEqual(cellAt(editor.document, 3, 2), 'b2');
    assertCaretInCell(editor, 3, 1);
  });

  test('insert column right puts the caret in the new column, same row', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 2, 1); // a1 row, column B
    await insertColumnRightCommand();
    assert.strictEqual(cellAt(editor.document, 2, 2), '');
    assert.strictEqual(cellAt(editor.document, 2, 1), 'b1');
    assertCaretInCell(editor, 2, 2);
  });
});

suite('rowColumn: delete commands clamp the cursor to what remains', () => {
  test('delete middle row keeps the caret at the same row index, same column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 1); // a2 row, column B
    await deleteRowCommand();
    assert.strictEqual(cellAt(editor.document, 2, 0), 'a1');
    assert.strictEqual(cellAt(editor.document, 3, 0), 'a3');
    assertCaretInCell(editor, 3, 1);
  });

  test('delete last row clamps the caret to the new last row', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 4, 0); // a3 row
    await deleteRowCommand();
    assert.strictEqual(editor.document.lineCount, 4);
    assert.strictEqual(cellAt(editor.document, 3, 0), 'a2');
    assertCaretInCell(editor, 3, 0);
  });

  test('delete the only body row moves the caret to the header row', async () => {
    const editor = await openTable(['| A | B |', '| --- | --- |', '| a1 | b1 |'].join('\n'));
    placeCursorInCell(editor, 2, 1);
    await deleteRowCommand();
    assert.strictEqual(editor.document.lineCount, 2);
    assertCaretInCell(editor, 0, 1);
  });

  test('delete last column clamps the caret to the new last column', async () => {
    const editor = await openTable();
    placeCursorInCell(editor, 3, 2); // a2 row, column C
    await deleteColumnCommand();
    assert.strictEqual(cellAt(editor.document, 0, 1), 'B');
    assert.strictEqual(cellAt(editor.document, 3, 1), 'b2');
    assertCaretInCell(editor, 3, 1);
  });
});
