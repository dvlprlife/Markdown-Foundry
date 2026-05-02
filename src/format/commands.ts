import * as vscode from 'vscode';
import {
  wrapInline,
  wrapFenced,
  wrapLinePrefix,
  wrapHeading,
  adjustHeading,
  toggleBulletItem,
  toggleNumberedItem,
  toggleTaskItem
} from './toggle';

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

export async function toggleBulletListCommand(): Promise<void> {
  await applyLineRange(toggleBulletItem);
}

export async function toggleNumberedListCommand(): Promise<void> {
  await applyLineRange(toggleNumberedItem);
}

/**
 * Apply a line-aware transform to the cursor's current line, replacing only
 * that line. Used by heading toggles, task list, etc. — operations where the
 * single-line semantics differ from `applyLineRange`'s multi-line block.
 */
async function applyCurrentLine(
  transform: (line: string) => string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const cursorLine = editor.selection.active.line;
  const line = editor.document.lineAt(cursorLine);
  const replaced = transform(line.text);
  await editor.edit((edit) => edit.replace(line.range, replaced));
}

export async function toggleInlineCodeCommand(): Promise<void> {
  await applyInline('`');
}

export async function toggleHeading1Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 1));
}

export async function toggleHeading2Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 2));
}

export async function toggleHeading3Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 3));
}

export async function toggleHeading4Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 4));
}

export async function toggleHeading5Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 5));
}

export async function toggleHeading6Command(): Promise<void> {
  await applyCurrentLine((line) => wrapHeading(line, 6));
}

export async function promoteHeadingCommand(): Promise<void> {
  await applyCurrentLine((line) => adjustHeading(line, -1));
}

export async function demoteHeadingCommand(): Promise<void> {
  await applyCurrentLine((line) => adjustHeading(line, 1));
}

export async function toggleTaskListCommand(): Promise<void> {
  await applyCurrentLine(toggleTaskItem);
}

export async function insertHorizontalRuleCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const cursorLine = editor.selection.active.line;
  const line = editor.document.lineAt(cursorLine);
  const insertPos = new vscode.Position(cursorLine, line.text.length);
  await editor.edit((edit) => edit.insert(insertPos, '\n---'));
}
