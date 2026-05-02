import * as assert from 'assert';
import {
  TOC_CLOSE_MARKER,
  TOC_OPEN_MARKER,
  TOCOptions,
  dedupeSlugs,
  extractHeadings,
  generateTOC,
  locateExistingTOC,
  slugify
} from '../../structure/toc';

const DEFAULT_OPTIONS: TOCOptions = {
  minDepth: 1,
  maxDepth: 6,
  indent: 2,
  includeMarkers: true
};

suite('toc: slugify', () => {
  test('lowercases and hyphenates whitespace', () => {
    assert.strictEqual(slugify('Hello World'), 'hello-world');
  });

  test('drops punctuation', () => {
    assert.strictEqual(slugify("Don't Repeat Yourself!"), 'dont-repeat-yourself');
  });

  test('preserves underscores and digits', () => {
    assert.strictEqual(slugify('foo_bar 123'), 'foo_bar-123');
  });

  test('collapses multiple spaces to single hyphen', () => {
    assert.strictEqual(slugify('a    b'), 'a-b');
  });

  test('returns empty string for non-alphanumeric input', () => {
    assert.strictEqual(slugify('???'), '');
  });

  test('trims surrounding whitespace', () => {
    assert.strictEqual(slugify('  hello  '), 'hello');
  });
});

suite('toc: dedupeSlugs', () => {
  test('first occurrence keeps base slug, subsequent get -N', () => {
    const result = dedupeSlugs([
      { level: 2, text: 'Setup', slug: 'setup' },
      { level: 2, text: 'Setup', slug: 'setup' },
      { level: 2, text: 'Setup', slug: 'setup' }
    ]);
    assert.deepStrictEqual(
      result.map((h) => h.slug),
      ['setup', 'setup-1', 'setup-2']
    );
  });

  test('preserves empty slugs without numbering', () => {
    const result = dedupeSlugs([
      { level: 2, text: '', slug: '' },
      { level: 2, text: '???', slug: '' }
    ]);
    assert.deepStrictEqual(
      result.map((h) => h.slug),
      ['', '']
    );
  });

  test('different slugs are independent counters', () => {
    const result = dedupeSlugs([
      { level: 2, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' },
      { level: 2, text: 'A', slug: 'a' }
    ]);
    assert.deepStrictEqual(
      result.map((h) => h.slug),
      ['a', 'b', 'a-1']
    );
  });
});

suite('toc: extractHeadings', () => {
  test('extracts single heading at each depth', () => {
    const result = extractHeadings('# A\n## B\n### C');
    assert.deepStrictEqual(result, [
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' },
      { level: 3, text: 'C', slug: 'c' }
    ]);
  });

  test('skips headings inside backtick fenced code blocks', () => {
    const text = '# Real\n```\n# Fake\n```\n## Another Real';
    const result = extractHeadings(text);
    assert.deepStrictEqual(
      result.map((h) => h.text),
      ['Real', 'Another Real']
    );
  });

  test('skips headings inside tilde fenced code blocks', () => {
    const text = '# Real\n~~~\n# Fake\n~~~\n## Another Real';
    const result = extractHeadings(text);
    assert.deepStrictEqual(
      result.map((h) => h.text),
      ['Real', 'Another Real']
    );
  });

  test('skips headings inside multi-line HTML comments', () => {
    const text = '# Real\n<!--\n# Fake\n-->\n## Another Real';
    const result = extractHeadings(text);
    assert.deepStrictEqual(
      result.map((h) => h.text),
      ['Real', 'Another Real']
    );
  });

  test('handles inline HTML comments on the same line', () => {
    const text = '# Heading <!-- side note --> Trailing\n## Body';
    const result = extractHeadings(text);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].level, 1);
    assert.strictEqual(result[1].text, 'Body');
  });

  test('deduplicates repeated heading text via slug suffix', () => {
    const text = '## Setup\n## Setup\n## Setup';
    const result = extractHeadings(text);
    assert.deepStrictEqual(
      result.map((h) => h.slug),
      ['setup', 'setup-1', 'setup-2']
    );
  });

  test('handles CRLF line endings', () => {
    const result = extractHeadings('# A\r\n## B');
    assert.deepStrictEqual(
      result.map((h) => h.level),
      [1, 2]
    );
  });

  test('ignores lines that look like headings but lack the space', () => {
    const result = extractHeadings('#NotAHeading\n# Real');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'Real');
  });
});

