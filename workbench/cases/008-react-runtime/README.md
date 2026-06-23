# 008 Reactランタイム

## 目的

TSX/Reactで書かれたStanzaソースが、TogoStanzaランタイムのShadow DOM内 `main` にマウントできることを確認する。

## 対応する方針

- `index.tsx` をStanzaソースとして扱えることを確認する。
- `this.root.querySelector("main")` はReactマウント対象として維持する。
- `this.params` をReact component propsへ渡せることを確認する。
- 属性変更時にReact側を再描画できることを確認する。
- `this.importWebFontCSS()` がReactランタイムstanzaでも使えることを確認する。
- MUI/Emotion/TanStack Query/Jotai/Redux provider stackはこの検証ケースに持ち込まない。

## 入力条件

- `current-pnpm/generated-repo/` にReactランタイム観測用の最小Stanzaリポジトリを置く。
- Stanza entryは `stanzas/react-runtime/index.tsx` とする。
- `react` / `react-dom` / TypeScript supportに必要な最小依存だけを `package.json` に置く。
- ヘルププレビューではなく、`fixtures/react-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` がTSX entryを処理できること。
- `dist/react-runtime.js` が生成され、direct embedでcustom elementがupgradeされること。
- `this.root.querySelector("main")` をReact `createRoot()` のマウント対象にできること。
- `label` / `count` が `this.params` からReact componentに渡ること。
- 属性変更後にReact outputが更新されること。
- `this.importWebFontCSS("./assets/react-runtime-font.css")` のlinkがshadow rootに入ること。

## リメイク版で観測すること

- 同じ入力意図のTSX/React Stanzaソースが動くこと。
- Reactランタイムチャンクがdirect embed生成物として静的配信上で解決できること。
- `main` マウント対象、params、属性変更rerender、font CSS injectionが壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/008-react-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルドには `togostanza-build.mjs` から `@rollup/plugin-typescript` を最小注入している。
- `dist/` には `react-runtime.js`、`react-runtime.css`、`react-runtime.html`、`react-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embedブラウザ観測では `<togostanza-react-runtime>` にopen shadow rootが作られ、shadow root内の `main` にReact componentが描画された。
- 初期表示では `label` が `initial-react`、`count` が `1`、`render count` が `1` と表示された。
- `importWebFontCSS("./assets/react-runtime-font.css")` により `http://127.0.0.1:4178/dist/assets/react-runtime-font.css` のstylesheet linkがshadow rootに追加された。
- 変更ボタン後は `label` が `after-react-mutation`、`count` が `2`、`render count` が `2` になった。
- 変更後にfont CSS linkが重複して2本になった。現行版の `importWebFontCSS()` は同一URLの重複挿入を抑止しない可能性がある。
- コンソールのエラー/警告は観測されなかった。

## 合格条件

- direct embed HTML上で `<togostanza-react-runtime>` にopen shadow rootが作られる。
- shadow root内の `main` にReact componentが描画される。
- 初期paramsと属性変更後paramsがReact outputに反映される。
- コンソールに致命的なmodule loadエラーが出ない。

## 記録する差分

- TSX buildの成否。
- 生成物ツリー。
- sharedランタイムチャンクの有無。
- ブラウザコンソール/shadow root/rendered text。
- 属性変更後の描画結果。

## 未決定事項

- MUI/Emotionなどのprovider stackを別の検証ケースにするかどうか。
- React version差分を互換対象に含めるかどうか。
