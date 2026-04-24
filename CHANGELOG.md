# Change Log

All notable changes to the Markdown Foundry extension will be documented in this file. This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Table column alignment now uses the `string-width` library for width calculation, correctly handling ZWJ emoji sequences (e.g. 👨‍👩‍👧‍👦), combining marks, variation selectors, and the full East Asian Width table — previously a hand-rolled approximation under-counted width in some Unicode cases ([#53](https://github.com/dvlprlife/Markdown-Foundry/pull/53)).

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
