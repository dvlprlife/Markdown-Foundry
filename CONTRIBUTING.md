# Contributing to Markdown Foundry

Thanks for your interest in contributing! This document covers setup, the build/test commands, and how changes flow from issue to merged PR in this repository.

## Prerequisites

- Node.js 20.x (what CI uses)
- Visual Studio Code 1.85 or later

## Setup

```sh
git clone https://github.com/dvlprlife/Markdown-Foundry.git
cd Markdown-Foundry
npm ci
```

## Build, lint, test

| Command | What it does |
| --- | --- |
| `npm run check-types` | Type check (`tsc --noEmit`) |
| `npm run compile` | Type check + compile to `dist/` + esbuild bundle |
| `npm run watch` | Watch mode (esbuild + tsc in parallel) |
| `npm run lint` | ESLint over `src/` |
| `npm test` | Runs the test suite via `vscode-test` (downloads a VS Code build on first run). `pretest` compiles and lints first. |
| `node esbuild.js --production` | Production bundle (what CI and packaging use) |

Before committing, all of these must pass (see [CLAUDE.md](CLAUDE.md)):

```sh
npx tsc --noEmit
node esbuild.js --production
npm test            # required if you touched src/table/ or src/insert/
```

## Running the extension

Open the repo in VS Code and press `F5` (the **Run Extension** launch configuration). It compiles automatically and opens an Extension Development Host with the extension loaded. The **Extension Tests** launch configuration runs the test suite under the debugger.

## Issue → PR workflow

Every change starts with a GitHub issue:

1. **Open an issue first** using the issue forms. The body should say **what** is changing, **why**, and include **acceptance criteria** as a checklist — detailed enough that someone else could work it independently.
2. **Branch off `main`**, named `issue-{number}-short-description` (kebab-case, 2-4 words), e.g. `issue-12-paste-image-windows`.
3. **Commit** with a brief imperative subject line and `Closes #{number}` in the commit body.
4. **Open a PR** whose body starts with `## Summary` (1-3 bullets) and ends with `Closes #{number}`.

Hard rules:

- Never push directly to `main` — all changes land via pull request.
- One PR per issue; don't bundle unrelated work.

Note: this repo also has an automated agent pipeline (see [`agents/WORKFLOW.md`](agents/WORKFLOW.md)) that processes issues labeled `agent` + `status: *`. Those labels are applied by maintainers — as a contributor you don't need to set them, and please don't modify files under `agents/` in a feature PR.

## What CI checks

`.github/workflows/build.yml` runs on every PR and push to `main`, on Linux, macOS, and Windows:

- `npm ci`
- `npx tsc --noEmit`
- `node esbuild.js --production`
- `npm test` (under `xvfb-run` on Linux)
- `npx @vscode/vsce package` smoke test (Linux only)

## Tests

- Any change to `src/table/parser.ts`, `src/table/formatter.ts`, `src/table/locator.ts`, or `src/insert/` requires a unit test in `src/test/suite/`.
- New table commands should have at least one integration-style test exercising the full parse → transform → format pipeline.
- Don't delete failing tests to make CI pass — fix the code or the test.

## CHANGELOG and README

- **User-visible changes** (new/changed commands, settings, keybindings, user-facing bug fixes) need an entry under `## [Unreleased]` in `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format). Refactors, test-only changes, CI, and contributor docs don't.
- **User-discoverable changes** (commands, settings, keybindings added/removed/changed) must update `README.md` in the same PR — it is the Marketplace listing and always describes current `main`.

## Code conventions

[CLAUDE.md](CLAUDE.md) is the authoritative rules file (the PR reviewer enforces it). Highlights:

- Strict TypeScript: no `any`, no unused locals/params, explicit returns. Don't suppress with `// @ts-ignore` or `// eslint-disable`.
- **Locate, don't parse**: table commands operate on the table at the cursor via `locator.ts` → `parser.ts` → `formatter.ts`, replacing only that range.
- **Layer discipline**: `locator`/`parser`/`formatter` are pure; only `src/table/commands/` and `src/insert/` touch the editor.
- Use forward slashes in Markdown paths inserted into documents.
- Comments only for non-obvious *why*, never *what*; no issue/PR references in code comments.
