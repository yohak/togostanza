# 005 StanzaソースAPI

## 目的

既存Stanzaソースが依存しているStanza base APIを確認する。

## 対応する方針

- 既存Stanzaソースは、可能な限り変更しない。
- `import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` を維持する。
- `this.params`、`this.root`、`this.element`、`this.renderTemplate`、`this.query`、`this.importWebFontCSS`、`this.handleAttributeChange` を維持する。
- Handlebars templateを維持する。

## 入力条件

- 代表的なStanzaソースを用意する。
- `templates/*.hbs`、`style.scss`、`index.js` を使う。
- 必要に応じて `index.ts`、`index.tsx` の検証stanzaを追加する。

## 現行版で観測すること

- `this.root.querySelector("main")` が使えること。
- `this.element` がcustom elementを指すこと。
- `this.renderTemplate({ template, parameters })` が使えること。
- method未指定の `this.query()` が `POST` になること。
- `this.importWebFontCSS(cssUrl)` の注入結果。
- `this.handleAttributeChange(name, oldValue, newValue)` の呼ばれ方。

## リメイク版で観測すること

- 同じStanzaソースが小規模な手修正なし、または説明可能な手修正だけで動くこと。
- `this.root` と `main` 参照が実プロジェクトで壊れないこと。
- `this.query()` の既定methodが `POST` であること。
- lifecycle hookとtemplate renderingが維持されること。

## 合格条件

- 既存StanzaソースAPIが同じ名前で利用できる。
- `this.query()` の既定methodが維持される。
- `renderTemplate` とHandlebars templateが動く。
- `importWebFontCSS()` と `handleAttributeChange()` が呼び出し可能である。

## 記録する差分

- Stanzaソースの変更有無。
- APIごとの観測結果。
- ブラウザコンソール/network request。
- template renderingの出力。
- lifecycle hookの呼び出し順。

## 未決定事項

- `importWebFontCSS()` のlink注入先と重複制御。
- `handleAttributeChange()` の既定再描画やdebounceの詳細。

## ケース入力と観測補助

`current-pnpm/` はpnpmで現行版を確認する検証環境として用意する。
`generated-repo/` に現行版 `togostanza` 用の最小Stanzaリポジトリを置く。

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

`current-pnpm/generated-repo/package.json` は `togostanza` を `github:togostanza/togostanza` として参照し、`current-pnpm/mise.toml` はNode.jsの18系とpnpmの9系を指定する。

`current-pnpm/generated-repo/fixtures/source-api.html` はビルド後の `../dist/api-probe.js` を直接読み込み、ヘルププレビューではなく通常のHTML埋め込みとしてStanzaソースAPIを確認する。
この観測補助HTMLはquery endpointあり/なしの2つの `<togostanza-api-probe>` と、属性変更用の操作ボタンを持つ。

## API観測範囲

- `this.params`: `label`、`limit`、`enabled`、`payload`、`query-endpoint` を `metadata.json` に定義し、`index.js` からtemplateパラメーターに渡して `templates/stanza.html.hbs` に出力する。
- `this.root`: render前後で `this.root?.querySelector("main")` を確認し、render後の `main.dataset.apiProbeRoot` を更新する。
- `this.element`: `this.element?.tagName` をtemplateに出力し、render後の `main.dataset.apiProbeElement` にも記録する。
- `this.renderTemplate`: `templates/stanza.html.hbs` を `this.renderTemplate({ template, parameters })` で描画し、`data-probe` 付き要素へ観測値を出力する。
- `this.importWebFontCSS`: `./assets/api-probe-font.css` をrender内で注入する。
- `this.handleAttributeChange`: overrideして最後の `name`、`oldValue`、`newValue` を記録し、`super.handleAttributeChange(...)` を呼ぶ。記録値は次回renderのtemplateパラメーターに渡す。
- `this.query()`: `query-endpoint` が指定された場合に `templates/query.sparql.hbs` を使い、method未指定で `this.query({ template, parameters, endpoint })` を呼ぶ。`query-endpoint` 未指定時は `not-run` としてtemplateに出力する。

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

ビルド後、生成された現行版stanzaをブラウザで開き、template出力、DOM dataset、font CSS link注入、属性変更、`this.query()` のnetwork methodを確認する。

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

