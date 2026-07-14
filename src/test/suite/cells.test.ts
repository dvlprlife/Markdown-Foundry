import * as assert from 'assert';
import {
  blankRowLike,
  cellCount,
  cellSpans,
  insertCell,
  padCells,
  removeCell,
  swapCells
} from '../../table/cells';

function texts(line: string): string[] {
  return cellSpans(line).map((span) => line.slice(span.start, span.end));
}

suite('cells: cellSpans', () => {
  test('spans cover each cell pipe-to-pipe, padding included', () => {
    assert.deepStrictEqual(cellSpans('| a | b |'), [
      { start: 1, end: 4 },
      { start: 5, end: 8 }
    ]);
    assert.deepStrictEqual(texts('| a | b |'), [' a ', ' b ']);
  });

  test('escaped pipes are content, not separators', () => {
    assert.deepStrictEqual(texts('| a \\| b | c |'), [' a \\| b ', ' c ']);
    assert.strictEqual(cellCount('| a \\| b | c |'), 2);
  });

  test('leading indent stays outside the first cell', () => {
    assert.deepStrictEqual(cellSpans('  | a | b |'), [
      { start: 3, end: 6 },
      { start: 7, end: 10 }
    ]);
  });

  test('rows without leading or trailing pipes', () => {
    assert.deepStrictEqual(texts('a | b'), ['a ', ' b']);
    assert.deepStrictEqual(texts('| a | b'), [' a ', ' b']);
    assert.deepStrictEqual(texts('a | b |'), ['a ', ' b ']);
  });

  test('trailing whitespace after the closing pipe is not a cell', () => {
    assert.strictEqual(cellCount('| a | b |   '), 2);
  });

  test('empty and whitespace-only cells are still cells', () => {
    assert.deepStrictEqual(texts('|  |  |'), ['  ', '  ']);
    assert.deepStrictEqual(texts('|||'), ['', '']);
  });

  test('single-column rows', () => {
    assert.deepStrictEqual(texts('| a |'), [' a ']);
    assert.strictEqual(cellCount('| a |'), 1);
  });
});

suite('cells: insertCell', () => {
  test('inserts before the cell at the index, leaving other cells byte-identical', () => {
    assert.strictEqual(insertCell('| Name | Age |', 1, '  '), '| Name |  | Age |');
    assert.strictEqual(insertCell('| Name | Age |', 0, '  '), '|  | Name | Age |');
  });

  test('appends when the index is the cell count', () => {
    assert.strictEqual(insertCell('| a | b |', 2, '  '), '| a | b |  |');
  });

  test('keeps the indent of an indented row', () => {
    assert.strictEqual(insertCell('  | a | b |', 0, '  '), '  |  | a | b |');
    assert.strictEqual(insertCell('  | a | b |', 2, ' --- '), '  | a | b | --- |');
  });

  test('does not split an escaped pipe', () => {
    assert.strictEqual(insertCell('| a \\| b | c |', 1, '  '), '| a \\| b |  | c |');
  });

  test('pads a ragged row so the new cell lands in the requested column', () => {
    assert.strictEqual(insertCell('| a1 |', 3, '  '), '| a1 |  |  |  |');
    assert.strictEqual(cellCount(insertCell('| a1 |', 3, '  ')), 4);
  });

  test('a row without a leading pipe gains one, so the new first cell survives', () => {
    assert.strictEqual(insertCell('a | b', 0, '  '), '|  |a | b');
    assert.deepStrictEqual(texts('|  |a | b'), ['  ', 'a ', ' b']);
  });

  test('a row without a trailing pipe gains one, so an appended blank cell survives', () => {
    assert.strictEqual(insertCell('a | b', 2, '  '), 'a | b|  |');
    assert.strictEqual(cellCount('a | b|  |'), 3);
  });
});

suite('cells: padCells', () => {
  test('grows a ragged row to the column count', () => {
    assert.strictEqual(padCells('| a1 |', 3, '  '), '| a1 |  |  |');
    assert.strictEqual(padCells('| --- |', 3, ' --- '), '| --- | --- | --- |');
  });

  test('leaves a row that is already wide enough alone', () => {
    assert.strictEqual(padCells('| a | b | c |', 3, '  '), '| a | b | c |');
    assert.strictEqual(padCells('| a | b | c |', 2, '  '), '| a | b | c |');
  });
});

suite('cells: removeCell', () => {
  test('removes the cell and one delimiting pipe', () => {
    assert.strictEqual(removeCell('| a | b | c |', 1), '| a | c |');
    assert.strictEqual(removeCell('| a | b | c |', 0), '| b | c |');
    assert.strictEqual(removeCell('| a | b | c |', 2), '| a | b |');
  });

  test('leaves surviving cells byte-identical, padding included', () => {
    assert.strictEqual(removeCell('| a |   bbb | c |', 0), '|   bbb | c |');
  });

  test('does not split an escaped pipe', () => {
    assert.strictEqual(removeCell('| a \\| x | b |', 1), '| a \\| x |');
  });

  test('an index past the end of a ragged row is a no-op', () => {
    assert.strictEqual(removeCell('| a1 |', 2), '| a1 |');
  });

  test('keeps the indent when the first cell of a pipeless row goes', () => {
    assert.strictEqual(removeCell('a | b | c', 0), 'b | c');
    assert.strictEqual(removeCell('  a | b | c', 0), '  b | c');
  });
});

suite('cells: swapCells', () => {
  test('swaps the raw text of two cells', () => {
    assert.strictEqual(swapCells('| a | bb | c |', 0, 1), '| bb | a | c |');
    assert.strictEqual(swapCells('| a | bb | c |', 2, 0), '| c | bb | a |');
  });

  test('argument order does not matter', () => {
    assert.strictEqual(swapCells('| a | b |', 1, 0), swapCells('| a | b |', 0, 1));
  });

  test('does not split an escaped pipe', () => {
    assert.strictEqual(swapCells('| a \\| x | b |', 0, 1), '| b | a \\| x |');
  });

  test('an index past the end of a ragged row is a no-op', () => {
    assert.strictEqual(swapCells('| a1 |', 0, 1), '| a1 |');
  });

  test('keeps the indent of a pipeless row', () => {
    assert.strictEqual(swapCells('a | b', 0, 1), 'b|a ');
    assert.strictEqual(swapCells('  a | b', 0, 1), '  b|a ');
  });
});

suite('cells: blankRowLike', () => {
  test('clones the pipe structure with every cell blanked', () => {
    assert.strictEqual(blankRowLike('| a1 | b1 | c1 |'), '|    |    |    |');
  });

  test('keeps each cell width so the pipes line up with the source row', () => {
    assert.strictEqual(blankRowLike('| Alice | 30 |'), '|       |    |');
  });

  test('keeps the indent', () => {
    assert.strictEqual(blankRowLike('  | a | bb |'), '  |   |    |');
  });

  test('uses rendered width, so wide characters still line up', () => {
    const source = '| 日本語 | 30 |';
    const blank = blankRowLike(source);
    assert.strictEqual(blank, '|        |    |');
    assert.deepStrictEqual(
      cellSpans(blank).map((s) => s.end - s.start),
      [8, 4]
    );
  });

  test('an escaped pipe does not become a cell boundary', () => {
    assert.strictEqual(blankRowLike('| a \\| b | c |'), '|        |   |');
    assert.strictEqual(cellCount(blankRowLike('| a \\| b | c |')), 2);
  });
});
