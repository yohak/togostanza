# リポジトリメモ: metastanza

確認日: 2026-06-22

**metastanza**の既存Stanzaソースと生成物を、TogoStanza remakeの互換性判断材料として読み取り専用で調査したメモ。

## リポジトリの役割

- 参照元: `references/metastanza`
- 役割: D3 / Vega / Vueを含む可視化Stanza群の実プロジェクト。
- 調査方針: 実プロジェクト全体は `workbench/cases/` にコピーしない。小さな観測契約だけを既存の検証ケースへ還元するか、後段で小粒なケース入力へ抽出する。

## 共通メモ

- リポジトリ状態: `references/metastanza` にソース、`references/metastanza/dist` に生成済みartifact、`references/metastanza/node_modules` が存在する。
- 読み取り観測のみ実施。build / serve / previewは実行していない。
- 関連コマンド:
  - `find references/metastanza ...`
  - `rg ... references/metastanza ...`
  - `jq ... references/metastanza/package.json`
- 重要なパス:
  - `references/metastanza/stanzas/*/index.js`
  - `references/metastanza/stanzas/*/metadata.json`
  - `references/metastanza/stanzas/*/style.scss`
  - `references/metastanza/stanzas/*/*.vue`
  - `references/metastanza/lib/*.js`
  - `references/metastanza/dist/*`
- 環境:
  - `package.json` の `engines.node` は `>=14`。
  - `dependencies.togostanza` は `^3.0.0-beta.42`。
  - `dependencies.togostanza-utils` は `github:togostanza/togostanza-utils`。
  - `package.json` にbuild / dev / serve scriptは定義されていない。lint系scriptのみ。

## 実利用固有メモ

### Stanzaソース概要

- Stanza数: 10
- 入口はすべて `stanzas/*/index.js`。
- すべて `import Stanza from "togostanza/stanza"` で現行Stanza base classを直接継承する。
- `pagination-table` と `scroll-table` は、Vue component（`app.vue` など）を `createApp()` で `this.root.querySelector("main")` にマウントする。
- そのほかは主にD3 / Vega / template出力を組み合わせる。

### 生成物概要

`references/metastanza/dist` に各stanzaの既存生成物がある。

```text
dist/
  {id}.js
  {id}.js.map
  {id}.css
  {id}.html
  {id}/metadata.json
  -togostanza/help-app.js
  -togostanza/index-app.js
  index.html
  index-30c3ca2a.js
  load-data-e62ae391.js
  runtime-dom.esm-bundler-29a485e3.js
  vega-embed.module-d6168f24.js
```

`pagination-table` では `dist/pagination-table/assets/test.json` も確認した。

### TogoStanza契約依存

