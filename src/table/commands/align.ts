import * as vscode from 'vscode';
import { locateTable } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';

/**
 * Align the Markdown table containing the cursor.
 *
 * Behavior:
 *   - If cursor is not in a table, show an info message.
 *   - Otherwise, reformat the table so columns line up.
 *   - Preserves alignment markers (:---, ---:, :---:).
 *   - Preserves indent, line endings, and escaped pipes.
 */
export async function alignTableCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const cursorLine = editor.selection.active.line;

  const location = locateTable(document, cursorLine);
  if (!location) {
    vscode.window.showInformationMessage('Markdown Forge: cursor is not inside a table.');
    return;
  }

  const model = parseTable(document, location);
  const formatted = formatTable(model);

  await editor.edit((edit) => {
    edit.replace(location.range, formatted);
  });
}

/**
 * Align every table in the document. Used by alignOnSave.
 * Scans top-to-bottom, processing tables as they are found, and skipping
 * past each table's last line so we don't re-enter it.
 */
export function alignAllTablesInDocument(
  document: vscode.TextDocument
): vscode.TextEdit[] {
  const edits: vscode.TextEdit[] = [];
  let line = 0;
  while (line < document.lineCount) {
    const location = locateTable(document, line);
    if (location) {
      const model = parseTable(document, location);
      const formatted = formatTable(model);
      edits.push(vscode.TextEdit.replace(location.range, formatted));
      line = location.lastBodyLine + 1;
    } else {
      line++;
    }
  }
  return edits;
}
