# 009 Vueランタイム

## 目的

Vue SFCを使う既存Stanzaソースが、TogoStanzaランタイムのShadow DOM内 `main` にマウントできることを確認する。

## 対応する方針

- Vue SFCと `createApp()` をStanzaソース内で利用できることを確認する。
- `this.root.querySelector("main")` はVueマウント対象として維持する。
- `this.params` をVue component propsへ渡せることを確認する。
- frameworkランタイムチャンクがdirect embed生成物として解決できることを確認する。
- asset/package asset importの観測は007に寄せる。

## 入力条件

- `current-pnpm/generated-repo/` にVueランタイム観測用の最小Stanzaリポジトリを置く。
- Stanza entryは `stanzas/vue-runtime/index.js`、Vue componentは `App.vue` とする。
- `vue` / `@vue/compiler-sfc` / `rollup-plugin-vue` を `package.json` に置く。
- ヘルププレビューではなく、`fixtures/vue-runtime.html` の直接埋め込みで確認する。

## 現行版で観測すること

- `togostanza build --output-path dist` がVue SFC importを処理できること。
- `dist/vue-runtime.js` が生成され、direct embedでcustom elementがupgradeされること。
- `this.root.querySelector("main")` をVue `createApp()` のマウント対象にできること。
- `label` が `this.params` からVue propsへ渡ること。
- Vueランタイムがsharedチャンクになる場合も相対importで解決できること。

## リメイク版で観測すること

- 同じ入力意図のVue Stanzaソースが動くこと。
- Vueランタイムチャンクがdirect embed生成物として静的配信上で解決できること。
- `main` マウント対象とparams propsが壊れていないこと。

### 現行版の観測状況

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/009-vue-runtime/current-pnpm/generated-repo/`
- `mise exec -- pnpm install` は成功した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルドにはドキュメント化された `togostanza-build.mjs` から `rollup-plugin-vue` と `@rollup/plugin-replace` を最小注入している。
- `dist/` には `vue-runtime.js`、`vue-runtime.css`、`vue-runtime.html`、`vue-runtime/metadata.json`、`index.html`、`-togostanza/*` が生成された。
- direct embedブラウザ観測では `<togostanza-vue-runtime>` にopen shadow rootが作られ、shadow root内の `main` にVue componentが描画された。
- `label="initial-vue"` はVue propsとして渡り、`data-probe="label"` に `initial-vue` と表示された。
- stylesheet linkは `http://127.0.0.1:4179/dist/vue-runtime.css`。
- コンソールのエラー/警告は観測されなかった。

## 合格条件

- direct embed HTML上で `<togostanza-vue-runtime>` にopen shadow rootが作られる。
- shadow root内の `main` にVue componentが描画される。
- 初期paramsがVue outputに反映される。
- コンソールに致命的なmodule loadエラーが出ない。

## 記録する差分

- Vue SFC buildの成否。
- 生成物ツリー。
- sharedランタイムチャンクの有無。
- ブラウザコンソール/shadow root/rendered text。

## 未決定事項

- Vue以外のframeworkランタイムを追加の検証ケースにするかどうか。
- Vue version差分を互換対象に含めるかどうか。