suite('toc: generateTOC', () => {
  test('renders nested list with default markers and indent', () => {
    const headings = [
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' },
      { level: 3, text: 'C', slug: 'c' }
    ];
    const out = generateTOC(headings, DEFAULT_OPTIONS);
    const expected = [
      TOC_OPEN_MARKER,
      '- [A](#a)',
      '  - [B](#b)',
      '    - [C](#c)',
      TOC_CLOSE_MARKER
    ].join('\n');
    assert.strictEqual(out, expected);
  });

  test('respects minDepth filter and indents from minDepth', () => {
    const headings = [
      { level: 1, text: 'Skip', slug: 'skip' },
      { level: 2, text: 'A', slug: 'a' },
      { level: 3, text: 'B', slug: 'b' }
    ];
    const out = generateTOC(headings, { ...DEFAULT_OPTIONS, minDepth: 2 });
    assert.ok(!out.includes('- [Skip]'), 'H1 filtered');
    assert.ok(out.includes('- [A](#a)'));
    assert.ok(out.includes('  - [B](#b)'));
  });

  test('respects maxDepth filter', () => {
    const headings = [
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' },
      { level: 4, text: 'Skip', slug: 'skip' }
    ];
    const out = generateTOC(headings, { ...DEFAULT_OPTIONS, maxDepth: 2 });
    assert.ok(!out.includes('Skip'));
    assert.ok(out.includes('A'));
    assert.ok(out.includes('B'));
  });

  test('skips headings with empty slugs', () => {
    const headings = [
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: '???', slug: '' }
    ];
    const out = generateTOC(headings, DEFAULT_OPTIONS);
    assert.ok(out.includes('- [A](#a)'));
    assert.ok(!out.includes('???'));
  });

  test('without markers produces only the list', () => {
    const headings = [{ level: 1, text: 'A', slug: 'a' }];
    const out = generateTOC(headings, { ...DEFAULT_OPTIONS, includeMarkers: false });
    assert.strictEqual(out, '- [A](#a)');
  });

  test('empty filtered set with markers returns just the marker pair', () => {
    const out = generateTOC([], DEFAULT_OPTIONS);
    assert.strictEqual(out, `${TOC_OPEN_MARKER}\n${TOC_CLOSE_MARKER}`);
  });

  test('empty filtered set without markers returns empty string', () => {
    const out = generateTOC([], { ...DEFAULT_OPTIONS, includeMarkers: false });
    assert.strictEqual(out, '');
  });

  test('custom indent width', () => {
    const headings = [
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' }
    ];
    const out = generateTOC(headings, { ...DEFAULT_OPTIONS, indent: 4 });
    assert.ok(out.includes('    - [B](#b)'));
  });
});

suite('toc: locateExistingTOC', () => {
  test('returns range for an existing TOC block', () => {
    const text = `intro\n${TOC_OPEN_MARKER}\n- [A](#a)\n${TOC_CLOSE_MARKER}\noutro`;
    const range = locateExistingTOC(text);
    assert.ok(range !== undefined);
    assert.strictEqual(text.slice(range.startOffset, range.endOffset).startsWith(TOC_OPEN_MARKER), true);
    assert.strictEqual(text.slice(range.startOffset, range.endOffset).endsWith(TOC_CLOSE_MARKER), true);
  });

  test('returns undefined when no markers present', () => {
    assert.strictEqual(locateExistingTOC('just text'), undefined);
  });

  test('returns undefined when only the open marker is present', () => {
    assert.strictEqual(locateExistingTOC(`text ${TOC_OPEN_MARKER} more`), undefined);
  });
});
