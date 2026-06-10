## Summary

<!-- 1-3 bullets: what this PR changes and why. -->

-

## Checklist

<!-- CI (.github/workflows/build.yml) runs the type check, production bundle, tests, and a vsce package smoke test on Linux/macOS/Windows. Run the same checks locally before pushing: -->

- [ ] `npx tsc --noEmit` passes
- [ ] `node esbuild.js --production` succeeds
- [ ] `npm test` passes (required if you touched `src/table/` or `src/insert/`; CI runs it on every PR)
- [ ] New/changed logic in `src/table/parser.ts`, `formatter.ts`, `locator.ts`, or `src/insert/` has unit tests in `src/test/suite/`
- [ ] `CHANGELOG.md` `[Unreleased]` updated if this is a user-visible change (new/changed commands, settings, keybindings, user-facing fixes) — not needed for refactors, tests, CI, or contributor docs
- [ ] `README.md` updated if this adds/removes/changes a user-discoverable command, setting, or keybinding
- [ ] One PR per issue; no unrelated changes bundled

Closes #<!-- issue number -->
