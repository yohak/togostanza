# 008 React runtime

## 目的

TSX / React で書かれた Stanza source が、TogoStanza runtime の Shadow DOM 内 `main` に mount できることを確認する。

## 対応する方針

- `index.tsx` を Stanza source として扱えることを確認する。
- `this.root.querySelector("main")` は React mount target として維持する。
- `this.params` を React component props へ渡せることを確認する。
- attribute 変更時に React 側を再描画できることを確認する。
- `this.importWebFontCSS()` が React runtime stanza でも使えることを確認する。
- MUI / Emotion / TanStack Query / Jotai / Redux provider stack はこの検証ケースに持ち込まない。

## 入力条件

- `current-pnpm/generated-repo/` に React runtime 観測用の最小 Stanza repository を置く。
- Stanza entry は `stanzas/react-runtime/index.tsx` とする。
- `react` / `react-dom` / TypeScript support に必要な最小依存だけを `package.json` に置く。
- help preview ではなく、`fixtures/react-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` が TSX entry を処理できること。
- `dist/react-runtime.js` が生成され、direct embed で custom element が upgrade されること。
- `this.root.querySelector("main")` を React `createRoot()` の target にできること。
- `label` / `count` が `this.params` から React component に渡ること。
- attribute mutation 後に React output が更新されること。
- `this.importWebFontCSS("./assets/react-runtime-font.css")` の link が shadow root に入ること。

## リメイク版で観測すること

- 同じ入力意図の TSX / React Stanza source が動くこと。
- React runtime chunk が direct embed artifact として静的配信上で解決できること。
- `main` mount target、params、attribute change rerender、font CSS injection が壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/008-react-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build には `togostanza-build.mjs` から `@rollup/plugin-typescript` を最小注入している。
- `dist/` には `react-runtime.js`、`react-runtime.css`、`react-runtime.html`、`react-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embed browser 観測では `<togostanza-react-runtime>` に open shadow root が作られ、shadow root 内の `main` に React component が描画された。
- 初期表示では `label` が `initial-react`、`count` が `1`、`render count` が `1` と表示された。
- `importWebFontCSS("./assets/react-runtime-font.css")` により `http://127.0.0.1:4178/dist/assets/react-runtime-font.css` の stylesheet link が shadow root に追加された。
- mutation button 後は `label` が `after-react-mutation`、`count` が `2`、`render count` が `2` になった。
- mutation 後に font CSS link が重複して 2 本になった。現行版の `importWebFontCSS()` は同一 URL の重複挿入を抑止しない可能性がある。
- console の error / warning は観測されなかった。

## 合格条件

- direct embed HTML 上で `<togostanza-react-runtime>` に open shadow root が作られる。
- shadow root 内の `main` に React component が描画される。
- 初期 params と attribute mutation 後 params が React output に反映される。
- console に致命的な module load error が出ない。

## 記録する差分

- TSX build の成否。
- generated artifact tree。
- shared runtime chunk の有無。
- browser console / shadow root / rendered text。
- attribute mutation 後の描画結果。

## 未決定事項

- MUI / Emotion などの provider stack を別の検証ケースにするかどうか。
- React version 差分を互換対象に含めるかどうか。
