# 003 Runtime embedding

## 目的

Stanza Web Component が、一般的なWebサイトへ直接埋め込めることを確認する。

## 対応する方針

- `type="module"` script と `<togostanza-{id}>` custom element による埋め込み形式は利用契約として必須。
- 埋め込み先Webサイトに Vite、React、Vue、npm install、追加 build step を要求しない。
- help preview の実装やUIは runtime 埋め込み形式とは別物として扱う。
- `serve` はローカル確認の入口として維持する。

## 入力条件

- build 済みの `dist/` を静的に配信できる状態にする。
- help preview ではない、最小のHTMLページを用意する。
- HTML は `<script type="module" src="./{id}.js">` と `<togostanza-{id}>` を直接書く。
- `stanza:menu-placement` が `none` の stanza も含め、直接埋め込み時に余計な menu UI が出ないことを見る。

## Fixture

`current-pnpm/` は pnpm で現行版を確認する検証環境として用意する。
`generated-repo/` は 001 の scaffold 結果を参考にした、現行版用の最小 Stanza repository として扱う。

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

`runtime-embed.html` は help preview とは別の確認用HTMLで、build 後の `./dist/hello.js` と `./dist/menuless-hello.js` を module script として読み込み、`<togostanza-hello say-to="runtime">` と `<togostanza-menuless-hello say-to="runtime">` を直接配置する。

`menuless-hello` は `metadata.json` に `"stanza:menu-placement": "none"` を持つ。Web 側 wrapper の `URL_STANZA` 組み立ては利用側ロジックなので、この case では扱わない。

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

build 後は、`current-pnpm/generated-repo/runtime-embed.html` を静的配信してブラウザで確認する。確認方法は `serve` または簡易HTTPサーバのどちらでもよいが、help preview ではなく `runtime-embed.html` を開く。

```sh
mise exec -- pnpm exec togostanza serve
```

または、build artifact の静的配信だけを確認する場合は、fixture 用 package script を使う。

```sh
mise exec -- pnpm run serve:fixture
```

その場合の確認URL例:

```text
http://localhost:4173/runtime-embed.html
```

## 現行版で観測すること

- module script が読み込まれること。
- custom element が定義されること。
- shadow root が `open` で作られること。
- Stanza ごとの CSS が shadow root 内に適用されること。
- help preview と直接埋め込みで挙動を混同しないこと。
- `stanza:menu-placement: none` の stanza を direct embed しても、runtime 埋め込み画面に余計な menu UI が出ないこと。

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

`mise.toml` は `current-pnpm/` に置き、Node 18 と pnpm 9 を固定している。

`mise trust`、`install`、`build`、local HTTP server は、Codex sandbox の権限制約、network 制限、または watcher 制限を避けるため、承認済みの通常コマンド実行で行った。

### build 結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build 時に Sass deprecation warning が多数出た。
- `dist/` には `hello.js`、`menuless-hello.js`、それぞれの CSS / HTML / metadata、`index.html`、`-togostanza/*` が生成された。
- `menuless-hello` の direct embed browser 観測も実施した。

### ブラウザ観測結果

- `dist/hello.js` が生成されるか。
  - 生成された。
- `runtime-embed.html` から `dist/hello.js` が module script として読み込まれるか。
  - 読み込まれ、`<togostanza-hello say-to="runtime">` が描画された。
- `customElements.get("togostanza-hello")` が定義済みになるか。
  - in-app browser の read-only 評価では registry の確認が安定しなかったため、custom element registry そのものは未記録。
  - ただし `<togostanza-hello>` に shadow root が作られているため、element upgrade は完了していると判断する。
- `<togostanza-hello>` に open shadow root が作られるか。
  - `host.shadowRoot` を取得できた。
- `say-to="runtime"` が `this.params["say-to"]` として反映されるか。
  - shadow root 内の `main` に `Hello, runtime!` と描画された。
- console に致命的な module load error が出ないか。
  - error / warning は観測されなかった。

### shadow root 観測メモ

- shadow root の直下には `div`、`style`、`link` が観測された。
- stylesheet link は `http://127.0.0.1:4173/dist/hello.css`。
- shadow root 内の text は `Hello, runtime!` を含む。
- `menuless-hello` も open shadow root が作られ、shadow root 内の `main` に `Hello without menu, runtime!` と描画された。
- `menuless-hello` の stylesheet link は `http://127.0.0.1:4173/dist/menuless-hello.css`。
- `menuless-hello` には `togostanza--menu` 要素自体は存在したが、`display: none`、`0x0` で UI としては表示されなかった。
- `menuless-hello` でも console の error / warning は観測されなかった。

## リメイク版で観測すること

- 同じHTMLで custom element が動くこと。
- 埋め込み先が追加 build step を持たなくても動くこと。
- framework runtime が必要な場合も Stanza 配布物側に含まれていること。
- shared chunk がある場合、静的ホスティング上の相対 import で動くこと。

## 合格条件

- `<togostanza-{id}>` がブラウザ上で描画される。
- shadow root と stylesheet が確認できる。
- console に致命的な module load error が出ない。
- help preview のUIに依存せず確認できる。
- `stanza:menu-placement: none` の direct embed で menu UI が表示されない。

## 記録する差分

- 確認URL。
- HTML snippet。
- network request の主要 path。
- browser console の warning / error。
- shadow root と描画結果の観測メモ。

## 未決定事項

- `serve` の CORS、HMR、watch、livereload の詳細。
- in-app browser 以外のブラウザ検証をどの段階で行うか。
