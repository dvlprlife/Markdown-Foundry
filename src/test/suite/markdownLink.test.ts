import * as assert from 'assert';
import { formatLinkDestination } from '../../insert/markdownLink';

suite('markdownLink: formatLinkDestination', () => {
  test('leaves a clean path unchanged', () => {
    assert.strictEqual(formatLinkDestination('images/hero.png'), 'images/hero.png');
  });

  test('wraps a path containing spaces', () => {
    assert.strictEqual(
      formatLinkDestination('My Documents/file.docx'),
      '<My Documents/file.docx>'
    );
  });

  test('wraps a path containing parentheses', () => {
    assert.strictEqual(formatLinkDestination('images/file (1).png'), '<images/file (1).png>');
  });

  test('escapes literal angle brackets inside a wrapped destination', () => {
    assert.strictEqual(formatLinkDestination('a <b> c'), '<a \\<b\\> c>');
  });

  test('leaves a clean URL unchanged', () => {
    assert.strictEqual(
      formatLinkDestination('https://example.com/foo'),
      'https://example.com/foo'
    );
  });

  test('wraps a URL containing parentheses', () => {
    assert.strictEqual(
      formatLinkDestination('https://en.wikipedia.org/wiki/Foo_(bar)'),
      '<https://en.wikipedia.org/wiki/Foo_(bar)>'
    );
  });
});
