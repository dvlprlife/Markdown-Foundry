import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../locator';
import { splitRow } from '../parser';
import { documentEol, readTableLines, renderTableLines } from './tableEdit';

/**
 * Sort the table rows by the column containing the cursor.
 * Prompts the user for ascending vs descending.
 * Detects numeric columns (all cells parseable as numbers) and sorts numerically;
 * otherwise sorts as strings using locale-aware comparison.
 */
export async function sortByColumnCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}
  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const location = locateTable(document, cursorLine);
  if (!location) {
    vscode.window.showInformationMessage('Markdown Foundry: cursor is not inside a table.');
    return;
  }

  const coords = cursorToTableCoords(document, location, editor.selection.active);
  if (!coords) {
    vscode.window.showInformationMessage('Markdown Foundry: cursor is on the separator row.');
    return;
  }

  const direction = await vscode.window.showQuickPick(
    [
      { label: 'Ascending', value: 'asc' as const },
      { label: 'Descending', value: 'desc' as const }
    ],
    { placeHolder: `Sort direction for column ${coords.columnIndex + 1}` }
  );
  if (!direction) {return;}

  const lines = readTableLines(document, location);
  const sorted = [
    ...lines.slice(0, 2),
    ...sortRowLines(lines.slice(2), coords.columnIndex, direction.value === 'desc')
  ];

  const text = renderTableLines(sorted, location, documentEol(document));
  await editor.edit((edit) => edit.replace(location.range, text));
}

/** Reorder body rows verbatim, comparing the cell values of one column. */
export function sortRowLines(
  rows: string[],
  columnIndex: number,
  descending: boolean
): string[] {
  const valueOf = (line: string): string => (splitRow(line)[columnIndex] ?? '').trim();

  const isNumeric = rows.every((line) => {
    const value = valueOf(line);
    if (value === '') {return true;}
    return !isNaN(Number(value));
  });

  const sorted = [...rows].sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);
    if (isNumeric) {
      return Number(av) - Number(bv);
    }
    return av.localeCompare(bv, undefined, { sensitivity: 'base' });
  });

  if (descending) {
    sorted.reverse();
  }
  return sorted;
}
