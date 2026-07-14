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
import { cellCount } from '../../table/cells';

const TABLE = [
  '| A | B | C |',
  '| --- | --- | --- |',
  '| a1 | b1 | c1 |',
  '| a2 | b2 | c2 |',
  '| a3 | b3 | c3 |'
].join('\n');

/** Deliberately unpadded — every cell is as narrow as its content. */
const COMPACT = ['| Name | Age |', '| --- | --- |', '| Alice | 30 |', '| Bob | 7 |'];

/** A body row wider than the header, so the cursor can sit past its last column. */
const HEADER_NARROW = ['| A | B |', '| --- | --- |', '| a | b | c | d |'];

/** Valid GFM: rows need no leading or trailing pipes. */
const PIPELESS = ['a | b', '--- | ---', 'a1 | b1'];

async function openTable(content: string = TABLE): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
  return vscode.window.showTextDocument(doc);
}

async function setAlignOnEdit(value: boolean | undefined): Promise<void> {
  await vscode.workspace
    .getConfiguration('markdownFoundry')
    .update('alignOnEdit', value, vscode.ConfigurationTarget.Global);
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

function assertLines(editor: vscode.TextEditor, expected: string[]): void {
  assert.strictEqual(editor.document.getText(), expected.join('\n'));
}

// The cursor-following behavior below is mode-independent, so it runs against
// the aligned default of v0.6.0 (alignOnEdit) as a regression guard.
suite('rowColumn (alignOnEdit): cursor follows the edit', () => {
  suiteSetup(async () => {
    await setAlignOnEdit(true);
  });

  suiteTeardown(async () => {
    await setAlignOnEdit(undefined);
  });

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

// v0.6.0 emitted an aligned table after every edit. These pin that output so
// alignOnEdit stays a faithful opt-in to the old behavior.
suite('rowColumn (alignOnEdit): re-aligns the whole table', () => {
  suiteSetup(async () => {
    await setAlignOnEdit(true);
  });

  suiteTeardown(async () => {
    await setAlignOnEdit(undefined);
  });

  test('insert column right', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await insertColumnRightCommand();
    assertLines(editor, [
      '| Name  |     | Age |',
      '| ----- | :-- | --- |',
      '| Alice |     | 30  |',
      '| Bob   |     | 7   |'
    ]);
  });

  test('insert row below', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await insertRowBelowCommand();
    assertLines(editor, [
      '| Name  | Age |',
      '| ----- | --- |',
      '| Alice | 30  |',
      '|       |     |',
      '| Bob   | 7   |'
    ]);
  });

  test('delete column', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await deleteColumnCommand();
    assertLines(editor, ['| Name  |', '| ----- |', '| Alice |', '| Bob   |']);
  });

  test('move column left', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await moveColumnLeftCommand();
    assertLines(editor, [
      '| Age | Name  |',
      '| --- | ----- |',
      '| 30  | Alice |',
      '| 7   | Bob   |'
    ]);
  });

  test('indented table keeps its indent', async () => {
    const editor = await openTable(['  | A | B |', '  | --- | --- |', '  | a1 | b1 |'].join('\n'));
    placeCursorInCell(editor, 2, 0);
    await insertColumnRightCommand();
    assertLines(editor, [
      '  | A   |     | B   |',
      '  | --- | :-- | --- |',
      '  | a1  |     | b1  |'
    ]);
  });

  // The cursor's column is counted on its own line, so a body row wider than
  // the header reports a column past the header's last. v0.6.0 clamped it via
  // Array.splice; the new column must not run off the end of the table.
  test('insert column right from a cell past the header clamps to the last column', async () => {
    const editor = await openTable(HEADER_NARROW.join('\n'));
    placeCursorInCell(editor, 2, 3); // the body row's 4th cell — the header has 2
    await insertColumnRightCommand();
    assertLines(editor, ['| A   | B   |     |', '| --- | --- | :-- |', '| a   | b   |     |']);
  });

  test('insert column left from a cell past the header clamps to the last column', async () => {
    const editor = await openTable(HEADER_NARROW.join('\n'));
    placeCursorInCell(editor, 2, 2); // the body row's 3rd cell — the header has 2
    await insertColumnLeftCommand();
    assertLines(editor, ['| A   | B   |     |', '| --- | --- | :-- |', '| a   | b   |     |']);
  });

  test('delete column from a cell past the header deletes nothing', async () => {
    const editor = await openTable(HEADER_NARROW.join('\n'));
    placeCursorInCell(editor, 2, 3);
    await deleteColumnCommand();
    assertLines(editor, ['| A   | B   |', '| --- | --- |', '| a   | b   |']);
  });

  test('move column from a cell past the header is a no-op', async () => {
    const editor = await openTable(HEADER_NARROW.join('\n'));
    placeCursorInCell(editor, 2, 3);
    await moveColumnLeftCommand();
    assertLines(editor, HEADER_NARROW);
  });
});

