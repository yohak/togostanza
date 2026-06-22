# リポジトリメモ: metastanza

確認日: 2026-06-22

**metastanza** の既存 Stanza source と生成物を、TogoStanza remake の互換性判断材料として読み取り専用で調査したメモ。

## リポジトリの役割

- 参照元: `references/metastanza`
- 役割: D3 / Vega / Vue を含む可視化 Stanza 群の実プロジェクト。
- 調査方針: 実プロジェクト全体を `workbench/cases/` にコピーしない。小さな契約だけを既存 001-007 へ還元するか、後段で小粒な fixture に切り出す。

## 共通メモ

- リポジトリ状態: `references/metastanza` に source、`references/metastanza/dist` に生成済み artifact、`references/metastanza/node_modules` が存在する。
- 読み取り観測のみ実施。build / serve / preview は実行していない。
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
- 環境メモ:
  - `package.json` の `engines.node` は `>=14`。
  - `dependencies.togostanza` は `^3.0.0-beta.42`。
  - `dependencies.togostanza-utils` は `github:togostanza/togostanza-utils`。
  - `package.json` に build / dev / serve script は定義されていない。lint 系 script のみ。

## 実利用固有メモ

### Stanza source 概要

- Stanza 数: 10
- 入口はすべて `stanzas/*/index.js`。
- すべて `import Stanza from "togostanza/stanza"` で現行 Stanza base class を直接継承する。
- `pagination-table` と `scroll-table` は Vue component (`app.vue` など) を `createApp()` で `this.root.querySelector("main")` に mount する。
- そのほかは主に D3 / Vega / template 出力を組み合わせる。

### 生成物概要

`references/metastanza/dist` に各 stanza の既存生成物がある。

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

### TogoStanza 契約依存

| 観点 | 観測 | 分類 | 影響範囲 | fixture 化の切り出し方 |
| ---- | ---- | ---- | ---- | ---- |
| `this.params` | 10 stanza すべての `index.js` で利用。metadata の parameter / style を runtime 値として読む。 | 互換必須 | 既存 Stanza source 全般。特に number / boolean / single-choice / color / text。 | 既存 004 / 005 に還元。metadata に parameter と style を混在させ、`this.params` で読める最小 stanza。 |
| `this.root` | 10 stanza すべてで利用。`querySelector("main")`、`.marks`、`#scorecardSvg` などに依存。 | 互換必須 / fixture 対象 | Shadow DOM 内の初期 DOM 構造、template 出力後の DOM 操作。 | 既存 005 に `this.root.querySelector("main")` と任意 selector の DOM 操作を残す。Vue mount は別小粒 fixture 候補。 |
| `this.root.querySelector("main")` | `barchart` / `linechart` / `pagination-table` / `piechart` / `scatterplot` / `scorecard` / `scroll-table` / `text` / `tree` などで確認。 | 互換必須 | runtime が `main` を用意する前提。 | 005 の source-api fixture で維持。Vue runtime fixture では mount target として確認。 |
| `renderTemplate()` | `hash-table`、`scorecard`、`text` で利用。 | 互換必須 | hbs template 出力とその後の DOM 操作。 | 005 に既に対応。追加するなら template 出力後に `this.root` で要素を取得する最小例。 |
| `importWebFontCSS()` | `text` が KaTeX CSS を注入。 | 互換必須 | Shadow DOM への external stylesheet link 注入。 | 005 に既に対応。URL を外部フォントではなく fixture asset にして安定化する。 |
| `this.query()` | 対象 source では未検出。 | 既存 005 で維持、実プロジェクト由来では追加根拠なし | なし | 追加 fixture 不要。 |
| `handleAttributeChange()` | 対象 source では未検出。 | 既存 005 で維持、実プロジェクト由来では追加根拠なし | なし | 追加 fixture 不要。 |
| `stanza:type` / `stanza:parameter` | 10 metadata すべてに `stanza:parameter`。parameter type は `single-choice` / `number` / `boolean` / `text`。style type は `color` / `number` / `text` / `single-choice`。 | 互換必須 | menu / parameter parsing / `this.params`。 | 004 に boolean / number / text / choice、005 に style 値の `this.params` 反映を追加候補。 |
| `stanza:menu-placement` | 全 stanza が `bottom-right`。 | fixture / regression 対象 | help page / menu 表示。 | 002 の help artifact 観測に補足、または menu-placement だけの小粒 case。 |
| asset 参照 | `pagination-table/assets/test.json` が source と dist に存在。`text` は `togostanza-utils/spinner.png` import。 | fixture / regression 対象 | JS asset import、stanza local asset copy、依存 package 内 asset import。 | 007 の観測要件に package asset import を追加する。`togostanza-utils` 関数 API 互換とは分離する。 |
| style / CSS 出力 | 多くの `style.scss` が `@use '@/common.scss'` に依存。dist には各 `{id}.css`。 | fixture / regression 対象 / migration note 候補 | Sass alias、CSS artifact、Shadow DOM stylesheet link。 | 007 に `@/common.scss` alias を小さく切り出す。 |
| Vue runtime | `pagination-table` / `scroll-table` が Vue 3 SFC と `createApp()` を利用。dist に `runtime-dom.esm-bundler-29a485e3.js`。 | fixture / regression 対象 | framework runtime bundling、shared chunk、Shadow DOM mount。 | 新しい小粒 case 候補: Vue SFC 1 stanza + `this.root.querySelector("main")` mount。 |
| `togostanza-utils` | `loadData`、`appendCustomCss`、`downloadBlob`、`getStanzaColors` などを利用。 | 別調査 | 現行 ecosystem 依存。remake が直接提供しない場合の移行説明。 | `docs/investigation/repositories/togostanza-utils.md` で関数 API を別調査する。 |

