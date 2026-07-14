import * as assert from 'assert';
import * as vscode from 'vscode';
import { splitRow, parseAlignments, parseTableFromLines } from '../../table/parser';

const RANGE = new vscode.Range(0, 0, 0, 0);

suite('parser: parseTableFromLines', () => {
  test('parses header, alignments and body rows', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| :--- | ---: |', '| a1 | b1 |', '| a2 | b2 |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.headers, ['A', 'B']);
    assert.deepStrictEqual(model.alignments, ['left', 'right']);
    assert.deepStrictEqual(model.rows, [
      ['a1', 'b1'],
      ['a2', 'b2']
    ]);
    assert.strictEqual(model.indent, '');
    assert.strictEqual(model.eol, '\n');
  });

  test('pads a ragged row and truncates an over-wide one to the header width', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a1 |', '| a2 | b2 | c2 |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.rows, [
      ['a1', ''],
      ['a2', 'b2']
    ]);
  });

  test('takes the indent from the header line', () => {
    const model = parseTableFromLines(
      ['  | A | B |', '  | --- | --- |', '  | a1 | b1 |'],
      RANGE,
      '\n'
    );
    assert.strictEqual(model.indent, '  ');
    assert.deepStrictEqual(model.rows, [['a1', 'b1']]);
  });

  test('carries the CRLF line ending through to the model', () => {
    const model = parseTableFromLines(['| A |', '| --- |', '| a1 |'], RANGE, '\r\n');
    assert.strictEqual(model.eol, '\r\n');
  });

  test('unescapes pipes in cell values', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a \\| x | b1 |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.rows, [['a | x', 'b1']]);
  });

  test('a table with no body rows yields no rows', () => {
    const model = parseTableFromLines(['| A | B |', '| --- | --- |'], RANGE, '\n');
    assert.deepStrictEqual(model.rows, []);
    assert.deepStrictEqual(model.headers, ['A', 'B']);
  });
});

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
