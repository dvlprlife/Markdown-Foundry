import * as vscode from 'vscode';

const URL_RE = /^https?:\/\/\S+$/i;

/**
 * Paste the clipboard contents as a Markdown link.
 *
 * Behavior:
 *   - If clipboard is a URL:
 *       - If there is a selection, wrap it: [selected](url)
 *       - Else prompt for link text (or use the URL as text if prompt is empty)
 *   - If clipboard is not a URL, show info message.
 */
export async function pasteLinkCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const clipboard = (await vscode.env.clipboard.readText()).trim();
  if (!URL_RE.test(clipboard)) {
    vscode.window.showInformationMessage('Markdown Foundry: clipboard does not contain a URL.');
    return;
  }

  const selection = editor.selection;
  let linkText: string;
  if (!selection.isEmpty) {
    linkText = editor.document.getText(selection);
  } else {
    const input = await vscode.window.showInputBox({
      prompt: 'Link text (leave empty to use the URL)',
      placeHolder: clipboard
    });
    if (input === undefined) return; // user cancelled
    linkText = input.length > 0 ? input : clipboard;
  }

  const markdown = `[${linkText}](${clipboard})`;
  await editor.edit((edit) => {
    if (selection.isEmpty) {
      edit.insert(selection.active, markdown);
    } else {
      edit.replace(selection, markdown);
    }
  });
}
