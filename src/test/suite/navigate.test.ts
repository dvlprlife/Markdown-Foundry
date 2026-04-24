import * as assert from 'assert';
import { computeCellRange } from '../../table/commands/navigate';

suite('navigate: computeCellRange', () => {
  test('returns trimmed bounds of a non-empty cell', () => {
    const line = '| hello   | world |';
    const result = computeCellRange(line, 0);
    // "hello" sits at chars 2-7 (inclusive start, exclusive end)
    assert.deepStrictEqual(result, { start: 2, end: 7 });
  });

  test('returns a zero-width range for an empty cell', () => {
    const line = '|   | value |';
    const result = computeCellRange(line, 0);
    assert.ok(result);
    assert.strictEqual(result.start, result.end, 'start and end should collapse for empty cell');
  });

  test('handles escaped pipes inside a cell as content, not separators', () => {
    const line = '| a \\| b | value |';
    const result = computeCellRange(line, 0);
    // Content is "a \| b" — escape doesn't terminate the cell.
    assert.deepStrictEqual(result, { start: 2, end: 8 });
  });

  test('handles ragged last cell with no trailing pipe', () => {
    const line = '| a | trailing';
    const result = computeCellRange(line, 1);
    assert.ok(result);
    assert.strictEqual(result.start, 6);
    assert.strictEqual(result.end, 14);
  });

  test('returns undefined when columnIndex exceeds the line columns', () => {
    const line = '| a | b |';
    const result = computeCellRange(line, 5);
    assert.strictEqual(result, undefined);
  });
});
