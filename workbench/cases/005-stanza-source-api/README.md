# 005 Stanza source API

## 目的

既存 Stanza source が依存している Stanza base API を確認する。

## 対応する方針

- 既存 Stanza source は、可能な限り変更しない。
- `import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` を維持する。
- `this.params`、`this.root`、`this.element`、`this.renderTemplate`、`this.query`、`this.importWebFontCSS`、`this.handleAttributeChange` を維持する。
- Handlebars template を維持する。

## 入力条件

- 代表的な Stanza source を用意する。
- `templates/*.hbs`、`style.scss`、`index.js` を使う。
- 必要に応じて `index.ts`、`index.tsx` の検証 stanza を追加する。

## 現行版で観測すること

- `this.root.querySelector("main")` が使えること。
- `this.element` が custom element を指すこと。
- `this.renderTemplate({ template, parameters })` が使えること。
- method 未指定の `this.query()` が `POST` になること。
- `this.importWebFontCSS(cssUrl)` の注入結果。
- `this.handleAttributeChange(name, oldValue, newValue)` の呼ばれ方。

## リメイク版で観測すること

- 同じ Stanza source が小規模な手修正なし、または説明可能な手修正だけで動くこと。
- `this.root` と `main` 参照が実プロジェクトで壊れないこと。
- `this.query()` の既定 method が `POST` であること。
- lifecycle hook と template rendering が維持されること。

## 合格条件

- 既存 Stanza source API が同じ名前で利用できる。
- `this.query()` の既定 method が維持される。
- `renderTemplate` と Handlebars template が動く。
- `importWebFontCSS()` と `handleAttributeChange()` が呼び出し可能である。

## 記録する差分

- Stanza source の変更有無。
- API ごとの観測結果。
- browser console / network request。
- template rendering の出力。
- lifecycle hook の呼び出し順。

## 未決定事項

- `importWebFontCSS()` の link 注入先と重複制御。
- `handleAttributeChange()` の既定再描画や debounce の詳細。

## ケース入力と観測補助

`current-pnpm/` は pnpm で現行版を確認する検証環境として用意する。
`generated-repo/` に現行版 `togostanza` 用の最小 stanza repository を置く。

```text
current-pnpm/
  mise.toml
  generated-repo/
    .gitignore
    README.md
    common.scss
    fixtures/
      source-api.html
    package.json
    pnpm-lock.yaml
    stanzas/
      api-probe/
        README.md
        index.js
        metadata.json
        style.scss
        assets/
          api-probe-font.css
        templates/
          query.sparql.hbs
          stanza.html.hbs
```

`current-pnpm/generated-repo/.gitignore` で `node_modules/`、`dist/`、`.cache/`、`*.log` を除外する。

`current-pnpm/generated-repo/package.json` は `togostanza` を `github:togostanza/togostanza` として参照し、`current-pnpm/mise.toml` は Node 18 と pnpm 9 を指定する。

`current-pnpm/generated-repo/fixtures/source-api.html` は build 後の `../dist/api-probe.js` を直接読み込み、help preview ではなく通常の HTML 埋め込みとして Stanza source API を確認する。
この観測補助HTMLは query endpoint あり / なしの2つの `<togostanza-api-probe>` と、attribute mutation 用の操作ボタンを持つ。

## API 観測範囲

- `this.params`: `label`、`limit`、`enabled`、`payload`、`query-endpoint` を `metadata.json` に定義し、`index.js` から template parameter に渡して `templates/stanza.html.hbs` に出力する。
- `this.root`: render 前後で `this.root?.querySelector("main")` を確認し、render 後の `main.dataset.apiProbeRoot` を更新する。
- `this.element`: `this.element?.tagName` を template に出力し、render 後の `main.dataset.apiProbeElement` にも記録する。
- `this.renderTemplate`: `templates/stanza.html.hbs` を `this.renderTemplate({ template, parameters })` で描画し、`data-probe` 付き要素へ観測値を出力する。
- `this.importWebFontCSS`: `./assets/api-probe-font.css` を render 内で注入する。
- `this.handleAttributeChange`: override して最後の `name`、`oldValue`、`newValue` を記録し、`super.handleAttributeChange(...)` を呼ぶ。記録値は次回 render の template parameter に渡す。
- `this.query()`: `query-endpoint` が指定された場合に `templates/query.sparql.hbs` を使い、method 未指定で `this.query({ template, parameters, endpoint })` を呼ぶ。`query-endpoint` 未指定時は `not-run` として template に出力する。

