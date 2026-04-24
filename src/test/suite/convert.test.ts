import * as assert from 'assert';
import { parseCsv } from '../../table/commands/convert';

suite('convert: parseCsv', () => {
  test('parses a multi-line quoted field as a single row with embedded <br>', () => {
    const input = 'name,notes\n"Alice","line one\nline two"';
    const result = parseCsv(input);
    assert.deepStrictEqual(result, [
      ['name', 'notes'],
      ['Alice', 'line one<br>line two']
    ]);
  });

  test('preserves quoted commas inside a field', () => {
    const input = 'a,b\n"hello, world",value';
    const result = parseCsv(input);
    assert.deepStrictEqual(result, [
      ['a', 'b'],
      ['hello, world', 'value']
    ]);
  });

  test('unescapes doubled quotes inside a field', () => {
    const input = 'a,b\n"she said ""hi""",value';
    const result = parseCsv(input);
    assert.deepStrictEqual(result, [
      ['a', 'b'],
      ['she said "hi"', 'value']
    ]);
  });

  test('handles CRLF line endings the same as LF', () => {
    const input = 'a,b\r\n1,2\r\n3,4';
    const result = parseCsv(input);
    assert.deepStrictEqual(result, [
      ['a', 'b'],
      ['1', '2'],
      ['3', '4']
    ]);
  });
});
