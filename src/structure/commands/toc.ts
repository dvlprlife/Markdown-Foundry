import * as vscode from 'vscode';
import {
  TOCOptions,
  extractHeadings,
  generateTOC,
  locateExistingTOC
} from '../toc';

export async function upsertTOCCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();
  const options = readOptions();
  const headings = extractHeadings(text);
  const toc = generateTOC(headings, options);

  if (!options.includeMarkers) {
    const cursor = editor.selection.active;
    await editor.edit((edit) => edit.insert(cursor, toc));
    return;
  }

  const existing = locateExistingTOC(text);
  if (existing) {
    const start = document.positionAt(existing.startOffset);
    const end = document.positionAt(existing.endOffset);
    await editor.edit((edit) => edit.replace(new vscode.Range(start, end), toc));
    return;
  }

  const cursor = editor.selection.active;
  await editor.edit((edit) => edit.insert(cursor, toc));
}

function readOptions(): TOCOptions {
  const config = vscode.workspace.getConfiguration('markdownFoundry.toc');
  return {
    minDepth: config.get<number>('minDepth') ?? 2,
    maxDepth: config.get<number>('maxDepth') ?? 6,
    indent: config.get<number>('indent') ?? 2,
    includeMarkers: config.get<boolean>('includeMarkers') ?? true
  };
}
