import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// VS Code's extension API does not expose clipboard image data, so we shell
// out to a platform-specific helper.
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

async function saveClipboardImage(targetPath: string): Promise<void> {
  switch (process.platform) {
    case 'win32':
      return saveClipboardImageWindows(targetPath);
    case 'darwin':
      throw new Error('Clipboard image paste is not yet supported on macOS.');
    case 'linux':
      throw new Error('Clipboard image paste is not yet supported on Linux.');
    default:
      throw new Error(`Clipboard image paste is not yet supported on ${process.platform}.`);
  }
}

const WINDOWS_CLIPBOARD_SCRIPT =
  "Add-Type -AssemblyName System.Windows.Forms, System.Drawing; " +
  "$img = [System.Windows.Forms.Clipboard]::GetImage(); " +
  "if ($null -eq $img) { Write-Error 'NO_IMAGE'; exit 1 } " +
  "$img.Save($env:MDFORGE_IMAGE_PATH, [System.Drawing.Imaging.ImageFormat]::Png)";

async function saveClipboardImageWindows(targetPath: string): Promise<void> {
  try {
    // Pass the target path via an environment variable to avoid any shell
    // quoting of paths that may contain spaces or quotes.
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_CLIPBOARD_SCRIPT],
      {
        env: { ...process.env, MDFORGE_IMAGE_PATH: targetPath },
        windowsHide: true,
      }
    );
  } catch (err) {
    const stderr = readStderr(err);
    const message = err instanceof Error ? err.message : String(err);
    if (stderr.includes('NO_IMAGE') || message.includes('NO_IMAGE')) {
      throw new Error('Clipboard does not contain an image.');
    }
    throw new Error(`powershell failed: ${message}`);
  }
}

function readStderr(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'stderr' in err) {
    const stderr = (err as { stderr: unknown }).stderr;
    if (typeof stderr === 'string') return stderr;
    if (Buffer.isBuffer(stderr)) return stderr.toString();
  }
  return '';
}
