# 008 React runtime

## 目的

TSX/Reactで書かれたStanza sourceが、TogoStanza runtimeのShadow DOM内 `main` にmountできることを確認する。

## 対応する方針

- `index.tsx` をStanza sourceとして扱えることを確認する。
- `this.root.querySelector("main")` はReact mount targetとして維持する。
- `this.params` をReact component propsへ渡せることを確認する。
- attribute変更時にReact側を再描画できることを確認する。
- `this.importWebFontCSS()` がReact runtime stanzaでも使えることを確認する。
- MUI/Emotion/TanStack Query/Jotai/Redux provider stackはこの検証ケースに持ち込まない。

## 入力条件

- `current-pnpm/generated-repo/` にReact runtime観測用の最小Stanzaリポジトリを置く。
- Stanza entryは `stanzas/react-runtime/index.tsx` とする。
- `react` / `react-dom` / TypeScript supportに必要な最小依存だけを `package.json` に置く。
- help previewではなく、`fixtures/react-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` がTSX entryを処理できること。
- `dist/react-runtime.js` が生成され、direct embedでcustom elementがupgradeされること。
- `this.root.querySelector("main")` をReact `createRoot()` のtargetにできること。
- `label` / `count` が `this.params` からReact componentに渡ること。
- attribute mutation後にReact outputが更新されること。
- `this.importWebFontCSS("./assets/react-runtime-font.css")` のlinkがshadow rootに入ること。

## リメイク版で観測すること

- 同じ入力意図のTSX/React Stanza sourceが動くこと。
- React runtime chunkがdirect embed artifactとして静的配信上で解決できること。
- `main` mount target、params、attribute change rerender、font CSS injectionが壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/008-react-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- buildには `togostanza-build.mjs` から `@rollup/plugin-typescript` を最小注入している。
- `dist/` には `react-runtime.js`、`react-runtime.css`、`react-runtime.html`、`react-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embedブラウザ観測では `<togostanza-react-runtime>` にopen shadow rootが作られ、shadow root内の `main` にReact componentが描画された。
- 初期表示では `label` が `initial-react`、`count` が `1`、`render count` が `1` と表示された。
- `importWebFontCSS("./assets/react-runtime-font.css")` により `http://127.0.0.1:4178/dist/assets/react-runtime-font.css` のstylesheet linkがshadow rootに追加された。
- mutation button後は `label` が `after-react-mutation`、`count` が `2`、`render count` が `2` になった。
- mutation後にfont CSS linkが重複して2本になった。現行版の `importWebFontCSS()` は同一URLの重複挿入を抑止しない可能性がある。
- consoleのerror/warningは観測されなかった。

## 合格条件

- direct embed HTML上で `<togostanza-react-runtime>` にopen shadow rootが作られる。
- shadow root内の `main` にReact componentが描画される。
- 初期paramsとattribute mutation後paramsがReact outputに反映される。
- consoleに致命的なmodule load errorが出ない。

## 記録する差分

- TSX buildの成否。
- generated artifact tree。
- shared runtime chunkの有無。
- browser console/shadow root/rendered text。
- attribute mutation後の描画結果。

## 未決定事項

- MUI/Emotionなどのprovider stackを別の検証ケースにするかどうか。
- React version差分を互換対象に含めるかどうか。
