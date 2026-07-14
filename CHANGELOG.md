# Change Log

All notable changes to the Markdown Foundry extension will be documented in this file. This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `markdownFoundry.alignOnEdit` (default `false`) — set it to `true` to restore the previous behavior of re-aligning the whole table after every table editing command ([#136](https://github.com/dvlprlife/Markdown-Foundry/pull/136)).

### Changed

- Table editing commands no longer re-align the whole table. Insert/Delete/Move Row or Column, Sort Table by Column, and the row added by `Tab` or `Enter` at the end of a table now edit surgically and leave the padding of every untouched cell exactly as it was — an inserted row mirrors its neighbor's cell widths, and an inserted column adds an empty `|  |` cell. Align explicitly with `Align Table` (`Shift+Alt+T`), or opt back in with `markdownFoundry.alignOnEdit` ([#136](https://github.com/dvlprlife/Markdown-Foundry/pull/136)).

### Fixed

- Aligning a table no longer discards body cells that sit past the last header column. `Align Table`, `markdownFoundry.alignOnSave`, and edits made with `markdownFoundry.alignOnEdit` now widen the table to fit the widest row — the header and separator grow empty, unaligned (`---`) columns instead of the extra cells being silently deleted ([#138](https://github.com/dvlprlife/Markdown-Foundry/pull/138)).
- `Move Column Left` no longer throws when the cursor sits in a cell past the header's last column (possible when a body row has more cells than the header) — it is now a no-op, like `Move Column Right` already was ([#136](https://github.com/dvlprlife/Markdown-Foundry/pull/136)).
- `Delete Column` with the cursor in a cell past the header's last column no longer rewrites the table — there is no column there to delete, so it no longer dirties the buffer or pushes an undo step ([#136](https://github.com/dvlprlife/Markdown-Foundry/pull/136)).

## [0.6.0] - 2026-07-07

### Changed

- Align Table moved from `Ctrl/Cmd+Shift+T` to `Shift+Alt+T` so it no longer shadows VS Code's Reopen Closed Editor in Markdown files ([#133](https://github.com/dvlprlife/Markdown-Foundry/pull/133)).

### Fixed

- `Sort Table by Column` now shows an explanatory message when invoked with the cursor on the separator row, instead of doing nothing silently ([#104](https://github.com/dvlprlife/Markdown-Foundry/pull/104)).
- Table-cell `Tab` navigation no longer overrides accepting an inline suggestion (e.g. Copilot ghost text) — the keybinding now also requires `!inlineSuggestionVisible` ([#105](https://github.com/dvlprlife/Markdown-Foundry/pull/105)).
- Tab-selecting a cell in a right- or center-aligned column now selects only the cell's content, not the surrounding alignment padding — so typing over the selection no longer eats the padding and misaligns the table ([#106](https://github.com/dvlprlife/Markdown-Foundry/pull/106)).
- `Paste Image` no longer silently overwrites an existing image when the generated filename collides (e.g. two pastes within the same second) — it now appends `-1`, `-2`, … until the name is free ([#108](https://github.com/dvlprlife/Markdown-Foundry/pull/108)).
- `Insert Link to File`, `Paste Link`, and `Paste Image` now wrap link destinations containing spaces or parentheses in angle brackets (`[text](<my file.docx>)`), so links to such paths render correctly instead of producing broken Markdown ([#109](https://github.com/dvlprlife/Markdown-Foundry/pull/109)).
- `Toggle Task List Item` now recognizes `*` and `+` bullets, cycling them in place (`* item` → `* [ ] item` → `* [x] item`) instead of mangling them into `- [ ] * item` ([#126](https://github.com/dvlprlife/Markdown-Foundry/pull/126)).
- Heading toggle and promote/demote now recognize headings indented by 1–3 spaces (valid CommonMark) — toggling `  ## Title` removes or swaps the heading instead of producing `## ## Title`, and promote/demote no longer silently no-op on indented headings. Lines indented 4+ spaces are still treated as code, not headings ([#127](https://github.com/dvlprlife/Markdown-Foundry/pull/127)).
- `Insert Horizontal Rule` no longer turns the current line into a setext heading — a blank line now separates the text from the inserted `---`, and the insertion respects the document's line endings (CRLF documents get `\r\n`) ([#128](https://github.com/dvlprlife/Markdown-Foundry/pull/128)).
- Multi-line formatting toggles (blockquote, block code, bullet/numbered/task list) no longer rewrite CRLF line endings to LF — the replaced lines now keep the document's line endings ([#129](https://github.com/dvlprlife/Markdown-Foundry/pull/129)).
- Table row/column commands now reposition the cursor to follow the edit: `Move Row/Column` keeps the caret on the moved row or column (so repeated invocations keep moving the same content instead of ping-ponging), `Insert Row/Column` places it in the new row or column, and `Delete Row/Column` clamps it to what remains ([#130](https://github.com/dvlprlife/Markdown-Foundry/pull/130)).
- `Insert/Update Table of Contents` no longer drops or mis-anchors non-ASCII headings — Unicode letters and numbers (e.g. `Überblick`, `概要`) are now kept in slugs, matching GitHub's anchor algorithm ([#131](https://github.com/dvlprlife/Markdown-Foundry/pull/131)).
- Table commands now recognize GFM rows without leading/trailing pipes (`a | b`) — previously such a row ended the table, so Align, Tab navigation, and the in-table context stopped working partway down the table ([#132](https://github.com/dvlprlife/Markdown-Foundry/pull/132)).

## [0.5.0] - 2026-05-09

### Added

- Editor context submenu listing all Markdown Foundry commands, grouped by Inline / Block / Heading / Insert / Table; the Table group only appears when the cursor is inside a table ([#100](https://github.com/dvlprlife/Markdown-Foundry/pull/100)).
- `Insert Link to File` command — pick any workspace file from a quick-pick (current-folder-first, alphabetical) and insert a relative-path link at the cursor. Image files become `![alt](path)`, everything else `[text](path)`; selection (when present) is used as the link text. Palette-only ([#85](https://github.com/dvlprlife/Markdown-Foundry/pull/85)).

### Changed

- `Toggle Task List Item` now applies to every non-empty line in a multi-line selection, matching the behavior of `Toggle Bullet List` and `Toggle Numbered List`. With no selection, behavior is unchanged — the cursor's line is cycled. ([#99](https://github.com/dvlprlife/Markdown-Foundry/pull/99))
- `Paste Link` now also accepts absolute file paths and `file://` URIs from the clipboard, inserting them as relative-path links. Image extensions (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`) are inserted as `![alt](path)`; everything else as `[text](path)`. Non-existent paths are rejected so typos don't sneak in. ([#84](https://github.com/dvlprlife/Markdown-Foundry/pull/84))

## [0.4.0] - 2026-05-02

### Added

- `Insert Table` command — pick from preset sizes (2×2 through 5×4) or enter custom dimensions to insert a pre-aligned Markdown table at the cursor. Header cells default to `Column 1`, `Column 2`, … with the first cell selected for immediate editing. Palette-only ([#75](https://github.com/dvlprlife/Markdown-Foundry/pull/75)).
- `Toggle Bullet List` and `Toggle Numbered List` commands — plain lines become `- ` bullets or `1.`, `2.`, `3.`… numbered items; re-invoke to strip the prefixes. Indentation preserved for nested lists. Palette-only ([#78](https://github.com/dvlprlife/Markdown-Foundry/pull/78)).
- `Insert/Update Table of Contents` command — generates a nested Markdown TOC from the document's headings and wraps it in `<!-- markdownfoundry-toc -->` / `<!-- /markdownfoundry-toc -->` markers so subsequent invocations update in place rather than duplicate. Headings inside fenced code blocks and HTML comments are skipped. GitHub-compatible slug generation (with `-1`, `-2` suffixes for duplicates). Configurable depth filter and indent via four new `markdownFoundry.toc.*` settings ([#79](https://github.com/dvlprlife/Markdown-Foundry/pull/79)).

## [0.3.0] - 2026-04-25

### Added

- Formatting toggles (round 2): inline code, heading levels 1–6, promote/demote heading, task list checkbox cycle, and insert horizontal rule. Palette-only access; no default keybindings ([#65](https://github.com/dvlprlife/Markdown-Foundry/pull/65)).
- Formatting toggles: bold (`Ctrl/Cmd+B`), italic (`Ctrl/Cmd+I`), bold+italic, blockquote, block code (fenced), strikethrough. Wrap the selection or insert empty markers at the cursor ([#58](https://github.com/dvlprlife/Markdown-Foundry/pull/58)).
- `Convert Selection to Table` now handles CSV data with multi-line quoted fields — embedded newlines become `<br>` so the resulting Markdown table cell renders on one line while preserving the line break visually ([#56](https://github.com/dvlprlife/Markdown-Foundry/pull/56)).

### Changed

- Demo GIFs refreshed for higher quality and added new ones covering the command palette overview, bold toggle, heading toggles, and task list cycle — 7 GIFs total at ~4.6 MB combined ([#66](https://github.com/dvlprlife/Markdown-Foundry/pull/66)).
- README Features list gains a Formatting subsection describing the new bold / italic / blockquote / block code / strikethrough toggles; Keybindings table lists `Ctrl/Cmd+B` and `Ctrl/Cmd+I` ([#60](https://github.com/dvlprlife/Markdown-Foundry/pull/60)).
- Tab, Shift+Tab, and Enter navigation inside a table now selects the destination cell's contents (Excel-style) so typing replaces the cell, and another Tab advances to the next cell instead of inserting a literal tab character. Empty cells still get a collapsed cursor position ([#57](https://github.com/dvlprlife/Markdown-Foundry/pull/57)).
- Table column alignment now uses the `string-width` library for width calculation, correctly handling ZWJ emoji sequences (e.g. 👨‍👩‍👧‍👦), combining marks, variation selectors, and the full East Asian Width table — previously a hand-rolled approximation under-counted width in some Unicode cases ([#53](https://github.com/dvlprlife/Markdown-Foundry/pull/53)).
- README Paste Image description updated: drops the stale "Windows only" note (macOS and Linux both shipped in 0.2.0) and adds a Linux dependency note for `xclip` / `wl-clipboard` ([#55](https://github.com/dvlprlife/Markdown-Foundry/pull/55)).

## [0.2.1] - 2026-04-23

### Fixed

- Table commands (align, sort, insert/delete/move row/column) now recognize tables with short separator markers such as `:--` or `--:`. The locator regex previously required 3+ dashes per column, silently rejecting valid GFM tables that use 1- or 2-dash separators ([#49](https://github.com/dvlprlife/Markdown-Foundry/pull/49)).

## [0.2.0] - 2026-04-23

### Added

- Paste Image on macOS — shells out to `osascript` to pull the PNG from the pasteboard ([#42](https://github.com/dvlprlife/Markdown-Foundry/pull/42)).
- Paste Image on Linux — detects `XDG_SESSION_TYPE` and dispatches to `wl-paste` (Wayland) or `xclip` (X11); includes install-hint errors when the helper binary is missing ([#43](https://github.com/dvlprlife/Markdown-Foundry/pull/43)).

## [0.1.1] - 2026-04-23

### Changed

- Marketplace keywords refreshed for discoverability: added `csv`, `tsv`, `align`, `sort`, `navigation`, `gfm`, `editor`; removed `md` and `authoring` ([#41](https://github.com/dvlprlife/Markdown-Foundry/pull/41)).

## [0.1.0] - 2026-04-23

Initial public release.

### Added

- Align table command (`Ctrl+Shift+T` / `Cmd+Shift+T`).
- Align all tables in document on save (opt-in via `markdownFoundry.alignOnSave`).
- Insert, delete, and move row and column commands.
- Sort table by column (ascending / descending, with automatic numeric detection).
- Convert selection to table from CSV or TSV data.
- Tab / Shift+Tab navigation between table cells; Enter moves to the next row and creates one at the end of the table if needed.
- Paste Link: wraps the current selection or prompts for text using a URL from the clipboard.
- Paste Image on Windows — saves the clipboard image under a configurable folder and inserts a Markdown image reference (macOS and Linux added in 0.2.0).
