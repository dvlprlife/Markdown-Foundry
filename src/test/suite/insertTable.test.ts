import * as assert from 'assert';
import {
  buildEmptyTable,
  computePadding,
  validateDimension
} from '../../insert/insertTable';

suite('insertTable: buildEmptyTable', () => {
  test('2x2 has header + separator + 1 body row', () => {
    const out = buildEmptyTable(2, 2, 'left', '\n');
    const lines = out.split('\n');
    assert.strictEqual(lines.length, 3);
    assert.ok(lines[0].includes('Column 1'));
    assert.ok(lines[0].includes('Column 2'));
    assert.ok(lines[1].includes(':--'), 'separator uses left alignment marker');
  });

  test('1xN produces header + separator only (no body rows)', () => {
    const out = buildEmptyTable(1, 3, 'left', '\n');
    const lines = out.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('Column 3'));
  });

  test('center alignment produces :---: markers', () => {
    const out = buildEmptyTable(1, 2, 'center', '\n');
    const separator = out.split('\n')[1];
    assert.ok(/:-+:/.test(separator), `expected :---: in "${separator}"`);
  });

  test('right alignment produces ---: markers', () => {
    const out = buildEmptyTable(1, 2, 'right', '\n');
    const separator = out.split('\n')[1];
    assert.ok(/-+:/.test(separator), `expected ---: in "${separator}"`);
  });

  test('header text increments past Column 9 and Column 10', () => {
    const out = buildEmptyTable(1, 11, 'left', '\n');
    const header = out.split('\n')[0];
    assert.ok(header.includes('Column 9'));
    assert.ok(header.includes('Column 10'));
    assert.ok(header.includes('Column 11'));
  });

  test('CRLF eol is honored', () => {
    const out = buildEmptyTable(2, 2, 'left', '\r\n');
    assert.ok(out.includes('\r\n'));
  });

  test('all body cells start empty', () => {
    const out = buildEmptyTable(3, 2, 'left', '\n');
    const lines = out.split('\n');
    const bodyLines = lines.slice(2);
    assert.strictEqual(bodyLines.length, 2);
    for (const line of bodyLines) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      for (const cell of cells) {
        assert.strictEqual(cell, '', `body cell should be empty, got "${cell}"`);
      }
    }
  });
});

suite('insertTable: validateDimension', () => {
  test('accepts an integer in range', () => {
    assert.strictEqual(validateDimension('5', 'Rows', 1, 50), undefined);
  });

  test('rejects empty input', () => {
    const err = validateDimension('', 'Rows', 1, 50);
    assert.match(err ?? '', /required/);
  });

  test('rejects non-numeric input', () => {
    const err = validateDimension('abc', 'Rows', 1, 50);
    assert.match(err ?? '', /whole number/);
  });

  test('rejects decimals', () => {
    const err = validateDimension('2.5', 'Rows', 1, 50);
    assert.match(err ?? '', /whole number/);
  });

  test('rejects below min', () => {
    const err = validateDimension('0', 'Rows', 1, 50);
    assert.match(err ?? '', /at least 1/);
  });

  test('rejects above max', () => {
    const err = validateDimension('51', 'Rows', 1, 50);
    assert.match(err ?? '', /at most 50/);
  });

  test('rejects negatives', () => {
    const err = validateDimension('-3', 'Rows', 1, 50);
    assert.match(err ?? '', /at least 1/);
  });

  test('trims whitespace', () => {
    assert.strictEqual(validateDimension('  5  ', 'Rows', 1, 50), undefined);
  });
});

suite('insertTable: computePadding', () => {
  test('empty document produces no padding', () => {
    const { leading, trailing } = computePadding('', '', '\n');
    assert.strictEqual(leading, '');
    assert.strictEqual(trailing, '');
  });

  test('non-blank text immediately before requires two newlines of leading', () => {
    const { leading } = computePadding('hello', '', '\n');
    assert.strictEqual(leading, '\n\n');
  });

  test('non-blank text immediately after requires two newlines of trailing', () => {
    const { trailing } = computePadding('', 'hello', '\n');
    assert.strictEqual(trailing, '\n\n');
  });

  test('insertion at start of line after non-blank previous line needs one leading newline', () => {
    const { leading } = computePadding('hello\n', '', '\n');
    assert.strictEqual(leading, '\n');
  });

  test('insertion at start of line after blank previous line needs no leading', () => {
    const { leading } = computePadding('hello\n\n', '', '\n');
    assert.strictEqual(leading, '');
  });

  test('insertion before non-blank line needs two trailing newlines', () => {
    const { trailing } = computePadding('', 'world', '\n');
    assert.strictEqual(trailing, '\n\n');
  });

  test('insertion before line break followed by content needs one trailing newline', () => {
    const { trailing } = computePadding('', '\nworld', '\n');
    assert.strictEqual(trailing, '\n');
  });

  test('insertion before blank line followed by content needs no trailing newlines', () => {
    const { trailing } = computePadding('', '\n\nworld', '\n');
    assert.strictEqual(trailing, '');
  });

  test('insertion at end of document with single trailing newline needs no trailing', () => {
    const { trailing } = computePadding('', '\n', '\n');
    assert.strictEqual(trailing, '');
  });

  test('CRLF: two-newline gaps use \\r\\n boundaries', () => {
    const { leading, trailing } = computePadding('hello\r\n', '\r\nworld', '\r\n');
    assert.strictEqual(leading, '\r\n');
    assert.strictEqual(trailing, '\r\n');
  });

  test('between two paragraphs: cursor at start of "world" line needs leading and trailing pads', () => {
    const { leading, trailing } = computePadding('hello\n', 'world', '\n');
    assert.strictEqual(leading, '\n');
    assert.strictEqual(trailing, '\n\n');
  });
});
