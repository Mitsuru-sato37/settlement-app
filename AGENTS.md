# Project instructions

## Source of truth

Before implementation, read in this order:

1. `README.md`
2. `docs/SPEC.md`
3. `docs/STATUS.md`

The current README defines the initial product behavior until a dedicated product specification is added. Do not invent cloud sync, accounts, real payment processing, or collaborative editing unless explicitly requested.

## Product invariants

- The app is for private-group settlement and game-result settlement.
- Initial persistence is browser `localStorage`; "saved" does not mean cloud-backed up.
- JSON import replaces stored records only after the app's confirmation flow.
- Do not display settlement transfers when totals are inconsistent or required inputs are invalid.
- Initial supported modes are normal settlement, poker, mahjong, group gambling settlement, and full-payment roulette as documented in `README.md`.
- The first version does not perform real payments or provide account/cloud synchronization.

## Development

The project uses React + TypeScript + Vite.

Relevant checks:

```bash
npm test
npm run typecheck
npm run build
```

Run the narrowest relevant checks first, then the full relevant set before reporting behavior changes complete.

## Cross-PC Codex handoff standard

This repository must remain resumable from another PC without relying on Codex chat history or uncommitted local files.

At the start of every meaningful session, read:

1. `AGENTS.md`
2. `docs/SPEC.md`
3. `docs/STATUS.md`

GitHub is the shared source of truth across PCs. Preserve unrelated local changes, fetch before resuming, use coherent branches for coherent work, and commit/push before handing work to another PC.

Before ending a meaningful session, update `docs/STATUS.md` with:

- active branch;
- completed work;
- next work;
- verification performed;
- blockers / external dependencies.

Codex conversation history is optional context only.

## Quick Git sync check

On Windows, run this from the repository root at the start of work and before handing work to another PC:

```powershell
.\git-status.cmd
```

It fetches `origin` and reports the current branch, uncommitted changes, whether pull or push is needed, and whether the current feature branch is merged into `main`. If GitHub CLI (`gh`) is available, PR state is used for a more precise merge result; otherwise Git history/patch equivalence is used as a fallback.
