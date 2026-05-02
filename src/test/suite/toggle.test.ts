import * as assert from 'assert';
import {
  wrapInline,
  wrapFenced,
  wrapLinePrefix,
  wrapHeading,
  adjustHeading,
  toggleBulletItem,
  toggleNumberedItem,
  toggleTaskItem
} from '../../format/toggle';

suite('format: wrapInline', () => {
  test('wraps plain text with the marker', () => {
    assert.strictEqual(wrapInline('hello', '**'), '**hello**');
  });

  test('unwraps text that is already wrapped', () => {
    assert.strictEqual(wrapInline('**hello**', '**'), 'hello');
  });

  test('does not falsely unwrap a single asterisk when marker is two', () => {
    // `*` is 1 char; `**` would require at least 4 chars to safely contain both ends.
    assert.strictEqual(wrapInline('*', '**'), '*****');
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

suite('format: wrapHeading', () => {
  test('adds heading at the requested level on a plain line', () => {
    assert.strictEqual(wrapHeading('Some text', 2), '## Some text');
  });

  test('toggles off when applied at the existing level', () => {
    assert.strictEqual(wrapHeading('## Some text', 2), 'Some text');
  });

  test('changes level when applied at a different existing level', () => {
    assert.strictEqual(wrapHeading('# Some text', 3), '### Some text');
  });

  test('strips leading whitespace from a non-heading line when adding a heading', () => {
    assert.strictEqual(wrapHeading('   leading spaces', 1), '# leading spaces');
  });

  test('level 0 removes any heading', () => {
    assert.strictEqual(wrapHeading('### Demoted', 0), 'Demoted');
  });

  test('level 0 on a non-heading line is effectively a leading-trim', () => {
    assert.strictEqual(wrapHeading('plain', 0), 'plain');
  });

  test('empty input', () => {
    assert.strictEqual(wrapHeading('', 1), '# ');
  });
});

suite('format: adjustHeading', () => {
  test('promotes H2 to H1', () => {
    assert.strictEqual(adjustHeading('## hi', -1), '# hi');
  });

  test('demotes H1 to H2', () => {
    assert.strictEqual(adjustHeading('# hi', 1), '## hi');
  });

  test('clamps at H1 (promote no-op)', () => {
    assert.strictEqual(adjustHeading('# hi', -1), '# hi');
  });

  test('clamps at H6 (demote no-op)', () => {
    assert.strictEqual(adjustHeading('###### hi', 1), '###### hi');
  });

  test('non-heading line is no-op', () => {
    assert.strictEqual(adjustHeading('plain text', -1), 'plain text');
    assert.strictEqual(adjustHeading('plain text', 1), 'plain text');
  });

  test('empty input is no-op', () => {
    assert.strictEqual(adjustHeading('', -1), '');
  });
});

suite('format: toggleTaskItem', () => {
  test('plain text becomes an unchecked task item', () => {
    assert.strictEqual(toggleTaskItem('do laundry'), '- [ ] do laundry');
  });

  test('unchecked task item becomes checked', () => {
    assert.strictEqual(toggleTaskItem('- [ ] do laundry'), '- [x] do laundry');
  });

  test('checked task item becomes unchecked', () => {
    assert.strictEqual(toggleTaskItem('- [x] do laundry'), '- [ ] do laundry');
  });

  test('plain bullet without checkbox becomes an unchecked task', () => {
    assert.strictEqual(toggleTaskItem('- bullet'), '- [ ] bullet');
  });

  test('preserves leading indentation when wrapping', () => {
    assert.strictEqual(toggleTaskItem('  do laundry'), '  - [ ] do laundry');
  });

  test('preserves leading indentation when toggling check state', () => {
    assert.strictEqual(toggleTaskItem('  - [ ] do laundry'), '  - [x] do laundry');
    assert.strictEqual(toggleTaskItem('  - [x] do laundry'), '  - [ ] do laundry');
  });
});

suite('format: toggleBulletItem', () => {
  test('plain line becomes a bullet', () => {
    assert.strictEqual(toggleBulletItem('hello'), '- hello');
  });

  test('bullet line is stripped', () => {
    assert.strictEqual(toggleBulletItem('- hello'), 'hello');
  });

  test('asterisk bullet is stripped (toggle-off accepts any bullet char)', () => {
    assert.strictEqual(toggleBulletItem('* hello'), 'hello');
  });

  test('plus bullet is stripped', () => {
    assert.strictEqual(toggleBulletItem('+ hello'), 'hello');
  });

  test('multi-line plain → all prefixed with `- `', () => {
    assert.strictEqual(
      toggleBulletItem('one\ntwo\nthree'),
      '- one\n- two\n- three'
    );
  });

  test('multi-line all-bulleted → all stripped', () => {
    assert.strictEqual(
      toggleBulletItem('- one\n- two\n- three'),
      'one\ntwo\nthree'
    );
  });

  test('mixed (some bulleted, some plain) → wrap path: every line gets `- `', () => {
    assert.strictEqual(
      toggleBulletItem('- foo\nbar'),
      '- - foo\n- bar'
    );
  });

  test('preserves leading indentation when stripping', () => {
    assert.strictEqual(toggleBulletItem('  - hello'), '  hello');
  });

  test('empty lines pass through unchanged on toggle-on', () => {
    assert.strictEqual(toggleBulletItem('foo\n\nbar'), '- foo\n\n- bar');
  });

  test('empty lines pass through unchanged on toggle-off', () => {
    assert.strictEqual(toggleBulletItem('- foo\n\n- bar'), 'foo\n\nbar');
  });
});

suite('format: toggleNumberedItem', () => {
  test('plain line becomes `1. line`', () => {
    assert.strictEqual(toggleNumberedItem('hello'), '1. hello');
  });

  test('three plain lines become `1.`/`2.`/`3.`', () => {
    assert.strictEqual(
      toggleNumberedItem('one\ntwo\nthree'),
      '1. one\n2. two\n3. three'
    );
  });

  test('numbered line is stripped', () => {
    assert.strictEqual(toggleNumberedItem('1. hello'), 'hello');
  });

  test('three numbered lines → all stripped', () => {
    assert.strictEqual(
      toggleNumberedItem('1. one\n2. two\n3. three'),
      'one\ntwo\nthree'
    );
  });

  test('preserves leading indentation when stripping', () => {
    assert.strictEqual(toggleNumberedItem('  1. hello'), '  hello');
  });

  test('indented lines preserve indent and increment globally', () => {
    assert.strictEqual(
      toggleNumberedItem('one\n  two\nthree'),
      '1. one\n  2. two\n3. three'
    );
  });

  test('empty lines pass through and do not consume a number', () => {
    assert.strictEqual(
      toggleNumberedItem('one\n\ntwo'),
      '1. one\n\n2. two'
    );
  });
});
