import * as assert from 'assert';
import * as vscode from 'vscode';
import { alignTableCommand, alignAllTablesInDocument } from '../../table/commands/align';

/** A body row wider than the header: `c` and `d` sit past the last column. */
const HEADER_NARROW = ['| A | B |', '| --- | --- |', '| a | b | c | d |'];

async function openTable(lines: string[]): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: lines.join('\n')
  });
  return vscode.window.showTextDocument(doc);
}

function putCursor(editor: vscode.TextEditor, line: number): void {
  const pos = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(pos, pos);
}

async function applyEdits(editor: vscode.TextEditor, edits: vscode.TextEdit[]): Promise<void> {
  await editor.edit((builder) => {
    for (const edit of edits) {
      builder.replace(edit.range, edit.newText);
    }
  });
}

suite('align: Align Table keeps cells past the header', () => {
  test('widens the table instead of dropping the over-wide cells', async () => {
    const editor = await openTable(HEADER_NARROW);
    putCursor(editor, 2);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      ['| A   | B   |     |     |', '| --- | --- | --- | --- |', '| a   | b   | c   | d   |'].join(
        '\n'
      )
    );
  });

  test('recovered columns are unaligned; the authored markers survive', async () => {
    const editor = await openTable(['| A | B |', '| :--- | ---: |', '| a | b | c |']);
    putCursor(editor, 0);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      ['| A   |   B |     |', '| :-- | --: | --- |', '| a   |   b | c   |'].join('\n')
    );
  });

  test('pads a short row while widening for an over-wide one', async () => {
    const editor = await openTable([
      '| A | B | C |',
      '| --- | --- | --- |',
      '| a1 |',
      '| a2 | b2 | c2 | d2 |'
    ]);
    putCursor(editor, 2);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      [
        '| A   | B   | C   |     |',
        '| --- | --- | --- | --- |',
        '| a1  |     |     |     |',
        '| a2  | b2  | c2  | d2  |'
      ].join('\n')
    );
  });

  test('a pipeless over-wide row keeps its cells', async () => {
    const editor = await openTable(['a | b', '--- | ---', 'a1 | b1 | c1']);
    putCursor(editor, 2);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      ['| a   | b   |     |', '| --- | --- | --- |', '| a1  | b1  | c1  |'].join('\n')
    );
  });

  test('an escaped pipe in a recovered cell stays escaped', async () => {
    const editor = await openTable(['| A | B |', '| --- | --- |', '| a | b | c \\| d |']);
    putCursor(editor, 2);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      ['| A   | B   |        |', '| --- | --- | ------ |', '| a   | b   | c \\| d |'].join('\n')
    );
  });

  test('an indented over-wide table keeps its indent', async () => {
    const editor = await openTable(['- item', '  | A | B |', '  | --- | --- |', '  | a | b | c |']);
    putCursor(editor, 3);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      [
        '- item',
        '  | A   | B   |     |',
        '  | --- | --- | --- |',
        '  | a   | b   | c   |'
      ].join('\n')
    );
  });

  test('a CRLF document keeps its line endings and its cells', async () => {
    const editor = await openTable(HEADER_NARROW);
    await editor.edit((edit) => edit.setEndOfLine(vscode.EndOfLine.CRLF));
    putCursor(editor, 2);
    await alignTableCommand();
    assert.strictEqual(
      editor.document.getText(),
      ['| A   | B   |     |     |', '| --- | --- | --- | --- |', '| a   | b   | c   | d   |'].join(
        '\r\n'
      )
    );
  });

  test('aligning twice is a no-op', async () => {
    const editor = await openTable(HEADER_NARROW);
    putCursor(editor, 2);
    await alignTableCommand();
    const once = editor.document.getText();
    await alignTableCommand();
    assert.strictEqual(editor.document.getText(), once);
  });
});

// alignOnSave runs this over the whole document from onWillSaveTextDocument.
suite('align: alignAllTablesInDocument keeps cells past the header', () => {
  test('every table is widened, none is truncated', async () => {
    const editor = await openTable([
      '# Doc',
      '',
      ...HEADER_NARROW,
      '',
      'text',
      '',
      '| X | Y |',
      '| --- | --- |',
      '| x1 | y1 | z1 |'
    ]);
    await applyEdits(editor, alignAllTablesInDocument(editor.document));
    assert.strictEqual(
      editor.document.getText(),
      [
        '# Doc',
        '',
        '| A   | B   |     |     |',
        '| --- | --- | --- | --- |',
        '| a   | b   | c   | d   |',
        '',
        'text',
        '',
        '| X   | Y   |     |',
        '| --- | --- | --- |',
        '| x1  | y1  | z1  |'
      ].join('\n')
    );
  });
});
