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

### リメイク版の観測状況

- 確認日: 2026-07-01
- 確認範囲: package test内の最小React互換fixture。
- `package/src/cli/router.spec.ts` で、`index.tsx` entrypointを持つStanzaが `togostanza build` で生成物を作れることを確認した。
- fixtureの `react` / `react-dom/client` はStanzaリポジトリ側の `node_modules/` に置き、CLI側dependencyにはしない構成で確認した。
- 生成された `dist/react-runtime-probe.js` にはReact component本文とruntime登録がbundleされ、bare import `react` / `react-dom/client` は残らなかった。
- `package/test/browser/custom-element.smoke.spec.ts` で、direct embedから `<togostanza-react-runtime-probe>` がupgradeされ、open Shadow DOM内 `main` へReact component相当のDOMを描画できることを確認した。
- 初期属性 `label="initial-react"` / `count="1"` が `this.params` を経由して描画へ反映された。
- 属性変更後に `handleAttributeChange()` 経由で再描画され、`label="after-react-mutation"` / `count="2"` が表示へ反映された。
- `this.importWebFontCSS("./assets/react-runtime-font.css")` により、shadow root内に `public/react-runtime-probe/assets/react-runtime-font.css` へ向くstylesheet linkが追加された。
- React rootはStanzaソース側で再利用する前提としてfixture化した。
- 実React / React DOM package、MUI / Emotion、TogoMedium Stanzaのprovider stackは4-4の実プロジェクト回帰で確認する。

確認コマンド:

- `cd package && mise exec -- pnpm exec vitest run --config vitest.config.ts src/cli/router.spec.ts -t "builds a React TSX stanza"`
- `cd package && mise exec -- pnpm exec playwright test --config playwright.config.ts -g "renders a React TSX Stanza"`

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
- リメイク版のpackage fixtureでは `-togostanza/` や `index.html` を生成しない。これはPhase 2-1以降のbuild artifact方針に従う。
- リメイク版のpackage fixtureは最小React互換packageで確認しているため、実React packageとprovider stackの互換は012ケースへ送る。

## 未決定事項

- MUI/Emotionなどのprovider stackを別の検証ケースにするかどうか。
- React version差分を互換対象に含めるかどうか。
