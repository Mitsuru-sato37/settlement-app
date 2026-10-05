# settlement-app

仲間内の立替・ゲーム収支をすばやく整理する、React + TypeScript + Vite の Native モックアプリです。

## 起動

```bash
npm install
npm run dev
```

## スクリプト

- `npm test` — Vitest の精算計算テスト
- `npm run typecheck` — TypeScript の型チェック
- `npm run build` — Vite の本番ビルド

## 対応モード

- **通常精算**: 支払い明細ごとに対象者を切り替えて均等割り
- **ポーカー / 麻雀 / ノリ打ち**: ゲーム収支のモック表示と精算結果
- **全額払いルーレット**: 支払い担当を切り替えるルーレット風 UI

すべてのデータはローカルのモックです。明細の対象者チップをクリックすると、その明細だけ再計算されます。
