import * as vscode from 'vscode';
import * as path from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// VS Code's extension API does not expose clipboard image data, so we shell
// out to a platform-specific helper.
export async function pasteImageCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  if (document.uri.scheme !== 'file') {
    vscode.window.showInformationMessage('Markdown Foundry: image paste requires a saved file.');
    return;
  }

  const config = vscode.workspace.getConfiguration('markdownFoundry');
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
      `Markdown Foundry: could not paste image. ${err instanceof Error ? err.message : String(err)}`
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
      return saveClipboardImageMacOS(targetPath);
    case 'linux':
      return saveClipboardImageLinux(targetPath);
    default:
      throw new Error(`Clipboard image paste is not yet supported on ${process.platform}.`);
  }
}

const WINDOWS_CLIPBOARD_SCRIPT =
  "Add-Type -AssemblyName System.Windows.Forms, System.Drawing; " +
  "$img = [System.Windows.Forms.Clipboard]::GetImage(); " +
  "if ($null -eq $img) { Write-Error 'NO_IMAGE'; exit 1 } " +
  "$img.Save($env:MDFOUNDRY_IMAGE_PATH, [System.Drawing.Imaging.ImageFormat]::Png)";

async function saveClipboardImageWindows(targetPath: string): Promise<void> {
  try {
    // Pass the target path via an environment variable to avoid any shell
    // quoting of paths that may contain spaces or quotes.
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_CLIPBOARD_SCRIPT],
      {
        env: { ...process.env, MDFOUNDRY_IMAGE_PATH: targetPath },
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

const MACOS_CLIPBOARD_SCRIPT = [
  'try',
  '  set targetPath to (system attribute "MDFOUNDRY_IMAGE_PATH")',
  '  set pngData to the clipboard as «class PNGf»',
  '  set fp to open for access (POSIX file targetPath) with write permission',
  '  set eof of fp to 0',
  '  write pngData to fp',
  '  close access fp',
  'on error',
  '  error "NO_IMAGE" number 1',
  'end try',
].join('\n');

async function saveClipboardImageMacOS(targetPath: string): Promise<void> {
  try {
    await execFileAsync(
      'osascript',
      ['-e', MACOS_CLIPBOARD_SCRIPT],
      {
        env: { ...process.env, MDFOUNDRY_IMAGE_PATH: targetPath },
      }
    );
  } catch (err) {
    const stderr = readStderr(err);
    const message = err instanceof Error ? err.message : String(err);
    if (stderr.includes('NO_IMAGE') || message.includes('NO_IMAGE')) {
      throw new Error('Clipboard does not contain an image.');
    }
    throw new Error(`osascript failed: ${message}`);
  }
}

async function saveClipboardImageLinux(targetPath: string): Promise<void> {
  const isWayland = process.env.XDG_SESSION_TYPE === 'wayland';
  const command = isWayland ? 'wl-paste' : 'xclip';
  const args = isWayland
    ? ['--type', 'image/png']
    : ['-selection', 'clipboard', '-t', 'image/png', '-o'];
  const installHint = isWayland
    ? 'Clipboard paste requires wl-clipboard. Install with your package manager (e.g. sudo apt install wl-clipboard).'
    : 'Clipboard paste requires xclip. Install with your package manager (e.g. sudo apt install xclip).';

  await runAndCapture(command, args, targetPath, installHint);
}

async function runAndCapture(
  command: string,
  args: readonly string[],
  targetPath: string,
  installHint: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = createWriteStream(targetPath);
    let stderr = '';
    let bytesWritten = 0;

    child.on('error', (err: NodeJS.ErrnoException) => {
      out.destroy();
      if (err.code === 'ENOENT') {
        reject(new Error(installHint));
      } else {
        reject(new Error(`${command} failed: ${err.message}`));
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.stdout?.on('data', (chunk: Buffer) => { bytesWritten += chunk.length; });
    child.stdout?.pipe(out);

    out.on('error', (err) => reject(new Error(`failed writing ${targetPath}: ${err.message}`)));

    child.on('close', (code) => {
      out.end(() => {
        if (code !== 0 || bytesWritten === 0) {
          fs.unlink(targetPath).catch(() => { /* best-effort cleanup of empty/partial file */ });
          reject(new Error('Clipboard does not contain an image.'));
          return;
        }
        resolve();
      });
    });

    // Silence noUnusedLocals for the stderr accumulator (kept for future diagnostics).
    void stderr;
  });
}

function readStderr(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'stderr' in err) {
    const stderr = (err as { stderr: unknown }).stderr;
    if (typeof stderr === 'string') return stderr;
    if (Buffer.isBuffer(stderr)) return stderr.toString();
  }
  return '';
}
