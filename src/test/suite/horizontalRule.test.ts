import * as assert from 'assert';
import * as vscode from 'vscode';
import { insertHorizontalRuleCommand } from '../../format/commands';

async function invokeOnLine(content: string, line: number): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
  const editor = await vscode.window.showTextDocument(doc);
  const pos = new vscode.Position(line, doc.lineAt(line).text.length);
  editor.selection = new vscode.Selection(pos, pos);
  await insertHorizontalRuleCommand();
  return doc;
}

suite('format: insertHorizontalRuleCommand', () => {
  test('non-empty line gets a blank line before the rule (no setext heading)', async () => {
    const doc = await invokeOnLine('hello\nworld', 0);
    assert.strictEqual(doc.getText(), 'hello\n\n---\nworld');
  });

  test('non-empty last line without trailing newline', async () => {
    const doc = await invokeOnLine('para\nhello', 1);
    assert.strictEqual(doc.getText(), 'para\nhello\n\n---');
  });

  test('empty line directly below text keeps it as the separator and puts the rule below', async () => {
    const doc = await invokeOnLine('hello\n\nmore', 1);
    assert.strictEqual(doc.getText(), 'hello\n\n---\nmore');
  });

  test('empty line with a blank line above takes the rule in place', async () => {
    const doc = await invokeOnLine('text\n\n\nafter', 2);
    assert.strictEqual(doc.getText(), 'text\n\n---\nafter');
  });

  test('empty line at document start takes the rule in place', async () => {
    const doc = await invokeOnLine('\nbody', 0);
    assert.strictEqual(doc.getText(), '---\nbody');
  });

  test('whitespace-only line counts as blank', async () => {
    const doc = await invokeOnLine('hello\n \nmore', 1);
    assert.strictEqual(doc.getText(), 'hello\n \n---\nmore');
  });

  test('CRLF document: non-empty line inserts \\r\\n separators', async () => {
    const doc = await invokeOnLine('hello\r\nworld', 0);
    assert.strictEqual(doc.getText(), 'hello\r\n\r\n---\r\nworld');
  });

  test('CRLF document: empty line below text inserts \\r\\n before the rule', async () => {
    const doc = await invokeOnLine('hello\r\n\r\nmore', 1);
    assert.strictEqual(doc.getText(), 'hello\r\n\r\n---\r\nmore');
  });
});