| 観点 | 観測 | 判断材料 | 影響範囲 | ケース入力への抽出案 |
| ---- | ---- | ---- | ---- | ---- |
| `this.params` | 10 stanzaすべての `index.js` で利用。メタデータのパラメーター / styleをランタイム値として読む。 | 既存ソース互換の強い根拠 | 既存Stanzaソース全般。特にnumber / boolean / single-choice / color / text。 | 既存004 / 005に還元。メタデータにパラメーターとstyleを混在させ、`this.params` で読める最小stanza。 |
| `this.root` | 10 stanzaすべてで利用。`querySelector("main")`、`.marks`、`#scorecardSvg` などに依存。 | 既存ソース互換の強い根拠 / ケース入力候補 | Shadow DOM内の初期DOM構造、template出力後のDOM操作。 | 既存005に `this.root.querySelector("main")` と任意selectorのDOM操作を残す。Vueマウントは別の小粒な検証ケース候補。 |
| `this.root.querySelector("main")` | `barchart` / `linechart` / `pagination-table` / `piechart` / `scatterplot` / `scorecard` / `scroll-table` / `text` / `tree` などで確認。 | 既存ソース互換の強い根拠 | ランタイムが `main` を用意する前提。 | 005のsource-api検証ケースで維持。Vueランタイム検証ケースではマウント対象として確認。 |
| `renderTemplate()` | `hash-table`、`scorecard`、`text` で利用。 | 既存ソース互換の強い根拠 | hbs template出力とその後のDOM操作。 | 005で対応済み。追加するなら、template出力後に `this.root` で要素を取得する最小例。 |
| `importWebFontCSS()` | `text` がKaTeX CSSを注入。 | 既存ソース互換の強い根拠 | Shadow DOMへのexternal stylesheet link注入。 | 005で対応済み。URLを外部フォントではなく観測補助assetにして安定化する。 |
| `this.query()` | 対象ソースでは未検出。 | 既存005で維持、実プロジェクト由来では追加根拠なし。 | なし | 追加の検証ケース不要。 |
| `handleAttributeChange()` | 対象ソースでは未検出。 | 既存005で維持、実プロジェクト由来では追加根拠なし。 | なし | 追加の検証ケース不要。 |
| `stanza:type` / `stanza:parameter` | 10件のメタデータすべてに `stanza:parameter`。パラメーター型は `single-choice` / `number` / `boolean` / `text`。style型は `color` / `number` / `text` / `single-choice`。 | 既存メタデータ互換の強い根拠 | menu / パラメーター解析 / `this.params`。 | 004にboolean / number / text / choice、005にstyle値の `this.params` 反映を追加候補。 |
| `stanza:menu-placement` | 全stanzaが `bottom-right`。 | リグレッション観測候補 | ヘルプページ / menu表示。 | 002のヘルプ生成物観測に補足、またはmenu-placementだけの小粒な検証ケース。 |
| asset参照 | `pagination-table/assets/test.json` がソースとdistに存在。`text` は `togostanza-utils/spinner.png` をimport。 | リグレッション観測候補 | JS asset import、stanza local asset copy、依存package内asset import。 | 007の観測要件にpackage asset importを追加する。`togostanza-utils` 関数API互換とは分離する。 |
| style / CSS出力 | 多くの `style.scss` が `@use '@/common.scss'` に依存。distには各 `{id}.css`。 | リグレッション観測候補 / 移行メモ判断材料 | Sass alias、CSS生成物、Shadow DOM stylesheet link。 | 007に `@/common.scss` aliasを小さく切り出す。 |
| Vueランタイム | `pagination-table` / `scroll-table` がVue 3 SFCと `createApp()` を利用。distに `runtime-dom.esm-bundler-29a485e3.js`。 | リグレッション観測候補 | frameworkランタイムbundling、sharedチャンク、Shadow DOMマウント。 | 新しい小粒な検証ケース候補: Vue SFC 1 stanza + `this.root.querySelector("main")` マウント。 |
| `togostanza-utils` | `loadData`、`appendCustomCss`、`downloadBlob`、`getStanzaColors` などを利用。 | 別調査 | 現行ecosystem依存。remakeが直接提供しない場合の移行説明。 | `docs/v4-migration/investigation/repositories/togostanza-utils.md` で関数APIを別調査する。 |

### Inventory

