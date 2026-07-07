import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  toggleBlockquoteCommand,
  toggleBlockCodeCommand
} from '../../format/commands';

async function openAndSelectAll(content: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content
  });
  const editor = await vscode.window.showTextDocument(doc);
  const lastLine = doc.lineCount - 1;
  editor.selection = new vscode.Selection(
    new vscode.Position(0, 0),
    new vscode.Position(lastLine, doc.lineAt(lastLine).text.length)
  );
  return editor;
}

function assertNoBareLf(text: string): void {
  assert.ok(
    !/(^|[^\r])\n/.test(text),
    `expected no bare \\n in ${JSON.stringify(text)}`
  );
}

suite('format commands: EOL preservation', () => {
  test('blockquote toggle preserves CRLF in a CRLF document', async () => {
    const editor = await openAndSelectAll('alpha\r\nbeta');
    assert.strictEqual(editor.document.eol, vscode.EndOfLine.CRLF);

    await toggleBlockquoteCommand();

    const text = editor.document.getText();
    assert.strictEqual(text, '> alpha\r\n> beta');
    assertNoBareLf(text);
  });

  test('block code toggle preserves CRLF in a CRLF document', async () => {
    const editor = await openAndSelectAll('alpha\r\nbeta');
    assert.strictEqual(editor.document.eol, vscode.EndOfLine.CRLF);

    await toggleBlockCodeCommand();

    const text = editor.document.getText();
    assert.strictEqual(text, '```\r\nalpha\r\nbeta\r\n```');
    assertNoBareLf(text);
  });

  test('blockquote toggle leaves an LF document LF', async () => {
    const editor = await openAndSelectAll('alpha\nbeta');
    assert.strictEqual(editor.document.eol, vscode.EndOfLine.LF);

    await toggleBlockquoteCommand();

    const text = editor.document.getText();
    assert.strictEqual(text, '> alpha\n> beta');
    assert.ok(!text.includes('\r'), 'LF document must not gain \\r');
  });

  test('block code toggle leaves an LF document LF', async () => {
    const editor = await openAndSelectAll('alpha\nbeta');

    await toggleBlockCodeCommand();

    const text = editor.document.getText();
    assert.strictEqual(text, '```\nalpha\nbeta\n```');
    assert.ok(!text.includes('\r'), 'LF document must not gain \\r');
  });
});
