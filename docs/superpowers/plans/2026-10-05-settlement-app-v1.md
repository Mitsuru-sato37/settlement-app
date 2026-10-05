# 仲間内精算アプリ 実用初版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存モックを、単一ブラウザで記録・編集・復元でき、全モードの送金額を検証して表示する実用初版にする。

**Architecture:** モード別の判別可能な `SettlementCase` を一つの保存ストアで管理し、計算は純粋関数、保存は独立した境界に置く。巨大な `App.tsx` から各モード画面を分離し、既存の共通 UI と明るい CSS を再利用する。

**Tech Stack:** React、TypeScript strict、Vite、Vitest、jsdom、`localStorage`。追加のバックエンド・認証・同期サービスは使わない。

**Spec:** `docs/superpowers/specs/2026-10-05-settlement-app-v1-design.md`

## Global Constraints

- 一人が操作し、仲間は同じ画面を見る。アカウント、共同編集、決済、サーバー同期、端末間共有は対象外。
- 記録はモードごとに独立し、新規記録は空。既存モックは明示的に読み込むサンプルとする。
- 金額は整数円。無効な入力や収支不一致では送金を確定表示しない。
- 保存は使用中のブラウザの `localStorage` のみ。JSON 書き出し・読み込みを備え、保存失敗を隠さない。
- 既存の Sites プロジェクトと非公開範囲を維持する。公開範囲を変えない。
- 各実装タスクは先に失敗テストを置き、対象テストの RED → GREEN → `npm test` を確認してからコミットする。

## File Map

- `src/domain/model.ts`: 記録、モード別入力、保存形式、計算結果の型。
- `src/domain/cases.ts` と `src/domain/cases.test.ts`: 記録の生成・選択・削除とサンプル生成。
- `src/domain/settlement.ts` と同テスト: 共通の円単位分配、送金、収支不一致のゲート。
- `src/domain/mahjong.ts`、`src/domain/noriumi.ts` と同テスト: モード固有の計算・検証。ルーレットの純粋関数は `settlement.ts` から `roulette.ts` へ移してもよいが公開シグネチャを維持する。
- `src/storage/caseStorage.ts` と同テスト: 厳密な保存形式検証、読み書き、JSON バックアップ。
- `src/features/cases/CaseWorkspace.tsx`: 記録一覧、作成・切替・削除、参加者管理、保存状態。`App.tsx` はモードナビと現在の画面選択に絞る。
- `src/features/{normal,poker,mahjong,noriumi,roulette}/*Panel.tsx`: 各モードの入力と結果。既存の `src/components/*` を再利用・調整する。
- `src/styles.css`, `README.md`, `src/App.test.tsx`: 画面・説明・結合テストを実装に合わせる。

## Review Focus

1. 壊れた保存データ・未知の `schemaVersion`・不正 JSON は既存の画面状態を上書きせず、復旧可能なエラーを示す（Task 2 のテスト）。
2. 参照中の参加者を削除するとき、支払者や麻雀の席を黙って別人に変えない（Task 3 のテスト）。
3. 1 円の余りやマイナス損益でも通常精算・ノリ打ちの収支合計が 0 円になる（Task 4, 7 のテスト）。
4. 麻雀の三麻・四麻、同点、設定変更、端数処理、不正な持ち点合計が誤送金を作らない（Task 6 のテスト）。
5. ルーレットの 0 円候補、比率境界、連続抽選、抽選中の編集、針と当選色の一致（Task 8 のテスト）。

---

### Task 1: 記録モデルと共通の収支ゲート

**Files:** Modify `src/domain/model.ts`, `src/domain/settlement.ts`, `src/domain/settlement.test.ts`, `src/data.ts`; create `src/domain/cases.ts`, `src/domain/cases.test.ts`.