## 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/005-stanza-source-api/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza build --output-path dist
```

build 後、生成された現行版 stanza を browser で開き、template 出力、DOM dataset、font CSS link 注入、attribute change、`this.query()` の network method を確認する。

## 現行版の観測状況

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/005-stanza-source-api/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4175/fixtures/source-api.html`

### 実行したコマンド

```sh
cd workbench/cases/005-stanza-source-api/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm run serve:fixture
```

`mise.toml` は `current-pnpm/` に置き、Node 18 と pnpm 9 を固定している。

`mise trust`、`install`、`build`、local HTTP server は、Codex sandbox の権限制約、network 制限、または watcher 制限を避けるため、承認済みの通常コマンド実行で行った。

### build 結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build 時に Sass deprecation warning が多数出た。
- `dist/` には `api-probe.js`、`api-probe.js.map`、`api-probe.css`、`api-probe.html`、`api-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

ローカルブラウザ観測サーバ:

```sh
mise exec -- pnpm run serve:fixture
```

URL: `http://127.0.0.1:4175/fixtures/source-api.html`.

ローカルサーバは `/sparql` も処理し、`this.query()` 観測用に request method、content type、body を記録した。

## 観測結果

- `mise trust`、Node 18 選択、pnpm 9 選択は検証環境で動作した。
- ケース入力の source は、import 形状を変えずに対象 Stanza source API を扱う。import 形状は `import Stanza from 'togostanza/stanza'` と `export default class ApiProbe extends Stanza`。
- 依存 install と build は、承認済みの実行環境で repository の通常コマンドとして確認した。
- 現行版検証環境のブラウザ確認は完了している。

### ブラウザ観測

初期観測状態:

- query なし stanza は `query` status `not-run` として描画された。
- query あり stanza は `query` status `ok` として描画された。
- どちらの stanza も open shadow root を持っていた。
- `this.element` は `togostanza-api-probe` として描画された。
- `this.root` は `true` として描画された。
- `this.root.querySelector("main")` は `true` として描画された。
- render 後、`main.dataset.apiProbeRoot` は `available` だった。
- render 後、`main.dataset.apiProbeElement` は `TOGOSTANZA-API-PROBE` だった。
- `this.renderTemplate({ template, parameters })` は期待した `data-probe` 値を描画した。
- `this.params` の値は次のように観測された。
  - `label`: string.
  - `limit`: `number` parameter 由来の number 相当の描画値。
  - `enabled`: boolean attribute が存在するとき `true`。
  - `payload`: parse 済み JSON を `JSON.stringify` で再描画した値。
- `this.importWebFontCSS('./assets/api-probe-font.css')` は shadow root に `dist/assets/api-probe-font.css` を注入した。
- 通常 stylesheet link として `dist/api-probe.css` も存在した。
- browser console の error / warning は観測されなかった。

`this.query()` の観測:

- method 未指定時、`this.query()` は `POST` を送信した。
- request content type は `application/x-www-form-urlencoded` だった。
- request body には、template から描画された SPARQL query が `query=...` として含まれた。
- 初期 query body には `LIMIT 3` が含まれた。
- `limit` を `5` に変更した後の query body には `LIMIT 5` が含まれた。

attribute mutation 観測:

| 操作 | render count | 最後の attribute | 観測値 |
| --------- | ------------ | -------------- | -------------- |
| `label="after-mutation"` を設定 | `2` | `label`, old `before-mutation`, new `after-mutation` | `stringParam` は `after-mutation` になった |
| `limit="5"` を設定 | `3` | `limit`, old `3`, new `5` | `numberParam` は `5` になった |
| `enabled` を削除 | `4` | `enabled` | `booleanParam` は `false` になった |
| 変更後の `payload` JSON を設定 | `5` | `payload`, old initial JSON, new changed JSON | `jsonParam` は変更後 JSON になった |

`importWebFontCSS()` の重複挿入挙動:

- 初回 render では、対象 shadow root に `dist/assets/api-probe-font.css` link が1つ作られた。
- その後の各 render で、同じ `dist/assets/api-probe-font.css` link が追加された。
- この検証ケースでは重複抑止は観測されなかった。

## 未確認事項

- `importWebFontCSS()` の link 重複挿入を互換必須の詳細とするか、現行実装の詳細に留めるか。
- boolean attribute 削除時の `handleAttributeChange()` `oldValue` / `newValue` を厳密に見る必要がある場合は、`null` と空文字を区別して描画するケース入力を追加する。現在の template は `|| ''` を使うため、削除は `booleanParam: false` では見えるが、`newValue` の distinct な描画値としては見えない。
