import * as vscode from 'vscode';
import { locateTable } from '../table/locator';

const CONTEXT_KEY = 'markdownFoundry.inTable';

/**
 * Watch selection changes and keep the `markdownFoundry.inTable` context key
 * in sync. Used by the Tab/Shift-Tab/Enter keybindings so they only override
 * default behavior when the cursor is actually inside a table.
 */
export function registerInTableContext(context: vscode.ExtensionContext): void {
  let currentState = false;

  const update = (editor: vscode.TextEditor | undefined) => {
    const inTable = isInTable(editor);
    if (inTable !== currentState) {
      currentState = inTable;
      vscode.commands.executeCommand('setContext', CONTEXT_KEY, inTable);
    }
  };

  update(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => update(e.textEditor)),
    vscode.window.onDidChangeActiveTextEditor((editor) => update(editor)),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        update(editor);
      }
    })
  );
}

function isInTable(editor: vscode.TextEditor | undefined): boolean {
  if (!editor) return false;
  if (editor.document.languageId !== 'markdown') return false;
  const line = editor.selection.active.line;
  return locateTable(editor.document, line) !== null;
}