### Inventory

| source path | generated artifact path | 依存している TogoStanza 契約 | 分類 | 影響範囲 | 最小 fixture 化する場合の切り出し方 | 通常 build / dev / preview 手順 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `references/metastanza/stanzas/barchart/index.js` | `references/metastanza/dist/barchart.js` | `this.params`, `this.root.querySelector("main")`, metadata parameter/style, CSS artifact | 互換必須 / fixture 候補 | D3/Vega 系描画、`main` DOM 前提 | D3/Vega は持ち込まず、`main` 取得と width/height params だけの最小 stanza に還元 | `package.json` に build/dev script なし。現時点では未実行 |
| `references/metastanza/stanzas/linechart/index.js` | `references/metastanza/dist/linechart.js` | `this.params`, `this.root`, metadata parameter/style, `@/common.scss` | 互換必須 / fixture 候補 | number / single-choice parameter と CSS alias | 004/007 に還元。choice + number + `@/common.scss` の最小 source | 同上 |
| `references/metastanza/stanzas/scatterplot/index.js` | `references/metastanza/dist/scatterplot.js` | `this.params`, boolean parameter, `this.root`, metadata style | 互換必須 / fixture 候補 | boolean parsing、D3/Vega 系描画 | 004 に boolean attribute と metadata default の実例として追加候補 | 同上 |
| `references/metastanza/stanzas/hash-table/index.js` | `references/metastanza/dist/hash-table.js` | `renderTemplate()`, `this.params`, metadata style, `@/common.scss` | 互換必須 / fixture 候補 | hbs template 出力、style params | 005 に template + style param 出力だけ切り出す | 同上 |
| `references/metastanza/stanzas/scorecard/index.js` | `references/metastanza/dist/scorecard.js` | `renderTemplate()`, `this.root`, `loadData`, `appendCustomCss` | 互換必須 / migration note 候補 | template 後 DOM 操作、custom CSS URL | 005 に `renderTemplate()` 後 DOM 取得。`appendCustomCss` は migration note 候補 | 同上 |
| `references/metastanza/stanzas/text/index.js` | `references/metastanza/dist/text.js` | `renderTemplate()`, `importWebFontCSS()`, asset import (`spinner.png`), metadata style | 互換必須 / fixture 候補 | external CSS injection、package asset import | 005 に `importWebFontCSS()`、007 に package asset import を小さく追加候補 | 同上 |
| `references/metastanza/stanzas/pagination-table/index.js` + `app.vue` | `references/metastanza/dist/pagination-table.js`, `dist/pagination-table/assets/test.json` | `this.params`, `this.root.querySelector("main")`, Vue `createApp()`, local asset copy | fixture / regression 対象 | Vue runtime bundling、SFC、local asset | 新規小粒 case 候補: Vue SFC 1 component + local JSON asset | 同上 |
| `references/metastanza/stanzas/scroll-table/index.js` + `app.vue` | `references/metastanza/dist/scroll-table.js` | `this.params`, `this.root.querySelector("main")`, Vue `createApp()`, `appendCustomCss` | fixture / regression 対象 / migration note 候補 | Vue runtime bundling、custom CSS URL | `pagination-table` と重複するため fixture はどちらか 1 つで十分 | 同上 |
| `references/metastanza/stanzas/piechart/index.js` / `tree/index.js` | `references/metastanza/dist/piechart.js`, `dist/tree.js` | `this.params`, `this.root`, `loadData`, metadata style | 互換必須 / fixture 候補 | data-url/data-type params、DOM 描画 | 既存 004/005 に還元。D3 描画自体は持ち込まない | 同上 |
| `references/metastanza/stanzas/*/style.scss` | `references/metastanza/dist/*.css` | Sass `@use '@/common.scss'`, CSS artifact | migration note 候補 / fixture 対象 | alias 解決、CSS 出力 | 007 に `@/common.scss` alias 最小例を追加候補 | 同上 |

## 実行メモ

今回の調査では実プロジェクトを build していない。既存 source と生成済み artifact の読み取り観測に留めた。

通常 build / dev / preview 手順は `package.json` に明示されていない。後段で実行確認する場合は、現行 `togostanza` の通常入口 (`togostanza build`, `togostanza serve`) を使うべきか、metastanza 固有の公開手順が別にあるかを先に確認する。

## このリポジトリの未解決事項

- `metastanza` の正規 build / dev / preview 手順が `package.json` / README からは特定できない。
- `togostanza-utils` 関数 API を remake 互換に含めるか、migration note として分離するかは [togostanza-utils 調査](./togostanza-utils.md) で扱う。
- Vue SFC runtime を既存 007 に含めるか、新しい小粒 case にするかは後続判断。
