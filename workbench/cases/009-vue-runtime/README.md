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
- Vue SFC `<style>` がShadow DOM内の描画へ適用されること。
- package testでは同じ入力意図の `vue-runtime-probe` fixtureを使う。現行版観測入力の `vue-runtime` という名前そのものへの一致は合格条件にしない。

### リメイク版の観測状況

- 確認日: 2026-07-01
- 確認範囲: package test内のVue SFC fixture。
- `package/src/cli/router.spec.ts` で、`.vue` importを持つStanzaが `togostanza build` で生成物を作れることを確認した。
- Vue SFC処理はCLI側のbuild runtime dependencyである `@vitejs/plugin-vue` で扱う。
- `@vitejs/plugin-vue` のpeer dependencyを満たすため、CLI側にも `vue` をbuild runtime dependencyとして置く。
- fixtureのStanzaソースがimportする `vue` は、一時Stanzaリポジトリ側の `node_modules/` へsymlinkした実Vueで確認した。StanzaソースのVue runtime解決はStanzaリポジトリ側dependenciesで担う。
- 生成された `dist/vue-runtime-probe.js` にはVue component本文、Vue runtime、runtime登録がbundleされ、bare import `vue` / `./App.vue` は残らなかった。
- Vue SFC `<style>` はVite生成CSSを `{id}.css` へ集約する方針にし、`dist/vue-runtime-probe.css` に `.vue-runtime-probe` のstyleが入ることを確認した。
- `package/test/browser/custom-element.smoke.spec.ts` で、direct embedから `<togostanza-vue-runtime-probe>` がupgradeされ、open Shadow DOM内 `main` へVue componentを描画できることを確認した。
- 初期属性 `label="initial-vue"` が `this.params` を経由してVue propsへ渡り、表示へ反映された。
- Shadow DOM内でVue SFC `<style>` 由来の `color: rgb(12, 34, 56)` が適用された。

確認コマンド:

- `cd package && mise exec -- pnpm exec vitest run --config vitest.config.ts src/cli/router.spec.ts -t "builds a Vue SFC stanza"`
- `cd package && mise exec -- pnpm exec playwright test --config playwright.config.ts -g "renders a Vue SFC Stanza"`

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

- direct embed HTML上でVue runtime用Stanza custom elementにopen shadow rootが作られる。
- shadow root内の `main` にVue componentが描画される。
- 初期paramsがVue outputに反映される。
- Vue SFC `<style>` がshadow root内の描画へ適用される。
- コンソールに致命的なmodule loadエラーが出ない。

## 記録する差分

- Vue SFC buildの成否。
- 生成物ツリー。
- sharedランタイムチャンクの有無。
- ブラウザコンソール/shadow root/rendered text。
- SFC styleの出力先とShadow DOM内適用結果。
- リメイク版のpackage fixtureでは `-togostanza/` や `index.html` を生成しない。これはPhase 2-1以降のbuild artifact方針に従う。
- リメイク版のpackage fixtureは実Vue packageで確認している。metastanza代表StanzaでのVue SFC互換は012ケースへ送る。

## 未決定事項

- Vue以外のframeworkランタイムを追加の検証ケースにするかどうか。
- Vue version差分を互換対象に含めるかどうか。
- Vue SFC compiler / pluginとStanzaリポジトリ側Vue runtimeのversion整合を、metastanza代表Stanzaでどこまで確認するか。
