import * as vscode from 'vscode';
import * as path from 'path';
import { isImageExtension } from './imageExtensions';

const MAX_RESULTS = 5000;

export function toRelativeForwardSlash(
  fromDocPath: string,
  toFsPath: string,
  pathMod: typeof path = path
): string {
  const rel = pathMod.relative(pathMod.dirname(fromDocPath), toFsPath);
  return rel.split(pathMod.sep).join('/');
}

export function defaultLinkText(fsPath: string): string {
  return path.basename(fsPath, path.extname(fsPath));
}

export interface SortableItem {
  fsPath: string;
  relPath: string;
}

export function sortFileItems<T extends SortableItem>(items: T[], currentDir: string): T[] {
  const decorated = items.map((item, idx) => ({
    item,
    idx,
    sameFolder: path.dirname(item.fsPath) === currentDir
  }));
  decorated.sort((a, b) => {
    if (a.sameFolder !== b.sameFolder) return a.sameFolder ? -1 : 1;
    const cmp = a.item.relPath.localeCompare(b.item.relPath, undefined, { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return a.idx - b.idx;
  });
  return decorated.map((d) => d.item);
}

export function formatInsertion(text: string, relPath: string, isImage: boolean): string {
  return isImage ? `![${text}](${relPath})` : `[${text}](${relPath})`;
}

interface FileQuickPickItem extends vscode.QuickPickItem {
  fsPath: string;
  relPath: string;
}

export async function insertLinkToFileCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  if (document.isUntitled || document.uri.scheme !== 'file') {
    vscode.window.showInformationMessage(
      'Markdown Foundry: Insert Link to File requires a saved file.'
    );
    return;
  }

  const uris = await vscode.workspace.findFiles('**/*', undefined, MAX_RESULTS);
  if (uris.length === 0) {
    vscode.window.showInformationMessage(
      'Markdown Foundry: no files found in the workspace.'
    );
    return;
  }

  const docPath = document.uri.fsPath;
  const currentDir = path.dirname(docPath);
  const items: FileQuickPickItem[] = uris.map((uri) => {
    const fsPath = uri.fsPath;
    const relPath = vscode.workspace.asRelativePath(uri, false);
    return {
      label: path.basename(fsPath),
      description: relPath,
      fsPath,
      relPath
    };
  });
  const sorted = sortFileItems(items, currentDir);

  const placeHolder =
    uris.length >= MAX_RESULTS
      ? `Select a file to link to (showing first ${MAX_RESULTS} — use a workspace exclude to narrow)`
      : 'Select a file to link to';

  const picked = await vscode.window.showQuickPick(sorted, {
    matchOnDescription: true,
    placeHolder
  });
  if (!picked) return;

  const rel = toRelativeForwardSlash(docPath, picked.fsPath);
  const selection = editor.selection;
  const text = selection.isEmpty
    ? defaultLinkText(picked.fsPath)
    : document.getText(selection);
  const markdown = formatInsertion(text, rel, isImageExtension(picked.fsPath));

  await editor.edit((edit) => {
    if (selection.isEmpty) {
      edit.insert(selection.active, markdown);
    } else {
      edit.replace(selection, markdown);
    }
  });
}
