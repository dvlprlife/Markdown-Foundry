import * as assert from 'assert';
import * as vscode from 'vscode';
import { splitRow, parseAlignments, parseTableFromLines } from '../../table/parser';
import { formatTable } from '../../table/formatter';

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

  test('pads a short row and widens the table to fit an over-wide one', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a1 |', '| a2 | b2 | c2 |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.headers, ['A', 'B', '']);
    assert.deepStrictEqual(model.alignments, ['none', 'none', 'none']);
    assert.deepStrictEqual(model.rows, [
      ['a1', '', ''],
      ['a2', 'b2', 'c2']
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

suite('parser: widening to the widest row', () => {
  test('a body row past the last header column keeps every cell', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a | b | c | d |'],
      RANGE,
      '\n'
    );
    assert.strictEqual(model.headers.length, 4);
    assert.deepStrictEqual(model.headers, ['A', 'B', '', '']);
    assert.deepStrictEqual(model.alignments, ['none', 'none', 'none', 'none']);
    assert.deepStrictEqual(model.rows, [['a', 'b', 'c', 'd']]);
  });

  test('a separator wider than the header widens the table', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- | --- |', '| a | b |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.headers, ['A', 'B', '']);
    assert.deepStrictEqual(model.rows, [['a', 'b', '']]);
  });

  test('recovered columns are unaligned; the authored markers survive', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| :--- | ---: |', '| a | b | c |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.alignments, ['left', 'right', 'none']);
  });

  test('a pipeless over-wide row keeps every cell', () => {
    const model = parseTableFromLines(['a | b', '--- | ---', 'a1 | b1 | c1'], RANGE, '\n');
    assert.deepStrictEqual(model.headers, ['a', 'b', '']);
    assert.deepStrictEqual(model.rows, [['a1', 'b1', 'c1']]);
  });

  test('an over-wide row with no trailing pipe keeps every cell', () => {
    const model = parseTableFromLines(['| A | B |', '| --- | --- |', '| a | b | c'], RANGE, '\n');
    assert.deepStrictEqual(model.rows, [['a', 'b', 'c']]);
  });

  test('an over-wide row ending in an escaped pipe keeps every cell', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a | b | c \\|'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.rows, [['a', 'b', 'c |']]);
  });

  test('an escaped pipe inside a recovered cell is content, not a separator', () => {
    const model = parseTableFromLines(
      ['| A | B |', '| --- | --- |', '| a | b | c \\| d |'],
      RANGE,
      '\n'
    );
    assert.strictEqual(model.headers.length, 3);
    assert.deepStrictEqual(model.rows, [['a', 'b', 'c | d']]);
  });

  test('an indented over-wide table keeps its indent and its cells', () => {
    const model = parseTableFromLines(
      ['  | A | B |', '  | --- | --- |', '  | a | b | c |'],
      RANGE,
      '\n'
    );
    assert.strictEqual(model.indent, '  ');
    assert.deepStrictEqual(model.rows, [['a', 'b', 'c']]);
  });

  test('a table with both an over-wide row and a short row pads only the short one', () => {
    const model = parseTableFromLines(
      ['| A | B | C |', '| --- | --- | --- |', '| a1 |', '| a2 | b2 | c2 | d2 |'],
      RANGE,
      '\n'
    );
    assert.deepStrictEqual(model.headers, ['A', 'B', 'C', '']);
    assert.deepStrictEqual(model.rows, [
      ['a1', '', '', ''],
      ['a2', 'b2', 'c2', 'd2']
    ]);
  });
});

/** Edge-shaped tables: pipeless, unterminated, escaped pipes, indented, CRLF. */
const EDGE_SHAPES: Array<{ name: string; lines: string[]; eol: string }> = [
  { name: 'body wider than header', lines: ['| A | B |', '| --- | --- |', '| a | b | c | d |'], eol: '\n' },
  { name: 'separator wider than header', lines: ['| A | B |', '| --- | --- | --- |', '| a | b |'], eol: '\n' },
  {
    name: 'over-wide and short rows together',
    lines: ['| A | B | C |', '| --- | --- | --- |', '| a1 |', '| a2 | b2 | c2 | d2 |'],
    eol: '\n'
  },
  { name: 'pipeless', lines: ['a | b', '--- | ---', 'a1 | b1 | c1'], eol: '\n' },
  { name: 'no trailing pipe', lines: ['| A | B |', '| --- | --- |', '| a | b | c'], eol: '\n' },
  { name: 'trailing escaped pipe', lines: ['| A | B |', '| --- | --- |', '| a | b | c \\|'], eol: '\n' },
  {
    name: 'escaped pipe in a recovered cell',
    lines: ['| A | B |', '| --- | --- |', '| a | b | c \\| d |'],
    eol: '\n'
  },
  { name: 'indented', lines: ['  | A | B |', '  | --- | --- |', '  | a | b | c |'], eol: '\n' },
  { name: 'aligned markers', lines: ['| A | B |', '| :--- | ---: |', '| a | b | c |'], eol: '\n' },
  { name: 'CRLF', lines: ['| A | B |', '| --- | --- |', '| a | b | c |'], eol: '\r\n' },
  { name: 'CJK', lines: ['| 名前 |', '| --- |', '| 太郎 | 30 |'], eol: '\n' }
];

suite('parser: parse → format is lossless', () => {
  for (const { name, lines, eol } of EDGE_SHAPES) {
    test(`no cell is dropped: ${name}`, () => {
      const model = parseTableFromLines(lines, RANGE, eol);
      const columns = model.headers.length;

      assert.strictEqual(model.alignments.length, columns, 'one alignment per column');
      for (const row of model.rows) {
        assert.strictEqual(row.length, columns, 'every row is the table width');
      }

      // Every cell the author wrote is still in the model, in its own column.
      const authored = [lines[0], ...lines.slice(2)].map(splitRow);
      const modeled = [model.headers, ...model.rows];
      for (let i = 0; i < authored.length; i++) {
        assert.deepStrictEqual(
          modeled[i].slice(0, authored[i].length),
          authored[i],
          `row ${i} lost a cell`
        );
      }

      // Re-emitting and re-parsing yields the same model: format drops nothing
      // the parser recovered, and aligning twice changes nothing.
      const once = formatTable(model);
      const reparsed = parseTableFromLines(once.split(eol), RANGE, eol);
      assert.deepStrictEqual(reparsed.headers, model.headers, 'headers survive a round-trip');
      assert.deepStrictEqual(reparsed.rows, model.rows, 'rows survive a round-trip');
      assert.deepStrictEqual(
        reparsed.alignments,
        model.alignments,
        'alignments survive a round-trip'
      );
      assert.strictEqual(formatTable(reparsed), once, 'aligning is idempotent');
    });
  }
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