`mise.toml` は `current-pnpm/` に置き、Node.jsの18系とpnpmの9系を固定している。

`mise trust`、`install`、`build`、ローカルHTTPサーバーは、Codex sandboxの権限制約、network制限、またはwatcher制限を避けるため、承認済みの通常コマンド実行で行った。

### ビルド結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルド時にSass deprecation警告が多数出た。
- `dist/` には `api-probe.js`、`api-probe.js.map`、`api-probe.css`、`api-probe.html`、`api-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

ローカルブラウザ観測サーバ:

```sh
mise exec -- pnpm run serve:fixture
```

URL: `http://127.0.0.1:4175/fixtures/source-api.html`.

ローカルサーバは `/sparql` も処理し、`this.query()` 観測用にrequest method、content type、bodyを記録した。

## 観測結果

- `mise trust`、Node.js 18系選択、pnpm 9系選択は検証環境で動作した。
- ケース入力のソースは、import形状を変えずに対象StanzaソースAPIを扱う。import形状は `import Stanza from 'togostanza/stanza'` と `export default class ApiProbe extends Stanza`。
- 依存インストールとビルドは、承認済みの実行環境でリポジトリの通常コマンドとして確認した。
- 現行版検証環境のブラウザ確認は完了している。

### ブラウザ観測

初期観測状態:

- queryなしstanzaは `query` status `not-run` として描画された。
- queryありstanzaは `query` status `ok` として描画された。
- どちらのstanzaもopen shadow rootを持っていた。
- `this.element` は `togostanza-api-probe` として描画された。
- `this.root` は `true` として描画された。
- `this.root.querySelector("main")` は `true` として描画された。
- render後、`main.dataset.apiProbeRoot` は `available` だった。
- render後、`main.dataset.apiProbeElement` は `TOGOSTANZA-API-PROBE` だった。
- `this.renderTemplate({ template, parameters })` は期待した `data-probe` 値を描画した。
- `this.params` の値は次のように観測された。
  - `label`: string.
  - `limit`: `number` パラメーター由来のnumber相当の描画値。
  - `enabled`: boolean属性が存在するとき `true`。
  - `payload`: parse済みJSONを `JSON.stringify` で再描画した値。
- `this.importWebFontCSS('./assets/api-probe-font.css')` はshadow rootに `dist/assets/api-probe-font.css` を注入した。
- 通常stylesheet linkとして `dist/api-probe.css` も存在した。
- ブラウザコンソールのエラー/警告は観測されなかった。

`this.query()` の観測:

- method未指定時、`this.query()` は `POST` を送信した。
- request content typeは `application/x-www-form-urlencoded` だった。
- request bodyには、templateから描画されたSPARQL queryが `query=...` として含まれた。
- 初期query bodyには `LIMIT 3` が含まれた。
- `limit` を `5` に変更した後のquery bodyには `LIMIT 5` が含まれた。

属性変更の観測:

| 操作 | render count | 最後のattribute | 観測値 |
| --------- | ------------ | -------------- | -------------- |
| `label="after-mutation"` を設定 | `2` | `label`, old `before-mutation`, new `after-mutation` | `stringParam` は `after-mutation` になった |
| `limit="5"` を設定 | `3` | `limit`, old `3`, new `5` | `numberParam` は `5` になった |
| `enabled` を削除 | `4` | `enabled` | `booleanParam` は `false` になった |
| 変更後の `payload` JSONを設定 | `5` | `payload`, old initial JSON, new changed JSON | `jsonParam` は変更後JSONになった |

`importWebFontCSS()` の重複挿入挙動:

- 初回renderでは、対象shadow rootに `dist/assets/api-probe-font.css` linkが1つ作られた。
- その後の各renderで、同じ `dist/assets/api-probe-font.css` linkが追加された。
- この検証ケースでは重複抑止は観測されなかった。

## 未確認事項

- `importWebFontCSS()` のlink重複挿入を互換必須の詳細とするか、現行実装の詳細に留めるか。
- boolean属性削除時の `handleAttributeChange()` `oldValue` / `newValue` を厳密に見る必要がある場合は、`null` と空文字を区別して描画するケース入力を追加する。現在のtemplateは `|| ''` を使うため、削除は `booleanParam: false` では見えるが、`newValue` のdistinctな描画値としては見えない。
