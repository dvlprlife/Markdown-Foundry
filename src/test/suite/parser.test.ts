import * as assert from 'assert';
import { splitRow, parseAlignments } from '../../table/parser';

suite('parser: splitRow', () => {
  test('simple row with leading and trailing pipes', () => {
    assert.deepStrictEqual(splitRow('| a | b | c |'), ['a', 'b', 'c']);
  });

  test('row without leading/trailing pipes', () => {
    assert.deepStrictEqual(splitRow('a | b | c'), ['a', 'b', 'c']);
  });

  test('escaped pipes preserved in cells', () => {
    assert.deepStrictEqual(splitRow('| a \\| b | c |'), ['a | b', 'c']);
  });

  test('empty cells preserved', () => {
    assert.deepStrictEqual(splitRow('| a |  | c |'), ['a', '', 'c']);
  });

  test('leading whitespace tolerated', () => {
    assert.deepStrictEqual(splitRow('    | a | b |'), ['a', 'b']);
  });
});

suite('parser: parseAlignments', () => {
  test('all none (no colons)', () => {
    assert.deepStrictEqual(parseAlignments('| --- | --- | --- |', 3), ['none', 'none', 'none']);
  });

  test('mixed alignments', () => {
    assert.deepStrictEqual(
      parseAlignments('| :--- | :---: | ---: |', 3),
      ['left', 'center', 'right']
    );
  });

  test('pads to expected length when separator has fewer cells', () => {
    assert.deepStrictEqual(parseAlignments('| --- |', 3), ['none', 'none', 'none']);
  });

  test('truncates to expected length when separator has more cells', () => {
    assert.deepStrictEqual(
      parseAlignments('| --- | --- | --- | --- |', 2),
      ['none', 'none']
    );
  });
});
