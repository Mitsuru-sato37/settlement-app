# Specification entry point

This file is the stable specification entry point for cross-PC Codex work.

## Canonical sources

1. `README.md` — current product purpose, supported modes, persistence behavior, and initial exclusions.
2. `AGENTS.md` — implementation, verification, and cross-PC workflow rules.
3. `docs/STATUS.md` — current handoff state.

There is not yet a separate detailed product specification. Until one is added, the product behavior written in `README.md` is authoritative.

## Product baseline

The app is a React + TypeScript + Vite single-user settlement tool for private groups. It supports normal settlement, poker, mahjong, group gambling settlement, and full-payment roulette. Records are stored in browser `localStorage`, with JSON export/import for backup and migration.

The initial version excludes accounts, collaborative editing, server synchronization, cross-device synchronization, and actual payment execution.

## Update rule

If product behavior becomes large enough to require a dedicated specification, create one and reference it from this file instead of duplicating it.
