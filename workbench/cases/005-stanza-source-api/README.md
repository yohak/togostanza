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

## 現行版 fixture

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
この fixture は query endpoint あり / なしの2つの `<togostanza-api-probe>` と、attribute mutation 用の操作ボタンを持つ。

## API coverage

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

Local browser fixture server:

```sh
mise exec -- pnpm run serve:fixture
```

URL: `http://127.0.0.1:4175/fixtures/source-api.html`.

The local server also handled `/sparql` and logged request method, content type, and body for `this.query()` observation.

## Observations

- `mise trust`、Node 18 selection、pnpm 9 selection work for the fixture.
- The fixture source covers the target Stanza source APIs without changing the import shape: `import Stanza from 'togostanza/stanza'` and `export default class ApiProbe extends Stanza`.
- Dependency installation and build were confirmed with the repository's normal command in the approved execution environment.
- Browser confirmation is complete for the current fixture.

### Browser observations

Initial fixture state:

- The no-query stanza rendered with `query` status `not-run`.
- The query stanza rendered with `query` status `ok`.
- Both stanzas had open shadow roots.
- `this.element` rendered as `togostanza-api-probe`.
- `this.root` rendered as `true`.
- `this.root.querySelector("main")` rendered as `true`.
- After render, `main.dataset.apiProbeRoot` was `available`.
- After render, `main.dataset.apiProbeElement` was `TOGOSTANZA-API-PROBE`.
- `this.renderTemplate({ template, parameters })` rendered the expected `data-probe` values.
- `this.params` values were observed as:
  - `label`: string.
  - `limit`: number-like rendered value from `number` parameter.
  - `enabled`: `true` when the boolean attribute was present.
  - `payload`: parsed JSON rendered back with `JSON.stringify`.
- `this.importWebFontCSS('./assets/api-probe-font.css')` injected `dist/assets/api-probe-font.css` into the shadow root.
- The normal stylesheet link was also present as `dist/api-probe.css`.
- Browser console error / warning was not observed.

`this.query()` observation:

- `this.query()` sent `POST` when method was omitted.
- Request content type was `application/x-www-form-urlencoded`.
- Request body contained the template-rendered SPARQL query as `query=...`.
- Initial query body included `LIMIT 3`.
- After changing `limit` to `5`, subsequent query bodies included `LIMIT 5`.

Attribute mutation observations:

| Operation | Render count | Last attribute | Observed value |
| --------- | ------------ | -------------- | -------------- |
| Set `label="after-mutation"` | `2` | `label`, old `before-mutation`, new `after-mutation` | `stringParam` became `after-mutation` |
| Set `limit="5"` | `3` | `limit`, old `3`, new `5` | `numberParam` became `5` |
| Remove `enabled` | `4` | `enabled` | `booleanParam` became `false` |
| Set changed `payload` JSON | `5` | `payload`, old initial JSON, new changed JSON | `jsonParam` became changed JSON |

`importWebFontCSS()` duplicate behavior:

- The initial render produced one `dist/assets/api-probe-font.css` link in the target shadow root.
- Each later render added another identical `dist/assets/api-probe-font.css` link.
- No duplicate suppression was observed in this fixture.

## Pending checks

- Decide whether `importWebFontCSS()` duplicate link insertion is a required compatibility detail or just current implementation behavior.
- If exact `handleAttributeChange()` `oldValue` / `newValue` for removed boolean attributes matters, add a fixture that renders `null` distinctly from empty string. The current template uses `|| ''`, so removal is visible through `booleanParam: false` but not through a distinct rendered `newValue`.
