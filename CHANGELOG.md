# Change Log

All notable changes to the Markdown Foundry extension will be documented in this file. This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