| ソースパス | 生成物パス | 依存しているTogoStanza契約 | 判断材料 | 影響範囲 | ケース入力への抽出案 | 通常build / dev / preview手順 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `references/metastanza/stanzas/barchart/index.js` | `references/metastanza/dist/barchart.js` | `this.params`, `this.root.querySelector("main")`, メタデータパラメーター/style, CSS生成物 | 既存ソース互換の強い根拠 / 検証ケース候補 | D3/Vega系描画、`main` DOM前提 | D3/Vegaは持ち込まず、`main` 取得とwidth/height paramsだけの最小stanzaに還元 | `package.json` にbuild/dev scriptなし。現時点では未実行 |
| `references/metastanza/stanzas/linechart/index.js` | `references/metastanza/dist/linechart.js` | `this.params`, `this.root`, メタデータパラメーター/style, `@/common.scss` | 既存ソース互換の強い根拠 / 検証ケース候補 | number / single-choiceパラメーターとCSS alias | 004/007に還元。choice + number + `@/common.scss` の最小ソース | 同上 |
| `references/metastanza/stanzas/scatterplot/index.js` | `references/metastanza/dist/scatterplot.js` | `this.params`, booleanパラメーター, `this.root`, メタデータstyle | 既存ソース互換の強い根拠 / 検証ケース候補 | boolean parsing、D3/Vega系描画 | 004にboolean属性とメタデータ既定値の実例として追加候補 | 同上 |
| `references/metastanza/stanzas/hash-table/index.js` | `references/metastanza/dist/hash-table.js` | `renderTemplate()`, `this.params`, メタデータstyle, `@/common.scss` | 既存ソース互換の強い根拠 / 検証ケース候補 | hbs template出力、style params | 005にtemplate + style param出力だけ切り出す | 同上 |
| `references/metastanza/stanzas/scorecard/index.js` | `references/metastanza/dist/scorecard.js` | `renderTemplate()`, `this.root`, `loadData`, `appendCustomCss` | 既存ソース互換の強い根拠 / migration note判断材料 | template後のDOM操作、custom CSS URL | 005に `renderTemplate()` 後のDOM取得。`appendCustomCss` は `togostanza-utils` 調査に分離 | 同上 |
| `references/metastanza/stanzas/text/index.js` | `references/metastanza/dist/text.js` | `renderTemplate()`, `importWebFontCSS()`, asset import（`spinner.png`）, メタデータstyle | 既存ソース互換の強い根拠 / 検証ケース候補 | external CSS injection、package asset import | 005に `importWebFontCSS()`、007にpackage asset importを小さく追加候補 | 同上 |
| `references/metastanza/stanzas/pagination-table/index.js` + `app.vue` | `references/metastanza/dist/pagination-table.js`, `dist/pagination-table/assets/test.json` | `this.params`, `this.root.querySelector("main")`, Vue `createApp()`, local asset copy | リグレッション観測候補 | Vueランタイムbundling、SFC、local asset | 新規小粒な検証ケース候補: Vue SFC 1 component + local JSON asset | 同上 |
| `references/metastanza/stanzas/scroll-table/index.js` + `app.vue` | `references/metastanza/dist/scroll-table.js` | `this.params`, `this.root.querySelector("main")`, Vue `createApp()`, `appendCustomCss` | リグレッション観測候補 / migration note判断材料 | Vueランタイムbundling、custom CSS URL | `pagination-table` と重複するため、ケース入力はどちらか1つで十分 | 同上 |
| `references/metastanza/stanzas/piechart/index.js` / `tree/index.js` | `references/metastanza/dist/piechart.js`, `dist/tree.js` | `this.params`, `this.root`, `loadData`, メタデータstyle | 既存ソース互換の強い根拠 / 検証ケース候補 | data-url/data-type params、DOM描画 | 既存004/005に還元。D3描画自体は持ち込まない | 同上 |
| `references/metastanza/stanzas/*/style.scss` | `references/metastanza/dist/*.css` | Sass `@use '@/common.scss'`, CSS生成物 | migration note判断材料 / 検証ケース候補 | alias解決、CSS出力 | 007に `@/common.scss` alias最小例を追加候補 | 同上 |

## 実行メモ

今回の調査では実プロジェクトをビルドしていない。既存ソースと生成済み生成物の読み取り観測に留めた。

通常build / dev / preview手順は `package.json` に明示されていない。後段で実行確認する場合は、現行 `togostanza` の通常入口（`togostanza build`, `togostanza serve`）を使うべきか、metastanza固有の公開手順が別にあるかを先に確認する。

## このリポジトリの未解決事項

- `metastanza` の正規build / dev / preview手順が `package.json` / READMEからは特定できない。
- `togostanza-utils` 関数APIをremake互換に含めるか、migration noteとして分離するかは [togostanza-utils調査](./togostanza-utils.md) で扱う。
- Vue SFC runtimeを既存007に含めるか、新しい小粒な検証ケースにするかは後続判断。
