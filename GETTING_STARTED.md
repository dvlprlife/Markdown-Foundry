# Getting Started with Markdown Forge

This is a working starter project. Here's how to run it, then how to extend it.

## Run the extension locally

```bash
npm install
npm run compile
```

Then press **F5** in VS Code. This opens an Extension Development Host — a second VS Code window with your extension loaded. Open any Markdown file with a table and try:

- Place the cursor inside a table, open the Command Palette, run **Markdown Forge: Align Table**.
- Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on macOS) as a shortcut.
- Press `Tab` inside a table cell — you should jump to the next cell.
- Select CSV text and run **Markdown Forge: Convert Selection to Table**.

## Run the tests

```bash
npm test
```

This launches a headless VS Code instance and runs the test suites under `src/test/`.

## Project structure

```
src/
  extension.ts              entry point; registers all commands
  table/
    types.ts                TableModel and shared types
    locator.ts              find the table containing a cursor line
    parser.ts               parse located lines into a TableModel
    formatter.ts            serialize TableModel back to aligned Markdown
    commands/
      align.ts              align the table at cursor (fully implemented)
      rowColumn.ts          insert/delete/move rows and columns
      navigate.ts           Tab / Shift-Tab / Enter handlers
      sort.ts               sort rows by column
      convert.ts            CSV/TSV selection to table
  insert/
    link.ts                 paste clipboard URL as Markdown link
    image.ts                paste clipboard image (platform handlers stubbed)
  util/
    contextKey.ts           sync markdownForge.inTable context key
  test/
    suite/                  Mocha test suites
```

## What's left to finish for v1 publish

1. **Wire up `saveClipboardImage` in `src/insert/image.ts`** for Windows, macOS, and Linux. The function signature and call sites are already in place — only the platform shell-outs are missing.

2. **Pick a real publisher ID.** Replace `"your-publisher-id"` in `package.json` with your VS Code Marketplace publisher name (create one at <https://aka.ms/vscode-create-publisher>).

3. **Replace the repository URL** in `package.json` with your actual GitHub URL.

4. **Add an icon.** Drop a 128×128 PNG at `images/icon.png` (referenced from `package.json`).

5. **Record GIFs for the README.** The marketplace listing is dramatically more effective with 2-3 short GIFs demonstrating align, navigate-with-Tab, and convert-CSV. Use a tool like [Peek](https://github.com/phw/peek) or macOS Screenshot.

6. **Publish.**
   ```bash
   npm install -g @vscode/vsce
   vsce login your-publisher-id
   vsce publish
   ```

## Build order I'd recommend

The align command is the only one fully exercised end-to-end. As you work through the others, follow this order — each step builds on what the previous verified:

1. Run the align command (confirms parser + formatter + locator + edit pipeline).
2. Try `insertRowBelow` and `insertColumnRight` — simplest of the structural commands.
3. Try Tab navigation — confirms the `markdownForge.inTable` context key is wiring up correctly.
4. `sortByColumn` — adds QuickPick UX.
5. `convertSelectionToTable` — different entry point (uses selection, not cursor).
6. `pasteLink` — different again (uses clipboard).
7. `pasteImage` platform handlers — the last and most platform-specific piece.

## Known limitations to address post-v1

- The visual-width table (CJK detection) is a simplified approximation. For perfect alignment with exotic Unicode, switch to the `string-width` package or `Intl.Segmenter` + a proper East Asian Width table.
- The CSV parser handles quoted fields but not multi-line quoted fields.
- Tab navigation doesn't currently select the cell contents — it just places the cursor at the start. Selecting cell contents is a nice v1.1 addition.