**Interfaces:** `CaseStore = { schemaVersion: 1; activeCaseId: string | null; cases: SettlementCase[] }`。`SettlementCase` は `mode` で判別する union。共通項目は `id/title/participants/createdAt/updatedAt`。`NormalCase.expenses: ExpenseItem[]`、`PokerCase.amounts: Record<string, number>`、`MahjongCase.playerCount/settings/matches/nextMatchNumber`、`NoriumiCase.entries: Record<string, { investment: number; recovery: number }>`、`RouletteCase.amounts/winnerId/rotation` とする。`MahjongMatch` は `id/label/players: MahjongPlayerInput[]` を持つ。`createEmptyStore(): CaseStore`、`createCase(mode, title, id, now): SettlementCase`、`addCase(store, item): CaseStore`、`removeCase(store, id): CaseStore`、`selectCase(store, id): CaseStore`、`createSampleCase(mode, id, now): SettlementCase`、`finalizeBalances(balances: Balance[], issues: string[]): SettlementResult` を提供する。`SettlementResult` は `balances/transfers/issues/difference` を持つ。

- [ ] **Step 1: failing tests** — `expect(createCase('normal','旅行','c1',now)).toMatchObject({mode:'normal',participants:[],expenses:[]})`、`expect(createEmptyStore().cases).toEqual([])`、別モードの記録を追加・選択しても元記録が変わらないこと、存在しない ID を選んでも状態が変わらないこと、`finalizeBalances([{participantId:'a',amount:1}],[])` の送金が空で差額が 1 になることをテストする。
- [ ] **Step 2: RED** — `npm test -- --run src/domain/cases.test.ts src/domain/settlement.test.ts` が期待した未実装理由で失敗することを確認する。
- [ ] **Step 3: implement** — 上記シグネチャと union を実装し、既存の `calculateSettlement` と `calculateTransfers` を保持する。ID と日時を引数化してテスト可能にする。
- [ ] **Step 4: GREEN** — 対象テスト、次に `npm test` が通ることを確認する。
- [ ] **Step 5: commit** — Task 1 のファイルだけを `feat: model independent settlement cases` でコミットする。

### Task 2: ローカル保存と JSON バックアップ

**Files:** Create `src/storage/caseStorage.ts`, `src/storage/caseStorage.test.ts`.

**Interfaces:** `parseCaseStore(raw: string): { ok: true; value: CaseStore } | { ok: false; error: string }`、`loadCaseStore(storage: Storage): { ok: true; value: CaseStore } | { ok: false; error: string }`、`saveCaseStore(storage: Storage, store: CaseStore): { ok: boolean; error?: string }`、`exportCaseStore(store: CaseStore): string`。キー不在の `loadCaseStore` は空ストアを返す。JSON 読み込みも `parseCaseStore` を共用し、最大 1 MiB、型・ID 一意性・参照整合性・整数/有限数を確認する。

