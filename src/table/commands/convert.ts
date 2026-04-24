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
  const delimiter = detectDelimiter(text);

  let grid: string[][];
  if (delimiter === 'comma') {
    grid = parseCsv(text);
  } else {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    grid = lines.map((line) => splitLine(line, delimiter));
  }
  if (grid.length === 0) return;
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

function splitLine(line: string, delimiter: 'tab' | 'whitespace'): string[] {
  if (delimiter === 'tab') {
    return line.split('\t').map((c) => c.trim());
  }
  return line.trim().split(/\s+/);
}

/**
 * Parse CSV text into rows, tracking quote state across newlines so a quoted
 * field can span multiple lines. Embedded newlines inside quoted fields become
 * `<br>` since Markdown table cells can't contain raw line breaks.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
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
        row.push(finalizeCell(current));
        current = '';
      } else if (ch === '\r' && text[i + 1] === '\n') {
        row.push(finalizeCell(current));
        rows.push(row);
        row = [];
        current = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(finalizeCell(current));
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }
  // Flush any trailing cell / row.
  if (current.length > 0 || row.length > 0) {
    row.push(finalizeCell(current));
    rows.push(row);
  }
  // Drop trailing all-empty rows (matches prior behavior of filtering blank lines).
  return rows.filter((r) => !(r.length === 1 && r[0].length === 0));
}

function finalizeCell(raw: string): string {
  return raw.replace(/\r?\n/g, '<br>').trim();
}
