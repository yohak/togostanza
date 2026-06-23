# 009 Vue runtime

## 目的

Vue SFCを使う既存Stanza sourceが、TogoStanza runtimeのShadow DOM内 `main` にmountできることを確認する。

## 対応する方針

- Vue SFCと `createApp()` をStanza source内で利用できることを確認する。
- `this.root.querySelector("main")` はVue mount targetとして維持する。
- `this.params` をVue component propsへ渡せることを確認する。
- framework runtime chunkがdirect embed artifactとして解決できることを確認する。
- asset/package asset importの観測は007に寄せる。

## 入力条件

- `current-pnpm/generated-repo/` にVue runtime観測用の最小Stanzaリポジトリを置く。
- Stanza entryは `stanzas/vue-runtime/index.js`、Vue componentは `App.vue` とする。
- `vue` / `@vue/compiler-sfc` / `rollup-plugin-vue` を `package.json` に置く。
- help previewではなく、`fixtures/vue-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` がVue SFC importを処理できること。
- `dist/vue-runtime.js` が生成され、direct embedでcustom elementがupgradeされること。
- `this.root.querySelector("main")` をVue `createApp()` のmount targetにできること。
- `label` が `this.params` からVue propsへ渡ること。
- Vue runtimeがshared chunkになる場合も相対importで解決できること。

## リメイク版で観測すること

- 同じ入力意図のVue Stanza sourceが動くこと。
- Vue runtime chunkがdirect embed artifactとして静的配信上で解決できること。
- `main` mount targetとparams propsが壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/009-vue-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- buildにはドキュメント化された `togostanza-build.mjs` から `rollup-plugin-vue` と `@rollup/plugin-replace` を最小注入している。
- `dist/` には `vue-runtime.js`、`vue-runtime.css`、`vue-runtime.html`、`vue-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embedブラウザ観測では `<togostanza-vue-runtime>` にopen shadow rootが作られ、shadow root内の `main` にVue componentが描画された。
- `label="initial-vue"` はVue propsとして渡り、`data-probe="label"` に `initial-vue` と表示された。
- stylesheet linkは `http://127.0.0.1:4179/dist/vue-runtime.css`。
- consoleのerror/warningは観測されなかった。

## 合格条件

- direct embed HTML上で `<togostanza-vue-runtime>` にopen shadow rootが作られる。
- shadow root内の `main` にVue componentが描画される。
- 初期paramsがVue outputに反映される。
- consoleに致命的なmodule load errorが出ない。

## 記録する差分

- Vue SFC buildの成否。
- generated artifact tree。
- shared runtime chunkの有無。
- browser console/shadow root/rendered text。

## 未決定事項

- Vue以外のframework runtimeを追加の検証ケースにするかどうか。
- Vue version差分を互換対象に含めるかどうか。
