import * as assert from 'assert';
import { wrapInline, wrapFenced, wrapLinePrefix } from '../../format/toggle';

suite('format: wrapInline', () => {
  test('wraps plain text with the marker', () => {
    assert.strictEqual(wrapInline('hello', '**'), '**hello**');
  });

  test('unwraps text that is already wrapped', () => {
    assert.strictEqual(wrapInline('**hello**', '**'), 'hello');
  });

  test('does not falsely unwrap a single asterisk when marker is two', () => {
    // `*` is 1 char; `**` would require at least 4 chars to safely contain both ends.
    assert.strictEqual(wrapInline('*', '**'), '***');
  });

  test('wraps empty string with doubled markers', () => {
    assert.strictEqual(wrapInline('', '**'), '****');
  });

  test('strikethrough round-trips', () => {
    assert.strictEqual(wrapInline('text', '~~'), '~~text~~');
    assert.strictEqual(wrapInline('~~text~~', '~~'), 'text');
  });

  test('bold+italic (triple marker) round-trips', () => {
    assert.strictEqual(wrapInline('text', '***'), '***text***');
    assert.strictEqual(wrapInline('***text***', '***'), 'text');
  });
});

suite('format: wrapFenced', () => {
  test('wraps a single-line block with fences on their own lines', () => {
    assert.strictEqual(wrapFenced('print("hi")'), '```\nprint("hi")\n```');
  });

  test('wraps a multi-line block', () => {
    const input = 'line1\nline2\nline3';
    assert.strictEqual(wrapFenced(input), '```\nline1\nline2\nline3\n```');
  });

  test('unwraps an already-fenced block', () => {
    const input = '```\nprint("hi")\n```';
    assert.strictEqual(wrapFenced(input), 'print("hi")');
  });

  test('unwraps a fenced block with a language hint on the opening fence', () => {
    // Opening fence starts with ```, the language hint `ts` is part of the same line.
    const input = '```ts\nconst x = 1;\n```';
    assert.strictEqual(wrapFenced(input), 'const x = 1;');
  });

  test('wraps an empty string', () => {
    assert.strictEqual(wrapFenced(''), '```\n\n```');
  });
});

suite('format: wrapLinePrefix', () => {
  test('prefixes every non-empty line with the prefix', () => {
    const input = 'line1\nline2\nline3';
    assert.strictEqual(
      wrapLinePrefix(input, '> '),
      '> line1\n> line2\n> line3'
    );
  });

  test('unprefixes every line when all non-empty lines are prefixed', () => {
    const input = '> line1\n> line2\n> line3';
    assert.strictEqual(wrapLinePrefix(input, '> '), 'line1\nline2\nline3');
  });

  test('empty lines pass through the wrap path unchanged', () => {
    const input = 'first\n\nthird';
    assert.strictEqual(
      wrapLinePrefix(input, '> '),
      '> first\n\n> third'
    );
  });

  test('empty lines pass through the unwrap path unchanged', () => {
    const input = '> first\n\n> third';
    assert.strictEqual(
      wrapLinePrefix(input, '> '),
      'first\n\nthird'
    );
  });

  test('mixed prefix state forces the wrap path (adds prefix everywhere)', () => {
    // One line prefixed, one not → not all prefixed → add prefix to every line.
    // The already-prefixed line picks up a second prefix (nested quote).
    const input = '> already\nnew';
    assert.strictEqual(wrapLinePrefix(input, '> '), '> > already\n> new');
  });

  test('empty string stays empty', () => {
    assert.strictEqual(wrapLinePrefix('', '> '), '');
  });
});
