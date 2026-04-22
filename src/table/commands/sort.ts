import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { parseTable } from '../parser';
import { formatTable } from '../formatter';

/**
 * Sort the table rows by the column containing the cursor.
 * Prompts the user for ascending vs descending.
 * Detects numeric columns (all cells parseable as numbers) and sorts numerically;
 * otherwise sorts as strings using locale-aware comparison.
 */
export async function sortByColumnCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {
    vscode.window.showInformationMessage('Markdown Forge: cursor is not inside a table.');
    return;
  }

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) return;

  const direction = await vscode.window.showQuickPick(
    [
      { label: 'Ascending', value: 'asc' as const },
      { label: 'Descending', value: 'desc' as const }
    ],
    { placeHolder: `Sort direction for column ${coords.columnIndex + 1}` }
  );
  if (!direction) return;

  const model = parseTable(document, location);
  const col = coords.columnIndex;

  const isNumeric = model.rows.every((row) => {
    const value = (row[col] ?? '').trim();
    if (value === '') return true;
    return !isNaN(Number(value));
  });

  const sorted = [...model.rows].sort((a, b) => {
    const av = (a[col] ?? '').trim();
    const bv = (b[col] ?? '').trim();
    if (isNumeric) {
      const an = Number(av);
      const bn = Number(bv);
      return an - bn;
    }
    return av.localeCompare(bv, undefined, { sensitivity: 'base' });
  });

  if (direction.value === 'desc') {
    sorted.reverse();
  }

  const newModel = { ...model, rows: sorted };
  const formatted = formatTable(newModel);
  await editor.edit((edit) => edit.replace(location.range, formatted));
}