- [ ] **Step 1: failing tests** — 有効な 5 モードの往復、`expect(parseCaseStore('{"schemaVersion":2,"activeCaseId":null,"cases":[]}').ok).toBe(false)`、壊れた JSON、重複 ID、未知の支払者、1 MiB 超、`Storage.setItem` の例外について失敗結果または元ストア不変を確認する。
- [ ] **Step 2: RED** — `npm test -- --run src/storage/caseStorage.test.ts` の失敗理由を確認する。
- [ ] **Step 3: implement** — 外部依存なしの境界検証と保存を実装する。読み込み失敗時に既存データを変更せず、初回のキー不在だけ空ストアを返す。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: persist and back up settlement cases`。

### Task 3: 記録ワークスペースと参加者管理

**Files:** Create `src/features/cases/CaseWorkspace.tsx`, `src/features/cases/CaseWorkspace.test.tsx`; modify `src/styles.css`. 旧 `App.tsx` は Task 9 の統合まで動かしたままにする。

**Interfaces:** `CaseWorkspace({ store: CaseStore, onChange: (next: CaseStore) => void, saveStatus: 'saved' | 'error' })` は記録と参加者の管理 UI のみを担当し、モード画面は描画しない。モードナビと画面の接続は Task 9 で行う。JSON インポートは `parseCaseStore` 成功後の確認を経て `onChange` する。

- [ ] **Step 1: failing tests** — 二つのモードの記録を作成・切替して参加者が混ざらないこと、`saveStatus='error'` で「保存できません」を表示すること、支払者・麻雀席として参照中の参加者を削除できないこと、ポーカー等の参加者削除で対応する入力行だけが消えること、JSON 読み込み失敗で `onChange` が呼ばれないこと、削除・上書き確認を拒否すれば元記録が残ることを DOM で検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/features/cases/CaseWorkspace.test.tsx` の失敗を確認する。
- [ ] **Step 3: implement** — 記録 CRUD、参加者追加・改名・削除、明示的なサンプル読み込み、バックアップ操作を独立コンポーネントにする。旧 `App.tsx` は Task 9 まで変更しない。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: add local settlement workspace`。

### Task 4: 通常精算の編集

**Files:** Create `src/features/normal/NormalPanel.tsx`, `src/features/normal/NormalPanel.test.tsx`; modify `src/components/ExpenseRow.tsx`, `src/components/ResultPanel.tsx`, `src/domain/settlement.ts`, `src/domain/settlement.test.ts`, `src/styles.css`.

**Interfaces:** `NormalPanel({ value: NormalCase, onChange: (next: NormalCase) => void })`。`calculateNormalCase(value: NormalCase): SettlementResult` は `splitExpense`、`calculateSettlement`、`finalizeBalances` を使い、無効な明細を `issues` に返す。

- [ ] **Step 1: failing tests** — 1000 円を 3 人に分けると `[334,333,333]`、対象者 0 人では送金なし、明細の追加・金額/支払者/対象者の変更・削除で合計と送金が再計算されること、参照している支払者削除が拒否されることを検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/features/normal/NormalPanel.test.tsx src/domain/settlement.test.ts` の期待した失敗を確認する。
- [ ] **Step 3: implement** — 編集フォームと純粋計算を実装する。既存 `App.tsx` が使う共通部品の props は Task 9 まで互換を保つ。固定の「3件」「¥9,950」「自動保存済み」は Task 9 で入力連動に置き換える。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: make normal settlement editable`。

### Task 5: ポーカーの編集

**Files:** Create `src/features/poker/PokerPanel.tsx`, `src/features/poker/PokerPanel.test.tsx`; modify `src/domain/settlement.ts`, `src/domain/settlement.test.ts`, `src/styles.css`.

**Interfaces:** `PokerPanel({ value: PokerCase, onChange: (next: PokerCase) => void })`。`calculatePokerCase(value: PokerCase): SettlementResult` は参加者順の整数円収支を `finalizeBalances` に渡す。

- [ ] **Step 1: failing tests** — `[+1200,-1200]` は A への 1200 円送金、`[+1200,-1000]` は差額 200 円で送金なし、画面の数値編集が保存値・状態表示・送金へ反映することを検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/features/poker/PokerPanel.test.tsx src/domain/settlement.test.ts`。
- [ ] **Step 3: implement** — 新画面に編集可能な収支入力を実装する。旧画面の `gameNotes.poker` と無反応の編集ボタンは Task 9 の統合時に撤去する。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: edit and verify poker balances`。

### Task 6: 麻雀の半荘計算と編集

**Files:** Create `src/domain/mahjong.ts`, `src/domain/mahjong.test.ts`, `src/features/mahjong/MahjongPanel.tsx`, `src/features/mahjong/MahjongPanel.test.tsx`; modify `src/domain/model.ts`, `src/styles.css`.

**Interfaces:** `calculateMahjongMatch(match: MahjongMatch, settings: MahjongSettings, playerCount: 3 | 4): SettlementResult`、`calculateMahjongCase(value: MahjongCase): SettlementResult`、`MahjongPanel({ value: MahjongCase, onChange: (next: MahjongCase) => void })`。既存の `calculateMahjongBalances` は移行中の互換を保つかテストを同時に移す。

- [ ] **Step 1: failing tests** — 四麻 25,000 点/30,000 点返し/オカ 20,000 と三麻 35,000 点/40,000 点返し/オカ 15,000 のゼロサム、同点時の席順、点数合計不一致の送金なし、任意レート・ウマ・チップ、半荘 2 回の累計、異なる半荘の席選択、丸め誤差だけで不一致にしないことを検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/domain/mahjong.test.ts src/features/mahjong/MahjongPanel.test.tsx`。
- [ ] **Step 3: implement** — 半荘ごとの席・点数・チップ編集、ルール編集、累計最上部、新しい半荘が上の履歴を実装する。無効半荘があれば累計も未確定と明示する。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: settle editable mahjong matches`。

### Task 7: ノリ打ちの均等精算

**Files:** Create `src/domain/noriumi.ts`, `src/domain/noriumi.test.ts`, `src/features/noriumi/NoriumiPanel.tsx`, `src/features/noriumi/NoriumiPanel.test.tsx`; modify `src/styles.css`.

**Interfaces:** `calculateNoriumiCase(value: NoriumiCase): SettlementResult`、`NoriumiPanel({ value: NoriumiCase, onChange: (next: NoriumiCase) => void })`。送金用収支は `均等損益 - (回収額 - 投資額)` とする。

- [ ] **Step 1: failing tests** — A が投資 1000/回収 2000、B が投資 1000/回収 0 なら A→B 1000 円、3 人で合計利益 1 円なら表示順で `[1,0,0]` 円を配ること、負の全体損益と入力編集後も収支合計 0 円であることを検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/domain/noriumi.test.ts src/features/noriumi/NoriumiPanel.test.tsx`。
- [ ] **Step 3: implement** — 新画面に投資・回収の入力、全体損益、均等取り分、具体的送金を表示する。旧画面の `gameNotes.noriumi` は Task 9 の統合時に撤去する。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: split noriumi results equally`。

### Task 8: ルーレットの記録連動と検証

**Files:** Create `src/features/roulette/RoulettePanel.tsx`, `src/features/roulette/RoulettePanel.test.tsx`; modify `src/domain/settlement.ts`, `src/domain/settlement.test.ts`, `src/styles.css`.

**Interfaces:** `RoulettePanel({ value: RouletteCase, onChange: (next: RouletteCase) => void })`。既存の `calculateRouletteShares`、`pickWeightedParticipant`、`calculateRouletteTargetRotation` を使用し、抽選値の取得を注入またはスタブ可能にする。

- [ ] **Step 1: failing tests** — 0 円候補は当たらず合計 0 円は抽選不可、境界値で選択した色の中央に針が止まること、連続抽選で角度が跳ねないこと、当選後に金額・参加者を変えたら結果が消えること、抽選中は入力不能で完了時だけ氏名を表示することを検証する。
- [ ] **Step 2: RED** — `npm test -- --run src/features/roulette/RoulettePanel.test.tsx src/domain/settlement.test.ts`。
- [ ] **Step 3: implement** — ホイール・金額・割合・当選者を `RouletteCase` と同期し、実際の保存状態と動きを減らす設定に対応する。
- [ ] **Step 4: GREEN** — 対象テストと `npm test` を通す。
- [ ] **Step 5: commit** — `feat: persist fair roulette results`。

### Task 9: リリース整備と公開

**Files:** Modify `README.md`, `src/App.tsx`, `src/App.test.tsx`, `src/components/ModeNav.tsx`, `src/styles.css`, 必要なモードテスト。`.openai/hosting.json` は既存 ID を維持。

**Interfaces:** 新規 API なし。全モードの計算結果と保存状態を利用者が理解できることを完成条件にする。

- [ ] **Step 1: release tests** — 5 モードを切替え、作成→入力→再読み込み→復元→送金確認を DOM テストで追加する。空ストア、新規記録、保存失敗、未実装ボタン、誤った「自動保存」、固定サンプル値を検出するアサーションを追加し、期待した RED を確認する。
- [ ] **Step 2: integrate and polish** — `App.tsx` に新ワークスペースと各モード画面を接続し、旧モックを撤去する。テストを GREEN にし、デスクトップ/スマホ幅で主要操作・空状態・エラーを目視確認する。README に端末内保存、バックアップ、各モード、非対応機能を記載する。
- [ ] **Step 3: verify** — `npm test`、`npm run typecheck`、`npm run build`、`git diff --check` の終了コード 0 と出力を確認する。仕様書の各要件を実装・テストへ照合する。
- [ ] **Step 4: review and commit** — 全差分を確認し、必要な修正を再検証してコミット。`git status --short` が空であることを確認する。
- [ ] **Step 5: release** — 正確な HEAD を `origin/main` に Push し、既存 `project_id` で Sites ワークフローを実行して同じ SHA のアーカイブを作り、非公開バージョンとしてデプロイする。`succeeded` と URL を確認して報告する。
