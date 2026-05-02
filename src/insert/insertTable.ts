import * as vscode from 'vscode';
import { Alignment, TableModel } from '../table/types';
import { formatTable } from '../table/formatter';

interface PresetSize {
  rows: number;
  cols: number;
}

const PRESETS: readonly PresetSize[] = [
  { rows: 2, cols: 2 },
  { rows: 3, cols: 3 },
  { rows: 3, cols: 2 },
  { rows: 4, cols: 3 },
  { rows: 5, cols: 3 },
  { rows: 5, cols: 4 }
];

const FIRST_HEADER_LABEL = 'Column 1';

const ROW_MIN = 1;
const ROW_MAX = 50;
const COL_MIN = 1;
const COL_MAX = 20;

export function buildEmptyTable(
  rows: number,
  cols: number,
  alignment: Alignment,
  eol: string
): string {
  const headers = Array.from({ length: cols }, (_, i) => `Column ${i + 1}`);
  const alignments: Alignment[] = Array(cols).fill(alignment);
  const bodyRowCount = Math.max(0, rows - 1);
  const bodyRows: string[][] = Array.from({ length: bodyRowCount }, () =>
    Array(cols).fill('')
  );
  const model: TableModel = {
    headers,
    alignments,
    rows: bodyRows,
    range: new vscode.Range(0, 0, 0, 0),
    indent: '',
    eol
  };
  return formatTable(model);
}

export function validateDimension(
  input: string,
  label: string,
  min: number,
  max: number
): string | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) return `${label} is required`;
  if (!/^-?\d+$/.test(trimmed)) return `${label} must be a whole number`;
  const n = Number(trimmed);
  if (n < min) return `${label} must be at least ${min}`;
  if (n > max) return `${label} must be at most ${max}`;
  return undefined;
}

export function computePadding(
  textBefore: string,
  textAfter: string,
  eol: string
): { leading: string; trailing: string } {
  return {
    leading: leadingPadding(textBefore, eol),
    trailing: trailingPadding(textAfter, eol)
  };
}

function leadingPadding(textBefore: string, eol: string): string {
  if (textBefore.length === 0) return '';
  if (!textBefore.endsWith(eol)) return eol + eol;
  const beforeNewline = textBefore.slice(0, -eol.length);
  if (beforeNewline.length === 0 || beforeNewline.endsWith(eol)) return '';
  return eol;
}

function trailingPadding(textAfter: string, eol: string): string {
  if (textAfter.length === 0) return '';
  if (!textAfter.startsWith(eol)) return eol + eol;
  const afterNewline = textAfter.slice(eol.length);
  if (afterNewline.length === 0 || afterNewline.startsWith(eol)) return '';
  return eol;
}

export async function insertTableCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const dims = await pickDimensions();
  if (!dims) return;

  const config = vscode.workspace.getConfiguration('markdownFoundry');
  const alignment = config.get<Alignment>('defaultAlignment') ?? 'left';
  const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

  const body = buildEmptyTable(dims.rows, dims.cols, alignment, eol);

  const document = editor.document;
  const selection = editor.selection;
  const startOffset = document.offsetAt(selection.start);
  const endOffset = document.offsetAt(selection.end);
  const fullText = document.getText();
  const textBefore = fullText.slice(0, startOffset);
  const textAfter = fullText.slice(endOffset);
  const { leading, trailing } = computePadding(textBefore, textAfter, eol);
  const replacement = leading + body + trailing;

  const ok = await editor.edit((edit) => edit.replace(selection, replacement));
  if (!ok) return;

  const headerOffsetWithinBody = body.indexOf(FIRST_HEADER_LABEL);
  if (headerOffsetWithinBody < 0) return;
  const headerStartOffset = startOffset + leading.length + headerOffsetWithinBody;
  const headerEndOffset = headerStartOffset + FIRST_HEADER_LABEL.length;
  const start = document.positionAt(headerStartOffset);
  const end = document.positionAt(headerEndOffset);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end));
}

async function pickDimensions(): Promise<PresetSize | undefined> {
  const customLabel = 'Custom...';
  const items: vscode.QuickPickItem[] = [
    ...PRESETS.map((p) => ({
      label: `${p.rows}×${p.cols}`,
      description: `${p.rows} rows by ${p.cols} columns`
    })),
    { label: customLabel, description: 'Enter custom dimensions' }
  ];
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Table size'
  });
  if (!picked) return undefined;

  if (picked.label !== customLabel) {
    const preset = PRESETS.find((p) => `${p.rows}×${p.cols}` === picked.label);
    return preset;
  }

  const rowsInput = await vscode.window.showInputBox({
    prompt: `Rows (${ROW_MIN}-${ROW_MAX})`,
    value: '3',
    validateInput: (v) => validateDimension(v, 'Rows', ROW_MIN, ROW_MAX)
  });
  if (rowsInput === undefined) return undefined;

  const colsInput = await vscode.window.showInputBox({
    prompt: `Columns (${COL_MIN}-${COL_MAX})`,
    value: '3',
    validateInput: (v) => validateDimension(v, 'Columns', COL_MIN, COL_MAX)
  });
  if (colsInput === undefined) return undefined;

  return { rows: Number(rowsInput.trim()), cols: Number(colsInput.trim()) };
}
