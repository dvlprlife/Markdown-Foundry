import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  computeCellRange,
  nextCellCommand,
  nextRowCommand
} from '../../table/commands/navigate';
import { cellCount } from '../../table/cells';

const COMPACT = ['| Name | Age |', '| --- | --- |', '| Alice | 30 |', '| Bob | 7 |'];

/** Valid GFM: rows need no leading or trailing pipes. */
const PIPELESS = ['a | b', '--- | ---', 'a1 | b1'];

async function openTable(lines: string[]): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: lines.join('\n')
  });
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

suite('navigate: the row added past the last cell', () => {
  suiteTeardown(async () => {
    await setAlignOnEdit(undefined);
  });

  test('Tab off the last cell adds a row shaped like its neighbor', async () => {
    await setAlignOnEdit(false);
    const editor = await openTable(COMPACT);
    placeCursorInCell(editor, 3, 1);
    await nextCellCommand();
    assert.strictEqual(
      editor.document.getText(),
      [...COMPACT, '|     |   |'].join('\n')
    );
    assert.strictEqual(editor.selection.active.line, 4);
  });

  test('Enter on the last row adds a row shaped like its neighbor', async () => {
    await setAlignOnEdit(false);
    const editor = await openTable(COMPACT);
    placeCursorInCell(editor, 3, 0);
    await nextRowCommand();
    assert.strictEqual(
      editor.document.getText(),
      [...COMPACT, '|     |   |'].join('\n')
    );
    assert.strictEqual(editor.selection.active.line, 4);
  });

  test('Tab off a pipeless table adds a row whose cells are still addressable', async () => {
    await setAlignOnEdit(false);
    const editor = await openTable(PIPELESS);
    placeCursorInCell(editor, 2, 1);
    await nextCellCommand();
    assert.strictEqual(editor.document.getText(), [...PIPELESS, '|   |   |'].join('\n'));

    const added = editor.document.lineAt(3).text;
    assert.strictEqual(cellCount(added), cellCount(PIPELESS[2]), 'cell count preserved');
    assert.ok(computeCellRange(added, 0), 'column 0 is navigable');
    assert.ok(computeCellRange(added, 1), 'column 1 is navigable');
    assert.strictEqual(editor.selection.active.line, 3);
  });

  test('Enter on the last row of a pipeless table adds an addressable row', async () => {
    await setAlignOnEdit(false);
    const editor = await openTable(PIPELESS);
    placeCursorInCell(editor, 2, 0);
    await nextRowCommand();
    assert.strictEqual(editor.document.getText(), [...PIPELESS, '|   |   |'].join('\n'));

    const added = editor.document.lineAt(3).text;
    assert.strictEqual(cellCount(added), 2);
    assert.ok(computeCellRange(added, 1), 'column 1 is navigable');
    assert.strictEqual(editor.selection.active.line, 3);
  });

  test('Enter on a ragged last row adds a row as wide as the header', async () => {
    await setAlignOnEdit(false);
    const ragged = ['| A | B |', '| --- | --- |', '| a1 |'];
    const editor = await openTable(ragged);
    placeCursorInCell(editor, 2, 0);
    await nextRowCommand();
    assert.strictEqual(editor.document.getText(), [...ragged, '|    |  |'].join('\n'));

    const added = editor.document.lineAt(3).text;
    assert.strictEqual(cellCount(added), 2, 'inherits the header width, not the ragged neighbor');
    assert.ok(computeCellRange(added, 1), 'column 1 is navigable');
  });

  test('alignOnEdit re-aligns the table around the added row', async () => {
    await setAlignOnEdit(true);
    const editor = await openTable(COMPACT);
    placeCursorInCell(editor, 3, 1);
    await nextCellCommand();
    assert.strictEqual(
      editor.document.getText(),
      [
        '| Name  | Age |',
        '| ----- | --- |',
        '| Alice | 30  |',
        '| Bob   | 7   |',
        '|       |     |'
      ].join('\n')
    );
  });
});

suite('navigate: computeCellRange', () => {
  test('returns trimmed bounds of a non-empty cell', () => {
    const line = '| hello   | world |';
    const result = computeCellRange(line, 0);
    // "hello" sits at chars 2-7 (inclusive start, exclusive end)
    assert.deepStrictEqual(result, { start: 2, end: 7 });
  });

  test('returns a zero-width range for an empty cell', () => {
    const line = '|   | value |';
    const result = computeCellRange(line, 0);
    assert.ok(result);
    assert.strictEqual(result.start, result.end, 'start and end should collapse for empty cell');
  });

  test('handles escaped pipes inside a cell as content, not separators', () => {
    const line = '| a \\| b | value |';
    const result = computeCellRange(line, 0);
    // Content is "a \| b" — escape doesn't terminate the cell.
    assert.deepStrictEqual(result, { start: 2, end: 8 });
  });

  test('handles ragged last cell with no trailing pipe', () => {
    const line = '| a | trailing';
    const result = computeCellRange(line, 1);
    assert.ok(result);
    assert.strictEqual(result.start, 6);
    assert.strictEqual(result.end, 14);
  });

  test('returns undefined when columnIndex exceeds the line columns', () => {
    const line = '| a | b |';
    const result = computeCellRange(line, 5);
    assert.strictEqual(result, undefined);
  });

  test('excludes leading padding in a right-aligned cell', () => {
    const line = '|   42 | x |';
    const result = computeCellRange(line, 0);
    // "42" sits at chars 4-6; the leading pad spaces are not selected.
    assert.deepStrictEqual(result, { start: 4, end: 6 });
  });

  test('excludes surrounding padding in a center-aligned cell', () => {
    const line = '|  mid  | x |';
    const result = computeCellRange(line, 0);
    // "mid" sits at chars 3-6, padding on both sides excluded.
    assert.deepStrictEqual(result, { start: 3, end: 6 });
  });

  test('escaped-pipe cell with leading padding still selects content only', () => {
    const line = '|   a \\| b | x |';
    const result = computeCellRange(line, 0);
    // Content "a \| b" starts after the padding; escape stays inside the cell.
    assert.deepStrictEqual(result, { start: 4, end: 10 });
  });

  test('pipeless row: column 0 starts at the line start', () => {
    const line = 'a | b';
    const result = computeCellRange(line, 0);
    assert.deepStrictEqual(result, { start: 0, end: 1 });
  });

  test('pipeless row: the first pipe is a separator, not an opening delimiter', () => {
    const line = 'a | b';
    const result = computeCellRange(line, 1);
    assert.deepStrictEqual(result, { start: 4, end: 5 });
  });

  test('pipeless row: columnIndex past the last cell returns undefined', () => {
    const line = 'a | b';
    assert.strictEqual(computeCellRange(line, 2), undefined);
  });

  test('indented pipeless row: column 0 starts after the indent', () => {
    const line = '  a | b';
    const result = computeCellRange(line, 0);
    assert.deepStrictEqual(result, { start: 2, end: 3 });
  });

  test('pipeless row with an escaped pipe keeps it inside the cell', () => {
    const line = 'a \\| b | c';
    assert.deepStrictEqual(computeCellRange(line, 0), { start: 0, end: 6 });
    assert.deepStrictEqual(computeCellRange(line, 1), { start: 9, end: 10 });
  });

  test('row with only a trailing pipe is a single cell', () => {
    const line = 'a b |';
    const result = computeCellRange(line, 0);
    assert.deepStrictEqual(result, { start: 0, end: 3 });
  });
});
