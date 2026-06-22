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

`current/` に現行版 `togostanza` 用の最小 stanza repository を置く。

```text
current/
  .gitignore
  README.md
  common.scss
  mise.toml
  package.json
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

`current/.gitignore` で `node_modules/`、`dist/`、`.cache/`、`.npm-cache/`、`*.log` を除外する。

`current/package.json` は `togostanza` を `github:togostanza/togostanza` として参照し、`current/mise.toml` は Node 18 を指定する。

## API coverage

- `this.params`: `label`、`limit`、`enabled`、`payload`、`query-endpoint` を `metadata.json` に定義し、`index.js` から template parameter に渡して `templates/stanza.html.hbs` に出力する。
- `this.root`: render 前後で `this.root?.querySelector("main")` を確認し、render 後の `main.dataset.apiProbeRoot` を更新する。
- `this.element`: `this.element?.tagName` を template に出力し、render 後の `main.dataset.apiProbeElement` にも記録する。
- `this.renderTemplate`: `templates/stanza.html.hbs` を `this.renderTemplate({ template, parameters })` で描画し、`data-probe` 付き要素へ観測値を出力する。
- `this.importWebFontCSS`: `./assets/api-probe-font.css` を render 内で注入する。
- `this.handleAttributeChange`: override して最後の `name`、`oldValue`、`newValue` を記録し、`super.handleAttributeChange(...)` を呼ぶ。記録値は次回 render の template parameter に渡す。
- `this.query()`: `query-endpoint` が指定された場合に `templates/query.sparql.hbs` を使い、method 未指定で `this.query({ template, parameters, endpoint })` を呼ぶ。`query-endpoint` 未指定時は `not-run` として template に出力する。

## Planned commands

`current/` で依存関係を取得できる環境になったら、次の順で確認する予定。

```sh
mise exec -- npm install --cache .npm-cache
mise exec -- npx togostanza build --output-path dist
```

build 後、生成された現行版 stanza を browser で開き、template 出力、DOM dataset、font CSS link 注入、attribute change、`this.query()` の network method を確認する。

## Commands run

Repository root:

```sh
mise trust workbench/cases/005-stanza-source-api/current/mise.toml
```

Result: succeeded. `current/mise.toml` was trusted.

`current/`:

```sh
mise exec -- node -v
```

Result: succeeded with `v18.20.4`.

```sh
mise exec -- npm install
```

Result: failed before dependency installation because npm tried to use `/Users/satoshionoda/.npm` and hit `EPERM` under `_cacache/tmp`.

```sh
mise exec -- npm install --cache .npm-cache
```

Result: failed after switching the cache into the fixture directory because the sandbox could not resolve `github.com` for `git --no-replace-objects ls-remote ssh://git@github.com/togostanza/togostanza.git`.

Observed error:

```text
ssh: Could not resolve hostname github.com: -65563
fatal: Could not read from remote repository.
```

## Observations

- `mise trust` and Node 18 selection work for the fixture.
- The fixture source covers the target Stanza source APIs without changing the import shape: `import Stanza from 'togostanza/stanza'` and `export default class ApiProbe extends Stanza`.
- `npm install` has not completed. It is currently blocked by local npm cache ownership when using the default cache, and by network/DNS sandboxing when using fixture-local cache.
- `npx togostanza build --output-path dist` is not run because install has not completed in the normal execution environment.
- Browser confirmation is not run because no build artifact exists yet.

## Pending checks

- Run `mise exec -- npm install` successfully in an environment where `/Users/satoshionoda/.npm` is writable, or run `mise exec -- npm install --cache .npm-cache` where GitHub is reachable.
- Run `mise exec -- npx togostanza build --output-path dist`.
- Open the built stanza in a browser and confirm rendered values for `this.params`, `this.root`, `this.element`, and `this.renderTemplate`.
- Confirm `importWebFontCSS()` link injection target and duplicate behavior in the browser DOM.
- Confirm `handleAttributeChange(name, oldValue, newValue)` call order and whether default re-render/debounce behavior occurs.
- Confirm `this.query()` sends a `POST` request when `query-endpoint` is provided and method is omitted.
