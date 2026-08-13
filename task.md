# InstantSite v2 — 実装タスク

## 決定事項
- 顧客に入力させない。ダッシュボードで自分が入力→AI生成→提案。onboard/SMS導線は削除。
- テンプレは固定2種ではなく、AIが店ごとにテーマ（配色・フォント・layout: elegant/natural/bold）を生成。
- Google Places API 連携あり（GOOGLE_MAPS_API_KEY）。未設定でも埋め込み地図は動く。
- クレジット: 初期50、生成のみ-1、編集は無料。課金なし。

## 進捗
- [x] shared/site-model.ts（ブロック型・テーマ・カテゴリ）
- [x] schema.ts（sites拡張 / site_pages / credit_ledger / page_views / conversions / edit_history）
- [x] lib/images.ts（sharp → WebP 3サイズ）
- [x] lib/places.ts（Places API New searchText）
- [x] lib/credits.ts
- [x] agent/site-generator.ts（テーマ+3ページ生成）
- [x] agent/site-editor.ts（AIチャット編集）
- [x] routes/sites.ts, media.ts, analytics.ts, credits.ts, api/index.ts
- [x] 旧ファイル削除（leads.ts, twilio.ts, onboard.tsx, site.tsx, elegant-restaurant-site.tsx）
- [x] index.html フォント追加
- [ ] web: site renderer（ブロック→UI, layout 3種）
- [ ] web: 公開ページ /s/:slug, /s/:slug/menu, /s/:slug/info + 計測
- [ ] web: ダッシュボード /
- [ ] web: 新規作成 /new
- [ ] web: エディタ /edit/:slug（手動 + AIチャット + undo）
- [ ] web: 解析 /analytics/:slug
- [ ] app.tsx ルート更新
- [ ] db:push → build → 動作確認 → deliver

## メモ
- 旧sitesレコードは新カラムのdefaultで残る（generationStatus=pending扱い）。表示崩れるなら削除する。
- port 4200, tmux session `dev`
