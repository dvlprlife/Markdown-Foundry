# CLAUDE.md

Rules for Claude Code (and any agent) working in this repository. The PR reviewer agent enforces these.

---

## GitHub workflow

Every change follows this lifecycle:

1. **Draft the issue first.** Before making any code changes, draft an issue title and body and show it to the user for review and approval. Do NOT call `gh issue create` until the user approves the draft. The issue body must be detailed enough that someone (or an agent) can work it independently — include:
   - **What** is changing
   - **Why** (motivation and any relevant context)
   - **Acceptance criteria** as a checklist
2. **Create the issue** only after approval: `gh issue create --title "..." --body "..."`.
3. **Create a branch off `main`** named `issue-{number}-short-description` (kebab-case, 2-4 words). Example: `issue-12-paste-image-windows`.
4. **Commit to that branch.** Subject line is a brief imperative ("add windows clipboard image handler"), not a paragraph. Include `Closes #{number}` in the commit body so the issue auto-closes on merge.
5. **Open a PR** with `gh pr create` referencing the issue. PR body opens with `## Summary` (1-3 bullets) and ends with `Closes #{number}`.

Hard rules:

- **Never push directly to `main`.** All changes land via pull request.
- **One PR per issue.** Don't bundle unrelated work.
- **No issue creation without user approval of the draft.** No exceptions.

The agent system in `agents/` picks up from step 3 onward — agents only work issues that already exist and are labeled (`agent` + `status: ready`). The draft-and-approve flow above is for interactive Claude Code sessions creating new issues, not for the planner / worker / reviewer agents that run autonomously against pre-labeled issues.

## TypeScript & build

Before committing, all of these must pass:

```
npx tsc --noEmit
node esbuild.js --production
npm test            # if you touched src/table/ or src/insert/
```

Strict-mode invariants (enforced by `tsconfig.json`):

- No `any` (implicit or explicit). If a type is genuinely unknown, use `unknown` and narrow.
- No unused locals or parameters. Delete them, don't prefix with `_`.
- All code paths return explicitly. No implicit `undefined` returns from typed functions.

If the type-checker or bundler fails, fix the root cause. Don't suppress with `// @ts-ignore` or `// eslint-disable`.

## Project conventions

These are non-negotiable:

- **Locate, don't parse.** Commands operate on the table at the cursor — never parse the whole document. Use `locator.ts` to find the table range, `parser.ts` to build a `TableModel`, `formatter.ts` to re-emit, then replace just that range.
- **Layer discipline.** `locator` / `parser` / `formatter` are pure (no `vscode` imports beyond types). Only files in `src/table/commands/` and `src/insert/` touch the editor.
- **Forward slashes in inserted Markdown.** When writing a path into the document, normalize with `path.relative(...).split(path.sep).join('/')`. Markdown rendered on non-Windows must work.
- **Stubs fail loudly.** A not-yet-implemented platform handler must throw with a clear message (e.g. `"saveClipboardImage: Linux/Wayland not yet supported"`), never silently no-op or return a fake success.
- **Tab/Shift-Tab/Enter gating.** Keybindings must include `markdownForge.inTable && !editorHasSelection && !suggestWidgetVisible` so default editor behavior is preserved outside tables and the suggest widget is not hijacked.

## Tests

- Any change to `src/table/parser.ts`, `src/table/formatter.ts`, `src/table/locator.ts`, or `src/insert/` requires a unit test in `src/test/suite/`.
- New table commands should have at least one integration-style test exercising the full parse → transform → format pipeline.
- Don't delete failing tests to make CI pass. Fix the code or the test, with a commit message that explains which.

## Code style

- **Default to no comments.** Only add a comment when the WHY is non-obvious (a hidden constraint, a workaround, behavior that would surprise a reader). Never explain WHAT — well-named identifiers do that.
- **No task/PR references in code comments** (`// added for issue #12`, `// fix from PR #34`). Those belong in the commit message and rot in the source.
- **No backwards-compat shims for code that hasn't shipped yet.** Just change it.

## Out of scope for v1

Don't add these without an issue + plan, even if asked inline:

- Smart lists, TOC generation, heading navigation, reflow (v2 features)
- Multi-line quoted CSV fields
- HTML tables or nested tables
- Switching `visualWidth` to a third-party library (planned for v1.1)

## Agent-specific notes

- The `agents/` folder defines the issue → PR lifecycle. Never modify those files as part of a feature PR — agent workflow changes go in their own PR.
- The `repo-check` agent owns label creation. Don't create labels by hand.
- If you (as the issue worker) cannot satisfy the acceptance criteria from the issue body and plan alone, stop and add a comment requesting clarification — don't guess.
