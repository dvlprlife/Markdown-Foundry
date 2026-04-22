import * as assert from 'assert';
import * as vscode from 'vscode';
import { formatTable, visualWidth } from '../../table/formatter';
import { TableModel } from '../../table/types';

function makeModel(partial: Partial<TableModel>): TableModel {
  return {
    headers: partial.headers ?? [],
    alignments: partial.alignments ?? [],
    rows: partial.rows ?? [],
    range: partial.range ?? new vscode.Range(0, 0, 0, 0),
    indent: partial.indent ?? '',
    eol: partial.eol ?? '\n'
  };
}

suite('formatter: formatTable', () => {
  test('aligns columns left by default', () => {
    const model = makeModel({
      headers: ['a', 'name'],
      alignments: ['left', 'left'],
      rows: [['hi', 'x'], ['hello', 'world']]
    });
    const out = formatTable(model);
    const lines = out.split('\n');
    assert.strictEqual(lines.length, 4);
    // Every line has the same length (columns aligned)
    const len = lines[0].length;
    for (const line of lines) {
      assert.strictEqual(line.length, len, `line length mismatch: "${line}"`);
    }
  });

  test('preserves alignment markers in separator', () => {
    const model = makeModel({
      headers: ['a', 'b', 'c'],
      alignments: ['left', 'center', 'right'],
      rows: [['1', '2', '3']]
    });
    const out = formatTable(model);
    const separator = out.split('\n')[1];
    assert.ok(separator.includes(':---'), 'left marker present');
    assert.ok(/:-+:/.test(separator), 'center marker present');
    assert.ok(/-+:/.test(separator), 'right marker present');
  });

  test('escapes pipes inside cells', () => {
    const model = makeModel({
      headers: ['a'],
      alignments: ['left'],
      rows: [['has | pipe']]
    });
    const out = formatTable(model);
    assert.ok(out.includes('\\|'), 'pipe in cell is escaped');
  });

  test('respects indent', () => {
    const model = makeModel({
      headers: ['a'],
      alignments: ['left'],
      rows: [['x']],
      indent: '    '
    });
    const out = formatTable(model);
    for (const line of out.split('\n')) {
      assert.ok(line.startsWith('    '), `line does not start with indent: "${line}"`);
    }
  });

  test('respects CRLF line endings', () => {
    const model = makeModel({
      headers: ['a'],
      alignments: ['left'],
      rows: [['x']],
      eol: '\r\n'
    });
    const out = formatTable(model);
    assert.ok(out.includes('\r\n'), 'uses CRLF');
  });
});

suite('formatter: visualWidth', () => {
  test('ASCII width equals character length', () => {
    assert.strictEqual(visualWidth('hello'), 5);
  });

  test('CJK characters count as width 2', () => {
    assert.strictEqual(visualWidth('你好'), 4);
  });

  test('mixed ASCII and CJK', () => {
    assert.strictEqual(visualWidth('hi你'), 4);
  });
});
