import * as vscode from 'vscode';
import { Alignment, TableModel } from '../types';
import { formatTable } from '../formatter';

/**
 * Convert the current selection from CSV or TSV into a Markdown table.
 *
 * Detection:
 *   - If selection contains tabs, treat as TSV.
 *   - Else if selection contains commas, treat as CSV (with basic quoted-field support).
 *   - Else fall back to whitespace-separated columns.
 *
 * The first line becomes the header row. All rows are normalized to the same
 * column count as the header.
 */
export async function convertSelectionToTableCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showInformationMessage('Markdown Foundry: select CSV or TSV text to convert.');
    return;
  }

  const text = editor.document.getText(selection);
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return;

  const delimiter = detectDelimiter(text);
  const grid = lines.map((line) => splitLine(line, delimiter));
  const columnCount = Math.max(...grid.map((row) => row.length));
  const normalized = grid.map((row) =>
    row.length === columnCount ? row : [...row, ...Array(columnCount - row.length).fill('')]
  );

  const headers = normalized[0];
  const rows = normalized.slice(1);
  const config = vscode.workspace.getConfiguration('markdownFoundry');
  const defaultAlign = (config.get<Alignment>('defaultAlignment') ?? 'left');
  const alignments: Alignment[] = Array(columnCount).fill(defaultAlign);

  const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const indent = ''; // don't inherit indent — user selected raw text

  const model: TableModel = {
    headers,
    alignments,
    rows,
    range: selection,
    indent,
    eol
  };

  const formatted = formatTable(model);
  await editor.edit((edit) => edit.replace(selection, formatted));
}

type Delimiter = 'tab' | 'comma' | 'whitespace';

function detectDelimiter(text: string): Delimiter {
  if (text.includes('\t')) return 'tab';
  if (text.includes(',')) return 'comma';
  return 'whitespace';
}

/**
 * Split a line by the detected delimiter. For CSV, handle quoted fields
 * (double-quoted, with "" representing a literal quote).
 */
function splitLine(line: string, delimiter: Delimiter): string[] {
  if (delimiter === 'tab') {
    return line.split('\t').map((c) => c.trim());
  }
  if (delimiter === 'whitespace') {
    return line.trim().split(/\s+/);
  }
  // CSV
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}
