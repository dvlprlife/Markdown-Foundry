import * as vscode from 'vscode';
import { wrapInline, wrapFenced, wrapLinePrefix } from './toggle';

/**
 * Apply an inline wrap to the current selection. If no selection, insert
 * doubled markers at the cursor and place the cursor between them.
 */
async function applyInline(marker: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const selection = editor.selection;

  if (selection.isEmpty) {
    const doubled = marker + marker;
    const insertPos = selection.active;
    await editor.edit((edit) => edit.insert(insertPos, doubled));
    const newPos = insertPos.translate(0, marker.length);
    editor.selection = new vscode.Selection(newPos, newPos);
    return;
  }

  const text = editor.document.getText(selection);
  const replaced = wrapInline(text, marker);
  await editor.edit((edit) => edit.replace(selection, replaced));
}

export async function toggleBoldCommand(): Promise<void> {
  await applyInline('**');
}

export async function toggleItalicCommand(): Promise<void> {
  await applyInline('*');
}

export async function toggleBoldItalicCommand(): Promise<void> {
  await applyInline('***');
}

export async function toggleStrikethroughCommand(): Promise<void> {
  await applyInline('~~');
}

/**
 * Expand the selection to cover full lines, then apply a transform to the
 * resulting text block. Used by line-oriented toggles (blockquote, block code)
 * so a cursor anywhere on a line operates on the whole line.
 */
async function applyLineRange(
  transform: (text: string) => string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const selection = editor.selection;

  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const lineRange = new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, editor.document.lineAt(endLine).text.length)
  );
  const text = editor.document.getText(lineRange);
  const replaced = transform(text);
  await editor.edit((edit) => edit.replace(lineRange, replaced));
}

export async function toggleBlockquoteCommand(): Promise<void> {
  await applyLineRange((text) => wrapLinePrefix(text, '> '));
}

export async function toggleBlockCodeCommand(): Promise<void> {
  await applyLineRange((text) => wrapFenced(text));
}
