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

---

# settlement-app 総合デバッグ状況

更新日: 2026-10-07 / デバッグPR: [#4](https://github.com/Mitsuru-sato37/settlement-app/pull/4) / 基準: [DEBUG_STANDARD.md](./DEBUG_STANDARD.md)・[DEBUG_MATRIX.md](./DEBUG_MATRIX.md)

## 今回の変更

- 共通デバッグ標準と、settlement-app固有の確認マトリクスを追加。
- 収支合計のIEEE-754丸めで差額を誤表示する問題を再現し、精算ゲートとポーカー差額表示をBigInt合計に変更。再発防止テストを追加。
- 通常精算の負数・小数・空白・数字以外の入力で送金を抑止するテストを追加。
- 320pxで `body min-width:320px` によるページ横はみ出しを再現し、不要な最小幅を除去。320/375/390/1280pxで画面を再確認。
- 金額・区間負担・端数・多人数の具体例を精算ユニットテストに追加。
- 既存仕様と既存UIは変更していない。

## 検証結果

- デバッグ変更は `codex/settlement-debug-standard` に分離し、1 commitでPR #4を作成。PR #2の変更は含めていない。
- `npm test`: 12 files / 69 tests PASS。
- `npm run typecheck`: PASS。
- `npm run build`: PASS (Vite 8.3.2)。
- 320pxの前後スクリーンショットで本文横スクロールが消え、ナビの横スクロールのみ残ることを確認。375/390/1280pxでも本文横はみ出し・カード重なりなし。
- GitHub Actions workflowなし。PR #2「麻雀設定からオカを削除しスマホ表示を改善」はopen・未merge。

## 残件・引継ぎ

- iOS/Android実機のソフトキーボード、実端末幅での確認は未実施。
- 320pxでモードナビは横スクロールする。ページ本体の横はみ出しは修正済み。
- 同じ名称の参加者や同じ名前・金額の明細は別IDで登録できる。現仕様は重複禁止を定めていないため、重複防止は追加していない。
- GitHub Actionsがなく、GitHub上のCI結果はなし。FileReaderの実ブラウザー読込失敗注入も未実施。
- ブラウザー履歴の戻る操作と、全モード全ボタン配置は未確認。
