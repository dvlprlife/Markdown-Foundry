import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Paste the clipboard image (if any) into the configured folder and insert a
 * Markdown image reference at the cursor.
 *
 * NOTE: VS Code's extension API does not expose clipboard image data directly.
 * The standard approach is to shell out to a platform-specific helper
 * (PowerShell on Windows, osascript on macOS, xclip/wl-paste on Linux).
 *
 * TODO (v1 polish):
 *   - Windows: powershell Get-Clipboard -Format Image | Save to file
 *   - macOS:  osascript to write the pasteboard picture to a file
 *   - Linux:  xclip -selection clipboard -t image/png -o > file
 *
 * The stub below handles the filesystem and insertion logic so you can wire
 * each platform handler in turn. To test without clipboard image data, you
 * can temporarily point saveClipboardImage to a known PNG file.
 */
export async function pasteImageCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  if (document.uri.scheme !== 'file') {
    vscode.window.showInformationMessage('Markdown Forge: image paste requires a saved file.');
    return;
  }

  const config = vscode.workspace.getConfiguration('markdownForge');
  const folderName = config.get<string>('imageFolder') ?? 'images';
  const nameFormat = config.get<string>('imageNameFormat') ?? 'image-${timestamp}';

  const docDir = path.dirname(document.uri.fsPath);
  const imageDir = path.join(docDir, folderName);
  await fs.mkdir(imageDir, { recursive: true });

  const filename = expandNameFormat(nameFormat, document.uri.fsPath) + '.png';
  const targetPath = path.join(imageDir, filename);

  try {
    await saveClipboardImage(targetPath);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Markdown Forge: could not paste image. ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  const relative = path.relative(docDir, targetPath).split(path.sep).join('/');
  const markdown = `![](${relative})`;
  await editor.edit((edit) => edit.insert(editor.selection.active, markdown));
}

function expandNameFormat(template: string, documentPath: string): string {
  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    pad2(now.getMonth() + 1) +
    pad2(now.getDate()) +
    '-' +
    pad2(now.getHours()) +
    pad2(now.getMinutes()) +
    pad2(now.getSeconds());
  const date = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  const filename = path.basename(documentPath, path.extname(documentPath));
  return template
    .replace(/\$\{timestamp\}/g, timestamp)
    .replace(/\$\{date\}/g, date)
    .replace(/\$\{filename\}/g, filename);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Platform-specific clipboard-to-file save. Stubbed for v1 — implement per
 * platform before publishing. See function docstring for the recommended
 * approach on each OS.
 */
async function saveClipboardImage(_targetPath: string): Promise<void> {
  throw new Error(
    'Image paste is not yet implemented. Wire up platform-specific clipboard handlers in src/insert/image.ts.'
  );
}
