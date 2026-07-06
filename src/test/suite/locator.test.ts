import * as assert from 'assert';
import * as vscode from 'vscode';
import { locateTable, cursorToTableCoords } from '../../table/locator';

function open(content: string): Thenable<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ language: 'markdown', content });
}

const SIMPLE = ['| A | B |', '| --- | --- |', '| 1 | 2 |', '| 3 | 4 |'].join('\n');

suite('locator: locateTable', () => {
  test('locates from the header line', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0);
    assert.ok(loc);
    assert.strictEqual(loc.headerLine, 0);
    assert.strictEqual(loc.separatorLine, 1);
    assert.strictEqual(loc.lastBodyLine, 3);
  });

  test('locates from the separator line', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 1);
    assert.ok(loc);
    assert.strictEqual(loc.headerLine, 0);
    assert.strictEqual(loc.lastBodyLine, 3);
  });

  test('locates from a body line', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 3);
    assert.ok(loc);
    assert.strictEqual(loc.headerLine, 0);
    assert.strictEqual(loc.separatorLine, 1);
    assert.strictEqual(loc.lastBodyLine, 3);
  });

  test('range spans header through last body line', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 2);
    assert.ok(loc);
    assert.strictEqual(loc.range.start.line, 0);
    assert.strictEqual(loc.range.start.character, 0);
    assert.strictEqual(loc.range.end.line, 3);
    assert.strictEqual(loc.range.end.character, doc.lineAt(3).text.length);
  });

  test('returns null on a plain-text line', async () => {
    const doc = await open(['intro text', SIMPLE].join('\n'));
    assert.strictEqual(locateTable(doc, 0), null);
  });

  test('returns null on the line directly above a table', async () => {
    const doc = await open(['above', '| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n'));
    assert.strictEqual(locateTable(doc, 0), null);
    assert.ok(locateTable(doc, 1));
  });

  test('returns null on the line directly below a table', async () => {
    const doc = await open(['| A | B |', '| --- | --- |', '| 1 | 2 |', 'below'].join('\n'));
    assert.ok(locateTable(doc, 2));
    assert.strictEqual(locateTable(doc, 3), null);
  });

  test('returns null on a blank line', async () => {
    const doc = await open(['| A | B |', '| --- | --- |', '| 1 | 2 |', '', 'text'].join('\n'));
    assert.strictEqual(locateTable(doc, 3), null);
  });

  test('returns null for a pipe row not followed by a separator', async () => {
    const doc = await open(['| just | pipes |', '| more | pipes |'].join('\n'));
    assert.strictEqual(locateTable(doc, 0), null);
  });

  test('locates a table with no trailing newline at end of document', async () => {
    const doc = await open(SIMPLE); // no trailing newline
    const loc = locateTable(doc, 3);
    assert.ok(loc);
    assert.strictEqual(loc.lastBodyLine, 3);
  });

  test('locates a header-plus-separator table with no body rows', async () => {
    const doc = await open(['| A | B |', '| --- | --- |'].join('\n'));
    const loc = locateTable(doc, 0);
    assert.ok(loc);
    assert.strictEqual(loc.separatorLine, 1);
    assert.strictEqual(loc.lastBodyLine, 1);
  });

  test('locates an indented table', async () => {
    const doc = await open(['  | A | B |', '  | --- | --- |', '  | 1 | 2 |'].join('\n'));
    const loc = locateTable(doc, 2);
    assert.ok(loc);
    assert.strictEqual(loc.headerLine, 0);
    assert.strictEqual(loc.lastBodyLine, 2);
  });

  test('locates a table with short separator markers (:-- / --: / :-:)', async () => {
    const doc = await open(['| A | B | C |', '| :-- | --: | :-: |', '| 1 | 2 | 3 |'].join('\n'));
    const loc = locateTable(doc, 0);
    assert.ok(loc);
    assert.strictEqual(loc.lastBodyLine, 2);
  });

  test('locates a table whose separator has no outer pipes', async () => {
    const doc = await open(['| A | B |', ':--- | ---:', '| 1 | 2 |'].join('\n'));
    const loc = locateTable(doc, 0);
    assert.ok(loc);
    assert.strictEqual(loc.separatorLine, 1);
    assert.strictEqual(loc.lastBodyLine, 2);
  });

  test('two tables with no blank line between are treated as one contiguous table', async () => {
    const doc = await open(
      [
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '| C | D |',
        '| --- | --- |',
        '| 3 | 4 |'
      ].join('\n')
    );
    const loc = locateTable(doc, 4);
    assert.ok(loc);
    assert.strictEqual(loc.headerLine, 0);
    assert.strictEqual(loc.separatorLine, 1);
    assert.strictEqual(loc.lastBodyLine, 5);
  });

  test('returns null for an out-of-range line number', async () => {
    const doc = await open(SIMPLE);
    assert.strictEqual(locateTable(doc, -1), null);
    assert.strictEqual(locateTable(doc, 999), null);
  });
});

suite('locator: cursorToTableCoords', () => {
  test('header row yields rowIndex -1', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(0, 3));
    assert.deepStrictEqual(coords, { rowIndex: -1, columnIndex: 0 });
  });

  test('separator row yields null', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    assert.strictEqual(cursorToTableCoords(doc, loc, new vscode.Position(1, 2)), null);
  });

  test('first body row yields rowIndex 0', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(2, 3));
    assert.deepStrictEqual(coords, { rowIndex: 0, columnIndex: 0 });
  });

  test('second body row yields rowIndex 1', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(3, 3));
    assert.deepStrictEqual(coords, { rowIndex: 1, columnIndex: 0 });
  });

  test('columnIndex reflects the cell the cursor is in', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(2, 7));
    assert.deepStrictEqual(coords, { rowIndex: 0, columnIndex: 1 });
  });

  test('escaped pipes are treated as content, not column separators', async () => {
    const doc = await open(['| a \\| b | c |', '| --- | --- |', '| x | y |'].join('\n'));
    const loc = locateTable(doc, 0)!;
    // 'c' sits at char 11, in the second column — the escaped pipe must not
    // have advanced the column count.
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(0, 11));
    assert.deepStrictEqual(coords, { rowIndex: -1, columnIndex: 1 });
  });

  test('cursor past the trailing pipe yields a column index past the last cell', async () => {
    const doc = await open(SIMPLE);
    const loc = locateTable(doc, 0)!;
    // Line "| 1 | 2 |" has two columns (0, 1); an offset past the final pipe
    // counts as column 2.
    const coords = cursorToTableCoords(doc, loc, new vscode.Position(2, 9));
    assert.deepStrictEqual(coords, { rowIndex: 0, columnIndex: 2 });
  });
});
