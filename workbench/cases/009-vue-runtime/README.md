# 009 Vue runtime

## 目的

Vue SFC を使う既存 Stanza source が、TogoStanza runtime の Shadow DOM 内 `main` に mount できることを確認する。

## 対応する方針

- Vue SFC と `createApp()` を Stanza source 内で利用できることを確認する。
- `this.root.querySelector("main")` は Vue mount target として維持する。
- `this.params` を Vue component props へ渡せることを確認する。
- framework runtime chunk が direct embed artifact として解決できることを確認する。
- asset / package asset import の観測は 007 に寄せる。

## 入力条件

- `current-pnpm/generated-repo/` に Vue runtime 観測用の最小 Stanza repository を置く。
- Stanza entry は `stanzas/vue-runtime/index.js`、Vue component は `App.vue` とする。
- `vue` / `@vue/compiler-sfc` / `rollup-plugin-vue` を `package.json` に置く。
- help preview ではなく、`fixtures/vue-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` が Vue SFC import を処理できること。
- `dist/vue-runtime.js` が生成され、direct embed で custom element が upgrade されること。
- `this.root.querySelector("main")` を Vue `createApp()` の mount target にできること。
- `label` が `this.params` から Vue props へ渡ること。
- Vue runtime が shared chunk になる場合も相対 import で解決できること。

## リメイク版で観測すること

- 同じ入力意図の Vue Stanza source が動くこと。
- Vue runtime chunk が direct embed artifact として静的配信上で解決できること。
- `main` mount target と params props が壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/009-vue-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build には documented な `togostanza-build.mjs` から `rollup-plugin-vue` と `@rollup/plugin-replace` を最小注入している。
- `dist/` には `vue-runtime.js`、`vue-runtime.css`、`vue-runtime.html`、`vue-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embed browser 観測では `<togostanza-vue-runtime>` に open shadow root が作られ、shadow root 内の `main` に Vue component が描画された。
- `label="initial-vue"` は Vue props として渡り、`data-probe="label"` に `initial-vue` と表示された。
- stylesheet link は `http://127.0.0.1:4179/dist/vue-runtime.css`。
- console の error / warning は観測されなかった。

## 合格条件

- direct embed HTML 上で `<togostanza-vue-runtime>` に open shadow root が作られる。
- shadow root 内の `main` に Vue component が描画される。
- 初期 params が Vue output に反映される。
- console に致命的な module load error が出ない。

## 記録する差分

- Vue SFC build の成否。
- generated artifact tree。
- shared runtime chunk の有無。
- browser console / shadow root / rendered text。

## 未決定事項

- Vue 以外の framework runtime を追加の検証ケースにするかどうか。
- Vue version 差分を互換対象に含めるかどうか。
