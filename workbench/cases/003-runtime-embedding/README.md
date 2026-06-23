# 003 ランタイム埋め込み

## 目的

Stanza Web Componentが、一般的なWebサイトへ直接埋め込めることを確認する。

## 対応する方針

- `type="module"` scriptと `<togostanza-{id}>` custom elementによる埋め込み形式は利用契約として必須。
- 埋め込み先WebサイトにVite、React、Vue、`npm install`、追加ビルド手順を要求しない。
- ヘルププレビューの実装やUIはランタイム埋め込み形式とは別物として扱う。
- `serve` はローカル確認の入口として維持する。

## 入力条件

- ビルド済みの `dist/` を静的に配信できる状態にする。
- ヘルププレビューではない、最小のHTMLページを用意する。
- HTMLは `<script type="module" src="./{id}.js">` と `<togostanza-{id}>` を直接書く。
- `stanza:menu-placement` が `none` のstanzaも含め、直接埋め込み時に余計なmenu UIが出ないことを見る。

## 検証環境とケース入力

`current-pnpm/` はpnpmで現行版を確認する検証環境として用意する。
`generated-repo/` は001の雛形生成結果を参考にした、現行版用の最小Stanzaリポジトリとして扱う。

```text
current-pnpm/
  mise.toml
  generated-repo/
    package.json
    pnpm-lock.yaml
    common.scss
    runtime-embed.html
    stanzas/
      hello/
        index.js
        metadata.json
        style.scss
        templates/stanza.html.hbs
      menuless-hello/
        index.js
        metadata.json
        style.scss
        templates/stanza.html.hbs
```

`runtime-embed.html` はヘルププレビューとは別の確認用HTMLで、ビルド後の `./dist/hello.js` と `./dist/menuless-hello.js` をmodule scriptとして読み込み、`<togostanza-hello say-to="runtime">` と `<togostanza-menuless-hello say-to="runtime">` を直接配置する。

`menuless-hello` は `metadata.json` に `"stanza:menu-placement": "none"` を持つ。Web側wrapperの `URL_STANZA` 組み立ては利用側ロジックなので、この検証ケースでは扱わない。

`remake/` はリメイク版CLI実装後に、同じ入力意図で作る。

## 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/003-runtime-embedding/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza build --output-path dist
```

ビルド後は、`current-pnpm/generated-repo/runtime-embed.html` を静的配信してブラウザで確認する。確認方法は `serve` または簡易HTTPサーバのどちらでもよいが、ヘルププレビューではなく `runtime-embed.html` を開く。

```sh
mise exec -- pnpm exec togostanza serve
```

または、ビルド生成物の静的配信だけを確認する場合は、観測補助用package scriptを使う。

```sh
mise exec -- pnpm run serve:fixture
```

その場合の確認URL例:

```text
http://localhost:4173/runtime-embed.html
```

## 現行版で観測すること

- module scriptが読み込まれること。
- custom elementが定義されること。
- shadow rootが `open` で作られること。
- StanzaごとのCSSがshadow root内に適用されること。
- ヘルププレビューと直接埋め込みで挙動を混同しないこと。
- `stanza:menu-placement: none` のstanzaをdirect embedしても、ランタイム埋め込み画面に余計なmenu UIが出ないこと。

### 現行版の観測状況

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/003-runtime-embedding/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4173/runtime-embed.html`

### 実行したコマンド

```sh
cd workbench/cases/003-runtime-embedding/current-pnpm/generated-repo
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
- `dist/` には `hello.js`、`menuless-hello.js`、それぞれのCSS/HTML/メタデータ、`index.html`、`-togostanza/*` が生成された。
- `menuless-hello` のdirect embedブラウザ観測も実施した。

### ブラウザ観測結果

- `dist/hello.js` が生成されるか。
  - 生成された。
- `runtime-embed.html` から `dist/hello.js` がmodule scriptとして読み込まれるか。
  - 読み込まれ、`<togostanza-hello say-to="runtime">` が描画された。
- `customElements.get("togostanza-hello")` が定義済みになるか。
  - in-app browserのread-only評価ではregistryの確認が安定しなかったため、custom element registryそのものは未記録。
  - ただし `<togostanza-hello>` にshadow rootが作られているため、element upgradeは完了していると判断する。
- `<togostanza-hello>` にopen shadow rootが作られるか。
  - `host.shadowRoot` を取得できた。
- `say-to="runtime"` が `this.params["say-to"]` として反映されるか。
  - shadow root内の `main` に `Hello, runtime!` と描画された。
- コンソールに致命的なmodule loadエラーが出ないか。
  - エラー/警告は観測されなかった。

### shadow root観測メモ

- shadow rootの直下には `div`、`style`、`link` が観測された。
- stylesheet linkは `http://127.0.0.1:4173/dist/hello.css`。
- shadow root内のtextは `Hello, runtime!` を含む。
- `menuless-hello` もopen shadow rootが作られ、shadow root内の `main` に `Hello without menu, runtime!` と描画された。
- `menuless-hello` のstylesheet linkは `http://127.0.0.1:4173/dist/menuless-hello.css`。
- `menuless-hello` には `togostanza--menu` 要素自体は存在したが、`display: none`、`0x0` でUIとしては表示されなかった。
- `menuless-hello` でもコンソールのエラー/警告は観測されなかった。

## リメイク版で観測すること

- 同じHTMLでcustom elementが動くこと。
- 埋め込み先が追加ビルド手順を持たなくても動くこと。
- frameworkランタイムが必要な場合もStanza配布物側に含まれていること。
- sharedチャンクがある場合、静的ホスティング上の相対importで動くこと。

## 合格条件

- `<togostanza-{id}>` がブラウザ上で描画される。
- shadow rootとstylesheetが確認できる。
- コンソールに致命的なmodule loadエラーが出ない。
- ヘルププレビューのUIに依存せず確認できる。
- `stanza:menu-placement: none` のdirect embedでmenu UIが表示されない。

## 記録する差分

- 確認URL。
- HTML snippet。
- network requestの主要path。
- ブラウザコンソールの警告/エラー。
- shadow rootと描画結果の観測メモ。

## 未決定事項

- `serve` のCORS、HMR、watch、livereloadの詳細。
- in-app browser以外のブラウザ検証をどの段階で行うか。
