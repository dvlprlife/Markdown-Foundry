# Change Log

All notable changes to the Markdown Foundry extension will be documented in this file.

## [0.1.0] - Unreleased

### Added

- Align table command (`Ctrl+Shift+T` / `Cmd+Shift+T`)
- Align all tables in document on save (opt-in via `markdownForge.alignOnSave`)
- Insert/delete/move row and column commands
- Sort table by column (ascending/descending, numeric detection)
- Convert CSV/TSV selection to Markdown table
- Tab / Shift+Tab navigation between table cells
- Enter to move to the next row (creates a new row at end of table)
- Paste Link: wrap selection with a clipboard URL
- Paste Image: save clipboard image and insert reference (platform handlers are stubbed — see src/insert/image.ts)
