# Settlement App Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 型付きの React + TypeScript + Vite モックで、6種類の精算フローを切り替えられる初期アプリを作る。

**Architecture:** `src/domain` に計算とデータモデルを置き、`src/components` に再利用 UI、`src/App.tsx` にモード選択とモック画面を置く。モード固有の表示は共通の participant/expense/result コンポーネントに入力データを渡し、計算は副作用のない関数で行う。

**Tech Stack:** React 18, TypeScript strict, Vite, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-10-05-settlement-app-mock-design.md`

## Global Constraints

- データはローカルの型付きモックデータのみ。
- 5つの精算モードをナビゲーションで切り替え、通常精算内で支払い明細ごとの対象者を切り替えられること。
- 支払い明細ごとに対象者を切り替え、金額を再計算できること。
- テスト・型チェック・ビルドを実行すること。

## Review Focus

- 対象者が0人の明細はゼロ除算せず0円になること（`splitExpense` のテスト）。
- 金額が割り切れない場合でも合計が元金額と一致すること（`splitExpense` のテスト）。
- 6モードすべてがタイトルと固有説明を表示すること（`App` の確認）。
- モバイル幅でもナビゲーションとカードが横にはみ出さないこと（CSS確認）。
- 参加者対象切替が結果の負担額へ反映されること（`splitExpense` のテスト）。

### Task 1: Project scaffold and domain model

**Files:** `package.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `src/domain/model.ts`, `src/domain/settlement.ts`, `src/domain/settlement.test.ts`

- [ ] failing tests for equal split, zero participants, rounding remainder, and recipient totals
- [ ] run Vitest and confirm the new tests fail because domain functions are absent
- [ ] implement the typed model and pure settlement functions
- [ ] run Vitest and confirm all domain tests pass

### Task 2: Shared UI and main screen

**Files:** `src/main.tsx`, `src/App.tsx`, `src/components/*.tsx`, `src/styles.css`

- [ ] implement shared cards, chips, navigation, expense rows, and result panel
- [ ] implement mode-specific mock data and mode switching
- [ ] verify responsive layout and all six labels are present in source/UI

### Task 3: Documentation and verification

**Files:** `README.md`

- [ ] document setup, scripts, and supported modes
- [ ] run tests, `tsc --noEmit`, and `vite build`
