import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { URL as NodeURL } from 'url';
import { isImageExtension } from './imageExtensions';

export type ClipboardKind =
  | { kind: 'url'; value: string }
  | { kind: 'path'; absPath: string; isImage: boolean }
  | { kind: 'none' };

const URL_RE = /^https?:\/\/\S+$/i;

interface ClassifyOptions {
  platform?: NodeJS.Platform;
  existsSync?: (p: string) => boolean;
}

export function classifyClipboard(raw: string, options: ClassifyOptions = {}): ClipboardKind {
  const platform = options.platform ?? process.platform;
  const exists = options.existsSync ?? fs.existsSync;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'none' };

  if (URL_RE.test(trimmed)) {
    return { kind: 'url', value: trimmed };
  }

  if (/^file:\/\//i.test(trimmed)) {
    try {
      const url = new NodeURL(trimmed);
      if (url.pathname === '' || url.pathname === '/') return { kind: 'none' };
      let p = decodeURIComponent(url.pathname);
      if (platform === 'win32' && /^\/[A-Za-z]:/.test(p)) {
        p = p.slice(1);
      }
      if (platform === 'win32') p = p.replace(/\//g, '\\');
      if (isAbsoluteAcross(p, platform) && exists(p)) {
        return { kind: 'path', absPath: p, isImage: isImageExtension(p) };
      }
    } catch {
      // fall through to 'none'
    }
    return { kind: 'none' };
  }

  if (isAbsoluteAcross(trimmed, platform) && exists(trimmed)) {
    return { kind: 'path', absPath: trimmed, isImage: isImageExtension(trimmed) };
  }

  return { kind: 'none' };
}

function isAbsoluteAcross(p: string, platform: NodeJS.Platform): boolean {
  return platform === 'win32' ? path.win32.isAbsolute(p) : path.posix.isAbsolute(p);
}

export async function pasteLinkCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const raw = await vscode.env.clipboard.readText();
  const result = classifyClipboard(raw);

  if (result.kind === 'none') {
    vscode.window.showInformationMessage(
      'Markdown Foundry: clipboard does not contain a URL or file path.'
    );
    return;
  }

  const selection = editor.selection;
  const selectedText = selection.isEmpty ? '' : document.getText(selection);

  if (result.kind === 'url') {
    const url = result.value;
    const text = await resolveLinkText(
      selectedText,
      url,
      'Link text (leave empty to use the URL)'
    );
    if (text === undefined) return;
    await applyEdit(editor, selection, `[${text}](${url})`);
    return;
  }

  if (document.uri.scheme !== 'file') {
    vscode.window.showInformationMessage(
      'Markdown Foundry: file-path link requires a saved file.'
    );
    return;
  }

  const docDir = path.dirname(document.uri.fsPath);
  const rel = path.relative(docDir, result.absPath).split(path.sep).join('/');
  const fallback = path.basename(result.absPath, path.extname(result.absPath));

  const text = await resolveLinkText(
    selectedText,
    fallback,
    `Link text (leave empty to use ${fallback})`
  );
  if (text === undefined) return;

  const markdown = result.isImage ? `![${text}](${rel})` : `[${text}](${rel})`;
  await applyEdit(editor, selection, markdown);
}

async function resolveLinkText(
  selectedText: string,
  fallback: string,
  prompt: string
): Promise<string | undefined> {
  if (selectedText.length > 0) return selectedText;
  const input = await vscode.window.showInputBox({ prompt, placeHolder: fallback });
  if (input === undefined) return undefined;
  return input.length > 0 ? input : fallback;
}

async function applyEdit(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  markdown: string
): Promise<void> {
  await editor.edit((edit) => {
    if (selection.isEmpty) {
      edit.insert(selection.active, markdown);
    } else {
      edit.replace(selection, markdown);
    }
  });
}
