import * as assert from 'assert';
import { sortRowLines } from '../../table/commands/sort';

const ROWS = ['| Bob | 7 |', '| Alice | 30 |', '| carol | 8 |'];

suite('sort: sortRowLines', () => {
  test('reorders body lines verbatim, padding included', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 0, false), [
      '| Alice | 30 |',
      '| Bob | 7 |',
      '| carol | 8 |'
    ]);
  });

  test('descending reverses the order', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 0, true), [
      '| carol | 8 |',
      '| Bob | 7 |',
      '| Alice | 30 |'
    ]);
  });

  test('a numeric column sorts numerically, not lexically', () => {
    assert.deepStrictEqual(sortRowLines(ROWS, 1, false), [
      '| Bob | 7 |',
      '| carol | 8 |',
      '| Alice | 30 |'
    ]);
  });

  test('escaped pipes do not shift the compared column', () => {
    const rows = ['| b \\| x | 2 |', '| a \\| y | 1 |'];
    assert.deepStrictEqual(sortRowLines(rows, 1, false), [
      '| a \\| y | 1 |',
      '| b \\| x | 2 |'
    ]);
  });

  test('a ragged row compares as empty and keeps its shape', () => {
    const rows = ['| b | 2 |', '| a |'];
    assert.deepStrictEqual(sortRowLines(rows, 1, false), ['| a |', '| b | 2 |']);
  });
});
