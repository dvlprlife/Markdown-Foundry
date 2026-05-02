import * as assert from 'assert';
import * as path from 'path';
import {
  defaultLinkText,
  formatInsertion,
  sortFileItems,
  toRelativeForwardSlash
} from '../../insert/linkToFile';

suite('linkToFile: toRelativeForwardSlash', () => {
  test('sibling file under POSIX', () => {
    const result = toRelativeForwardSlash('/proj/a.md', '/proj/b.md', path.posix);
    assert.strictEqual(result, 'b.md');
  });

  test('subfolder under POSIX', () => {
    const result = toRelativeForwardSlash('/proj/a.md', '/proj/sub/b.md', path.posix);
    assert.strictEqual(result, 'sub/b.md');
  });

  test('parent folder under POSIX', () => {
    const result = toRelativeForwardSlash('/proj/sub/a.md', '/proj/b.md', path.posix);
    assert.strictEqual(result, '../b.md');
  });

  test('Windows path uses forward slashes in output', () => {
    const result = toRelativeForwardSlash(
      'C:\\proj\\notes\\a.md',
      'C:\\proj\\images\\b.png',
      path.win32
    );
    assert.strictEqual(result, '../images/b.png');
  });

  test('Windows sibling file', () => {
    const result = toRelativeForwardSlash(
      'C:\\proj\\a.md',
      'C:\\proj\\b.md',
      path.win32
    );
    assert.strictEqual(result, 'b.md');
  });
});

suite('linkToFile: defaultLinkText', () => {
  test('strips extension', () => {
    assert.strictEqual(defaultLinkText('/proj/foo.md'), 'foo');
  });

  test('preserves multi-dot stems', () => {
    assert.strictEqual(defaultLinkText('/proj/archive.tar.gz'), 'archive.tar');
  });

  test('dotfile keeps its name', () => {
    assert.strictEqual(defaultLinkText('/proj/.gitignore'), '.gitignore');
  });

  test('no extension returns full basename', () => {
    assert.strictEqual(defaultLinkText('/proj/Makefile'), 'Makefile');
  });
});

suite('linkToFile: sortFileItems', () => {
  test('current-folder items precede other items', () => {
    const items = [
      { fsPath: '/proj/sub/a.md', relPath: 'sub/a.md' },
      { fsPath: '/proj/b.md', relPath: 'b.md' },
      { fsPath: '/proj/sub/b.md', relPath: 'sub/b.md' },
      { fsPath: '/proj/a.md', relPath: 'a.md' }
    ];
    const sorted = sortFileItems(items, '/proj');
    assert.deepStrictEqual(
      sorted.map((i) => i.relPath),
      ['a.md', 'b.md', 'sub/a.md', 'sub/b.md']
    );
  });

  test('within each group, alphabetical case-insensitive', () => {
    const items = [
      { fsPath: '/proj/Z.md', relPath: 'Z.md' },
      { fsPath: '/proj/a.md', relPath: 'a.md' },
      { fsPath: '/proj/B.md', relPath: 'B.md' }
    ];
    const sorted = sortFileItems(items, '/proj');
    assert.deepStrictEqual(
      sorted.map((i) => i.relPath),
      ['a.md', 'B.md', 'Z.md']
    );
  });

  test('stable across equal keys', () => {
    const items = [
      { fsPath: '/x/a.md', relPath: 'first' },
      { fsPath: '/x/b.md', relPath: 'first' },
      { fsPath: '/x/c.md', relPath: 'first' }
    ];
    const sorted = sortFileItems(items, '/x');
    assert.deepStrictEqual(
      sorted.map((i) => i.fsPath),
      ['/x/a.md', '/x/b.md', '/x/c.md']
    );
  });
});

suite('linkToFile: formatInsertion', () => {
  test('non-image renders as [text](rel)', () => {
    assert.strictEqual(formatInsertion('docs', 'sub/x.md', false), '[docs](sub/x.md)');
  });

  test('image renders as ![text](rel)', () => {
    assert.strictEqual(formatInsertion('hero', 'images/hero.png', true), '![hero](images/hero.png)');
  });
});
