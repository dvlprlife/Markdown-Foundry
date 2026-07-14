import * as assert from 'assert';
import * as vscode from 'vscode';
import { sortByColumnCommand, sortRowLines } from '../../table/commands/sort';
import { computeCellRange } from '../../table/commands/navigate';

const ROWS = ['| Bob | 7 |', '| Alice | 30 |', '| carol | 8 |'];

const UNSORTED = ['| Name | Age |', '| --- | --- |', '| Bob | 7 |', '| Alice | 30 |'];

/**
 * Answer the sort command's direction prompt without a UI. The vscode
 * namespace is not writable through its own types, hence the cast.
 */
function stubQuickPick(value: 'asc' | 'desc'): () => void {
  const win = vscode.window as unknown as { showQuickPick: unknown };
  const original = win.showQuickPick;
  win.showQuickPick = (items: unknown): Thenable<unknown> =>
    Promise.resolve((items as { value: string }[]).find((item) => item.value === value));
  return () => {
    win.showQuickPick = original;
  };
}

async function setAlignOnEdit(value: boolean | undefined): Promise<void> {
  await vscode.workspace
    .getConfiguration('markdownFoundry')
    .update('alignOnEdit', value, vscode.ConfigurationTarget.Global);
}

async function openTable(lines: string[]): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: lines.join('\n')
  });
  const editor = await vscode.window.showTextDocument(doc);
  const range = computeCellRange(doc.lineAt(2).text, 0);
  assert.ok(range);
  const pos = new vscode.Position(2, range.start);
  editor.selection = new vscode.Selection(pos, pos);
  return editor;
}

suite('sort: sortByColumnCommand', () => {
  suiteTeardown(async () => {
    await setAlignOnEdit(undefined);
  });

  test('preserve mode reorders the rows without touching their padding', async () => {
    await setAlignOnEdit(false);
    const restore = stubQuickPick('asc');
    try {
      const editor = await openTable(UNSORTED);
      await sortByColumnCommand();
      assert.strictEqual(
        editor.document.getText(),
        ['| Name | Age |', '| --- | --- |', '| Alice | 30 |', '| Bob | 7 |'].join('\n')
      );
    } finally {
      restore();
    }
  });

  test('descending reverses the rows, still verbatim', async () => {
    await setAlignOnEdit(false);
    const restore = stubQuickPick('desc');
    try {
      const editor = await openTable(UNSORTED);
      await sortByColumnCommand();
      assert.strictEqual(
        editor.document.getText(),
        ['| Name | Age |', '| --- | --- |', '| Bob | 7 |', '| Alice | 30 |'].join('\n')
      );
    } finally {
      restore();
    }
  });

  test('alignOnEdit re-aligns the sorted table', async () => {
    await setAlignOnEdit(true);
    const restore = stubQuickPick('asc');
    try {
      const editor = await openTable(UNSORTED);
      await sortByColumnCommand();
      assert.strictEqual(
        editor.document.getText(),
        ['| Name  | Age |', '| ----- | --- |', '| Alice | 30  |', '| Bob   | 7   |'].join('\n')
      );
    } finally {
      restore();
    }
  });
});

suite('sort: sortRowLines', () => {
  test('reorders body lines verbatim, padding included', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 0, false, 2), [
      '| Alice | 30 |',
      '| Bob | 7 |',
      '| carol | 8 |'
    ]);
  });

  test('descending reverses the order', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 0, true, 2), [
      '| carol | 8 |',
      '| Bob | 7 |',
      '| Alice | 30 |'
    ]);
  });

  test('a numeric column sorts numerically, not lexically', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 1, false, 2), [
      '| Bob | 7 |',
      '| carol | 8 |',
      '| Alice | 30 |'
    ]);
  });

  test('escaped pipes do not shift the compared column', () => {
    const rows = ['| b \\| x | 2 |', '| a \\| y | 1 |'];
    assert.deepStrictEqual(sortRowLines(rows, 1, false, 2), [
      '| a \\| y | 1 |',
      '| b \\| x | 2 |'
    ]);
  });

  test('a ragged row compares as empty and keeps its shape', () => {
    const rows = ['| b | 2 |', '| a |'];
    assert.deepStrictEqual(sortRowLines(rows, 1, false, 2), ['| a |', '| b | 2 |']);
  });

  test('cells past the header column count do not skew the sort', () => {
    const rows = ['| b | 2 | z |', '| a | 1 |'];
    assert.deepStrictEqual(sortRowLines(rows, 2, false, 2), rows);
  });
});
