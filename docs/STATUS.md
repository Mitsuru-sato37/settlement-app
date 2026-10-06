# Status

Status: Active cross-PC handoff entry point
Last updated: 2026-10-06

## Current state

- React + TypeScript + Vite application is present on `main`.
- Current documented modes: normal settlement, poker, mahjong, group gambling settlement, and full-payment roulette.
- Persistence is browser `localStorage` with JSON export/import; no account or cloud synchronization is part of the initial product.
- Cross-PC Codex handoff files and one-command Git sync visibility are now being standardized.

## Active branch

`main` after this workflow change is merged.

## Completed

- Added the standard Codex entry points: `AGENTS.md`, `docs/SPEC.md`, and `docs/STATUS.md`.
- Added `git-status.cmd` and `scripts/git-sync-status.ps1` for quick pull/push/merge visibility.

## Next

Continue product work from the current README-defined baseline. If the product specification expands materially, create a dedicated canonical product-spec document and reference it from `docs/SPEC.md`.

## Verification

Workflow/documentation change only. Confirm the five standard handoff/sync files exist on `main` after merge.

## Blockers / external dependencies

None for the repository handoff workflow.
