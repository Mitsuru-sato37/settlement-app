# Settlement Result Image Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator share or save one PNG containing every final balance and transfer for a confirmed normal, poker, mahjong, or noriumi case.

**Architecture:** Render a dedicated image from the same balances and transfers shown in `ResultPanel`; keep layout/rendering, native file sharing, and UI lifecycle separate. Prepare the PNG when the valid result changes so the click handler can call the native share API immediately; reject stale images after edits or case switches.

**Tech Stack:** React, TypeScript, Vitest, jsdom, browser Canvas 2D, `navigator.canShare` / `navigator.share`, Blob download. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-16-settlement-result-image-sharing-design.md`

## Global Constraints

- Share one PNG for normal, poker, mahjong, and noriumi; exclude roulette.
- Include case title, mode, image creation time, all participant balances, all transfers, and an explicit zero-transfer message. Exclude source entries, forms, buttons, and avatars.
- Keep existing calculations, localStorage schema, and result validity gates unchanged. Do not publish data to an app server or generate a shared URL.
- Invalid drafts, empty participant lists, calculation issues, and nonzero differences cannot produce a confirmed image.
- Native sharing passes the PNG file from a user click; unsupported file sharing offers PNG download. Cancellation is not an error.

## Review Focus

1. An edit or case switch while a PNG is being prepared must disable the old file and never share it; pin in Task 3 UI tests.
2. An empty but valid settlement must export a PNG saying 「送金なし」; pin in Task 1 renderer tests and Task 3 UI tests.
3. Long Japanese names and many transfer rows must wrap and expand image height, without ellipsis or omitted rows; pin in Task 1 tests and browser review.
4. Missing file-share support and `AbortError` cancellation must leave the record unchanged, with download still available; pin in Task 2 tests.
5. Invalid drafts, zero participants, and calculation differences must hide/disable both export actions; pin in Task 3 tests.

---

### Task 1: Dedicated result PNG renderer

**Files:**
- Create: `src/features/share/resultImage.ts`
- Test: `src/features/share/resultImage.test.ts`

**Interfaces:**
- Produces: `ShareImageInput = { title: string; modeLabel: string; createdAt: Date; participants: Participant[]; balances: Balance[]; transfers: Transfer[] }`.
- Produces: `wrapText(text: string, maxWidth: number, measure: (text: string) => number): string[]`.
- Produces: `renderResultPng(input: ShareImageInput): Promise<Blob>`; reject on missing 2D context, failed PNG encoding, or impossible canvas dimensions.
- Consumes: `Participant`, `Balance`, `Transfer` from `src/domain/model.ts`; no calculation function.

- [ ] **Step 1: Write failing tests** in `resultImage.test.ts`. Assert a long Japanese name wraps into multiple complete lines; a mocked canvas receives the title, all names, signed/zero balance labels, every transfer, 「送金なし」 for no transfers, and a final height that grows with row count. Assert a null `toBlob` result rejects instead of returning an empty image.
- [ ] **Step 2: Run the focused test to verify failure.** Run `npm test -- src/features/share/resultImage.test.ts`; expect failure because the renderer does not exist.
- [ ] **Step 3: Implement the exported types and functions.** Use a fixed readable width (1080 logical pixels), dynamic height, Canvas 2D text measurement and wrapping, local Japanese formatting, and a system Japanese font stack. Draw all rows in the existing participant/transfer order, without truncation; use PNG `toBlob` and reject if generation fails. Keep remote images and fonts out of the canvas.
- [ ] **Step 4: Run the focused test.** All renderer assertions pass; visual browser review follows after Task 3 provides the UI.
- [ ] **Step 5: Commit.** Stage only the Task 1 files and commit `feat: render final settlement PNG`.

### Task 2: Native share and PNG download

**Files:**
- Create: `src/features/share/sharePng.ts`
- Test: `src/features/share/sharePng.test.ts`

**Interfaces:**
- Consumes: a prepared `File` with MIME type `image/png` from Task 3.
- Produces: `sharePng(file: File): Promise<'shared' | 'unsupported' | 'cancelled'>`; unexpected API failures reject.
- Produces: `downloadPng(file: File): void`; creates and revokes an object URL after invoking the download link.

- [ ] **Step 1: Write failing tests** for `canShare({ files: [file] })`, supported `navigator.share({ files: [file], ... })`, absent/false support returning `unsupported`, `AbortError` returning `cancelled`, other errors rejecting, and download URL creation/revocation. Check that this module never mutates case data.
- [ ] **Step 2: Run the focused test to verify failure.** Run `npm test -- src/features/share/sharePng.test.ts`; expect missing-module failure.
- [ ] **Step 3: Implement `sharePng` and `downloadPng`.** Invoke `navigator.share` immediately after the synchronous capability check when called from the click handler. Convert only `AbortError` to `cancelled`; preserve other errors for the UI to display. Use the same PNG file for download.
- [ ] **Step 4: Run the focused test.** Expect all support, cancel, error, and download cases to pass.
- [ ] **Step 5: Commit.** Stage only the Task 2 files and commit `feat: share and download settlement PNG`.

### Task 3: Result-card actions and four-mode wiring

**Files:**
- Create: `src/components/ResultShareActions.tsx`
- Test: `src/components/ResultShareActions.test.tsx`
- Modify: `src/components/ResultPanel.tsx`
- Modify: `src/features/normal/NormalPanel.tsx`
- Modify: `src/features/poker/PokerPanel.tsx`
- Modify: `src/features/mahjong/MahjongPanel.tsx`
- Modify: `src/features/noriumi/NoriumiPanel.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`
- Modify: `README.md`
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: `renderResultPng(ShareImageInput)` from Task 1 and `sharePng(File)` / `downloadPng(File)` from Task 2.
- Produces: `ResultShareActions({ input }: { input: Omit<ShareImageInput, 'createdAt'> | null })`.
- Extends `ResultPanelProps` with `shareRecord?: { id: string; title: string; modeLabel: string }`; `ResultPanel` supplies a non-null input only when participants exist, `issues.length === 0`, and `status` is absent or balanced. Each of the four panels passes its current case metadata and existing result; roulette remains untouched.

- [ ] **Step 1: Write failing component and app tests.** In `ResultShareActions.test.tsx`, assert buttons are unavailable while generating, enabled only for the current input signature, old async completions cannot replace a newer PNG, native share receives the prepared file, unsupported share displays a save hint, cancellation is quiet, and generation failure is visible. In `App.test.tsx`, assert the four supported modes show actions, roulette does not, valid all-zero results allow 「送金なし」, and invalid drafts, zero participants, and calculation differences block actions.
- [ ] **Step 2: Run the focused tests to verify failure.** Run `npm test -- src/components/ResultShareActions.test.tsx src/App.test.tsx`; expect missing actions or assertions to fail.
- [ ] **Step 3: Implement `ResultShareActions` and wire `ResultPanel`.** Prepare a `File` after each eligible input signature changes, with `createdAt` fixed at preparation; associate it with that signature. Disable actions whenever the current signature and prepared file differ. Call `sharePng` directly from the click handler without awaiting image creation first. Provide accessible button labels and a concise status/error message.
- [ ] **Step 4: Pass `shareRecord` in the four mode panels and style the actions.** Ensure narrow screens retain readable buttons and the result list remains visible. Update README to explain image sharing versus record synchronization; update STATUS with branch, completed work, next work, verification, and blockers.
- [ ] **Step 5: Run focused tests, then full checks.** Run `npm test -- src/components/ResultShareActions.test.tsx src/App.test.tsx`, `npm test`, `npm run typecheck`, and `npm run build`; all must pass. Review one valid image per mode and one long-name/many-transfer image in a browser at phone and desktop widths, and verify native sharing when the current browser supports PNG files.
- [ ] **Step 6: Commit.** Stage only the Task 3 files and commit `feat: share final results from settlement modes`.

## Final review and handoff

- [ ] Inspect `git diff` against the base branch for unrelated changes, especially the pre-existing `.sites-checkout/` directory.
- [ ] Run `git status --short --branch` and the repository sync check; if `gh` is not authenticated, verify upstream equality with Git commands and record that limitation.
- [ ] Push the work branch and report the exact checks and any browser/physical-device sharing limitation. Publishing or deployment is a separate step.
