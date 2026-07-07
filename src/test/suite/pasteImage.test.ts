import * as assert from 'assert';
import * as path from 'path';
import { uniqueTargetPath } from '../../insert/image';

suite('image: uniqueTargetPath', () => {
  const dir = path.join('some', 'images');

  test('returns the plain name when nothing exists', () => {
    const result = uniqueTargetPath(dir, 'image-x', '.png', () => false);
    assert.strictEqual(result, path.join(dir, 'image-x.png'));
  });

  test('suffixes -1 when the plain name is taken', () => {
    const taken = new Set([path.join(dir, 'image-x.png')]);
    const result = uniqueTargetPath(dir, 'image-x', '.png', (p) => taken.has(p));
    assert.strictEqual(result, path.join(dir, 'image-x-1.png'));
  });

  test('finds the first free suffix after several collisions', () => {
    const taken = new Set([
      path.join(dir, 'image-x.png'),
      path.join(dir, 'image-x-1.png'),
      path.join(dir, 'image-x-2.png')
    ]);
    const result = uniqueTargetPath(dir, 'image-x', '.png', (p) => taken.has(p));
    assert.strictEqual(result, path.join(dir, 'image-x-3.png'));
  });
});
