import * as vscode from 'vscode';
import { TableLocation } from '../locator';
import { parseTableFromLines } from '../parser';
import { formatTable } from '../formatter';

/** Raw source lines of a located table: header, separator, then body rows. */
export function readTableLines(
  document: vscode.TextDocument,
  location: TableLocation
): string[] {
  const lines: string[] = [];
  for (let i = location.headerLine; i <= location.lastBodyLine; i++) {
    lines.push(document.lineAt(i).text);
  }
  return lines;
}

export function documentEol(document: vscode.TextDocument): string {
  return document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
}

function alignOnEdit(): boolean {
  return vscode.workspace.getConfiguration('markdownFoundry').get<boolean>('alignOnEdit') ?? false;
}

/**
 * Render edited table lines back to document text. Editing commands rewrite
 * the raw lines so untouched cells keep their padding; aligning the result is
 * an opt-in post-pass, which is what makes both modes share one code path.
 */
export function renderTableLines(
  lines: string[],
  location: TableLocation,
  eol: string
): string {
  if (!alignOnEdit()) {
    return lines.join(eol);
  }
  return formatTable(parseTableFromLines(lines, location.range, eol));
}