suite('rowColumn (preserve): edits leave untouched cells byte-for-byte', () => {
  suiteSetup(async () => {
    await setAlignOnEdit(false);
  });

  suiteTeardown(async () => {
    await setAlignOnEdit(undefined);
  });

  test('insert column right adds an empty cell and a defaultAlignment marker', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await insertColumnRightCommand();
    assertLines(editor, [
      '| Name |  | Age |',
      '| --- | :--- | --- |',
      '| Alice |  | 30 |',
      '| Bob |  | 7 |'
    ]);
    assertCaretInCell(editor, 2, 1);
  });

  test('insert column left adds the cell before the cursor column', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await insertColumnLeftCommand();
    assertLines(editor, [
      '| Name |  | Age |',
      '| --- | :--- | --- |',
      '| Alice |  | 30 |',
      '| Bob |  | 7 |'
    ]);
    assertCaretInCell(editor, 2, 1);
  });

  test('insert row below mirrors the neighboring row cell widths', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await insertRowBelowCommand();
    assertLines(editor, [
      '| Name | Age |',
      '| --- | --- |',
      '| Alice | 30 |',
      '|       |    |',
      '| Bob | 7 |'
    ]);
    assertCaretInCell(editor, 3, 1);
  });

  test('insert row above mirrors the neighboring row cell widths', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 3, 0);
    await insertRowAboveCommand();
    assertLines(editor, [
      '| Name | Age |',
      '| --- | --- |',
      '| Alice | 30 |',
      '|     |   |',
      '| Bob | 7 |'
    ]);
    assertCaretInCell(editor, 3, 0);
  });

  test('delete column removes only that column', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await deleteColumnCommand();
    assertLines(editor, ['| Name |', '| --- |', '| Alice |', '| Bob |']);
    assertCaretInCell(editor, 2, 0);
  });

  test('delete row removes only that line', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await deleteRowCommand();
    assertLines(editor, ['| Name | Age |', '| --- | --- |', '| Bob | 7 |']);
    assertCaretInCell(editor, 2, 0);
  });

  test('move column carries the cell text, not the column padding', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 1);
    await moveColumnLeftCommand();
    assertLines(editor, [
      '| Age | Name |',
      '| --- | --- |',
      '| 30 | Alice |',
      '| 7 | Bob |'
    ]);
    assertCaretInCell(editor, 2, 0);
  });

  test('move row swaps whole lines verbatim', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await moveRowDownCommand();
    assertLines(editor, [
      '| Name | Age |',
      '| --- | --- |',
      '| Bob | 7 |',
      '| Alice | 30 |'
    ]);
    assertCaretInCell(editor, 3, 0);
  });

  test('an already-aligned table stays aligned', async () => {
    const aligned = [
      '| A     | B   |',
      '| :---- | --: |',
      '| a1    |  b1 |',
      '| a2    |  b2 |'
    ];
    const editor = await openTable(aligned.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await moveRowDownCommand();
    assertLines(editor, [
      '| A     | B   |',
      '| :---- | --: |',
      '| a2    |  b2 |',
      '| a1    |  b1 |'
    ]);
  });

  test('escaped pipes are never treated as cell separators', async () => {
    const editor = await openTable(
      ['| A | B |', '| --- | --- |', '| a \\| x | b1 |'].join('\n')
    );
    placeCursorInCell(editor, 2, 0);
    await insertColumnRightCommand();
    assertLines(editor, [
      '| A |  | B |',
      '| --- | :--- | --- |',
      '| a \\| x |  | b1 |'
    ]);
  });

  test('a table indented inside a list item keeps its indent', async () => {
    const editor = await openTable(
      ['- item', '  | A | B |', '  | --- | --- |', '  | a1 | b1 |'].join('\n')
    );
    placeCursorInCell(editor, 3, 0);
    await insertColumnRightCommand();
    assertLines(editor, [
      '- item',
      '  | A |  | B |',
      '  | --- | :--- | --- |',
      '  | a1 |  | b1 |'
    ]);
  });

  test('a ragged row is padded out, not corrupted', async () => {
    const editor = await openTable(
      ['| A | B | C |', '| --- | --- | --- |', '| a1 |', '| a2 | b2 | c2 |'].join('\n')
    );
    placeCursorInCell(editor, 3, 2);
    await insertColumnRightCommand();
    assertLines(editor, [
      '| A | B | C |  |',
      '| --- | --- | --- | :--- |',
      '| a1 |  |  |  |',
      '| a2 | b2 | c2 |  |'
    ]);
  });

  test('a row inserted into a pipeless table stays addressable', async () => {
    const editor = await openTable(PIPELESS.join('\n'));
    placeCursorInCell(editor, 2, 0);
    await insertRowBelowCommand();
    assertLines(editor, [...PIPELESS, '|   |   |']);

    const inserted = editor.document.lineAt(3).text;
    assert.strictEqual(cellCount(inserted), cellCount(PIPELESS[2]), 'cell count preserved');
    assert.ok(computeCellRange(inserted, 0), 'column 0 is navigable');
    assert.ok(computeCellRange(inserted, 1), 'column 1 is navigable');
    assertCaretInCell(editor, 3, 0);
  });

  test('inserting a column past the header does not destroy the extra cells', async () => {
    const editor = await openTable(HEADER_NARROW.join('\n'));
    placeCursorInCell(editor, 2, 3);
    await insertColumnRightCommand();
    assertLines(editor, ['| A | B |  |', '| --- | --- | :--- |', '| a | b |  | c | d |']);
  });

  test('a CRLF document keeps its line endings', async () => {
    const editor = await openTable(COMPACT.join('\n'));
    await editor.edit((edit) => edit.setEndOfLine(vscode.EndOfLine.CRLF));
    placeCursorInCell(editor, 2, 0);
    await insertRowBelowCommand();
    assert.strictEqual(
      editor.document.getText(),
      [
        '| Name | Age |',
        '| --- | --- |',
        '| Alice | 30 |',
        '|       |    |',
        '| Bob | 7 |'
      ].join('\r\n')
    );
  });
});
