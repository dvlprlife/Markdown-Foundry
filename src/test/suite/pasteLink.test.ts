import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { classifyClipboard } from '../../insert/link';
import { isImageExtension } from '../../insert/imageExtensions';

let tmpDir: string;
let txtFile: string;
let pngFile: string;

suite('pasteLink: classifyClipboard', () => {
  suiteSetup(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfoundry-paste-link-'));
    txtFile = path.join(tmpDir, 'note.md');
    pngFile = path.join(tmpDir, 'pic.png');
    fs.writeFileSync(txtFile, '# hi\n');
    fs.writeFileSync(pngFile, '');
  });

  suiteTeardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('http URL → url branch', () => {
    const r = classifyClipboard('https://example.com/foo');
    assert.deepStrictEqual(r, { kind: 'url', value: 'https://example.com/foo' });
  });

  test('https URL with whitespace is trimmed', () => {
    const r = classifyClipboard('  https://example.com  ');
    assert.deepStrictEqual(r, { kind: 'url', value: 'https://example.com' });
  });

  test('empty / whitespace → none', () => {
    assert.deepStrictEqual(classifyClipboard(''), { kind: 'none' });
    assert.deepStrictEqual(classifyClipboard('   \n   '), { kind: 'none' });
  });

  test('absolute path that exists → path branch (non-image)', () => {
    const r = classifyClipboard(txtFile);
    assert.strictEqual(r.kind, 'path');
    if (r.kind === 'path') {
      assert.strictEqual(r.absPath, txtFile);
      assert.strictEqual(r.isImage, false);
    }
  });

  test('absolute path with .png extension → path branch with isImage=true', () => {
    const r = classifyClipboard(pngFile);
    assert.strictEqual(r.kind, 'path');
    if (r.kind === 'path') {
      assert.strictEqual(r.isImage, true);
    }
  });

  test('non-existent absolute path → none', () => {
    const fake = path.join(tmpDir, 'does-not-exist.md');
    assert.deepStrictEqual(classifyClipboard(fake), { kind: 'none' });
  });

  test('file:// URI on POSIX resolves to a path that exists', () => {
    if (process.platform === 'win32') return;
    const uri = 'file://' + txtFile;
    const r = classifyClipboard(uri, { platform: 'linux' });
    assert.strictEqual(r.kind, 'path');
    if (r.kind === 'path') assert.strictEqual(r.absPath, txtFile);
  });

  test('file:// URI on Windows strips the leading slash before the drive letter', () => {
    const seen: string[] = [];
    const fakeExists = (p: string) => {
      seen.push(p);
      return p === 'C:\\Users\\me\\notes\\spec.md';
    };
    const r = classifyClipboard('file:///C:/Users/me/notes/spec.md', {
      platform: 'win32',
      existsSync: fakeExists
    });
    assert.strictEqual(r.kind, 'path');
    if (r.kind === 'path') {
      assert.strictEqual(r.absPath, 'C:\\Users\\me\\notes\\spec.md');
    }
  });

  test('file:// URI with percent-encoded spaces is decoded', () => {
    const target = path.join(tmpDir, 'has space.md');
    fs.writeFileSync(target, '');
    try {
      const uri = process.platform === 'win32'
        ? 'file:///' + target.replace(/\\/g, '/').replace(/ /g, '%20')
        : 'file://' + target.replace(/ /g, '%20');
      const r = classifyClipboard(uri);
      assert.strictEqual(r.kind, 'path');
      if (r.kind === 'path') assert.strictEqual(r.absPath, target);
    } finally {
      fs.rmSync(target, { force: true });
    }
  });

  test('relative path (even if existent) → none', () => {
    const r = classifyClipboard('./note.md');
    assert.strictEqual(r.kind, 'none');
  });

  test('plain word → none', () => {
    assert.deepStrictEqual(classifyClipboard('hello world'), { kind: 'none' });
  });

  test('malformed file:// URI → none', () => {
    const r = classifyClipboard('file://');
    assert.strictEqual(r.kind, 'none');
  });
});

suite('pasteLink: isImageExtension', () => {
  test('common image extensions return true', () => {
    assert.strictEqual(isImageExtension('foo.png'), true);
    assert.strictEqual(isImageExtension('foo.JPG'), true);
    assert.strictEqual(isImageExtension('foo.jpeg'), true);
    assert.strictEqual(isImageExtension('foo.gif'), true);
    assert.strictEqual(isImageExtension('foo.webp'), true);
    assert.strictEqual(isImageExtension('foo.svg'), true);
    assert.strictEqual(isImageExtension('foo.bmp'), true);
    assert.strictEqual(isImageExtension('foo.ico'), true);
  });

  test('non-image extensions return false', () => {
    assert.strictEqual(isImageExtension('foo.md'), false);
    assert.strictEqual(isImageExtension('foo.txt'), false);
    assert.strictEqual(isImageExtension('foo'), false);
    assert.strictEqual(isImageExtension('.gitignore'), false);
  });
});
