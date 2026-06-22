# 002 Build artifacts

## 目的

`togostanza build` が、Stanza利用者の埋め込みに必要な runtime artifact と、Stanza開発者が期待する生成物配置を作ることを確認する。

## 対応する方針

- `togostanza build` / `togostanza b` は入口として維持する。
- `build --output-path` は維持候補として扱う。
- runtime 用の主要 artifact 配置は利用契約として維持する。
- help preview 側生成物は再設計可能とする。

## 入力条件

- このケースの `current/` と `remake/` に同等の Stanza repository を用意する。
- 少なくとも1つの basic stanza と、runtime 観測用 stanza を含める。
- repository root の `assets/` と stanza 個別 `assets/` を含める。
- 現行版CLIは `current/mise.toml` で Node 18 系に固定する。

## 現行版で観測すること

- `build --output-path dist` の成功 / 失敗。
- `dist/` 配下の主要 artifact。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、`${id}/assets/*`。
- repository root `assets/` から `dist/assets/` へのコピー。
- `${id}.js.map`、`index.html`、`-togostanza/help-app.js` など開発支援寄り生成物。

## リメイク版で観測すること

- 同じ入力から、利用契約上必要な artifact が生成されること。
- `{id}.js` と共有 chunk 一式が、`dist/` 内で相対 import により自己完結すること。
- `${id}.html` が存在すること。
- help preview 側生成物が変わる場合、runtime artifact との差分が説明できること。

## 合格条件

- 一般Webサイトから読み込むための module script と custom element 用 artifact が揃う。
- `${id}.css` が生成される。
- `${id}/metadata.json` が生成される。
- asset 参照が壊れていない。
- source map の有無は必須互換にしない。

## 記録する差分

- `dist/` tree の一覧。
- 主要 artifact の path。
- shared chunk の有無。
- help preview 関連生成物の差分。
- build 時の warning / error。

## 未決定事項

- asset の inline / emit / hash / threshold の詳細。
- help preview 生成物の最終構造。

## 現行版準備メモ

- 確認日: 2026-06-21
- 作業ディレクトリ: `workbench/cases/002-build-artifacts/current/`
- 入力 fixture は 001 の現行版 scaffold を土台にして作った。
- root asset として `assets/root-asset.txt` を追加した。
- stanza 個別 asset として `stanzas/hello/assets/local-asset.txt` と `stanzas/hello-world/assets/local-asset.txt` を追加した。
- Node version は `current/mise.toml` で Node 18 系に固定する。

### 実行したコマンド

```sh
cd workbench/cases/002-build-artifacts/current

mise trust workbench/cases/002-build-artifacts/current/mise.toml
mise exec -- node -v
mise exec -- npm -v
mise exec -- npx togostanza --version
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
mise exec -- npx togostanza b --output-path dist
```

### バージョン

- Node: `v18.20.4`
- npm: `10.7.0`
- togostanza: `3.0.0-beta.57`

### install 結果

`mise exec -- npm install` は成功した。

Node 18 に対して、次の dependency engine warning が出る。

- `chokidar@5.0.0`: `node >= 20.19.0`
- `mktemp@2.0.3`: `node 20 || 22 || 24`
- `readdirp@5.0.0`: `node >= 20.19.0`
- `sass@1.101.0`: `node >=20.19.0`

warning のみで、dependency は `up to date` だった。

### CLI build 結果

`mise exec -- npx togostanza build --output-path dist` は、この実行環境では失敗した。
短縮形の `mise exec -- npx togostanza b --output-path dist` も同じ失敗だった。

```text
Error: EMFILE: too many open files, watch
    at FSWatcher._handle.onchange (node:internal/fs/watchers:207:21)
...
Node.js v18.20.4
```

`build` は内部で Broccoli watcher を起動し、初回 build 成功後に watcher を止める構造になっている。
このため、1回限りの build でも watcher 初期化は避けられない。
この環境では `watchman` は見つからなかった。

### artifact 構造の補助観測

公式CLIコマンドとしての `build` は上記の watcher error で失敗した。
ただし、artifact 構造を確認するため、現行版の内部 `composeTree()` を watcher なしで1回だけ実行したところ、`dist/` は生成できた。
この結果は CLI 成功ではなく、生成物構造の補助観測として扱う。

補助観測で使ったコマンド:

```sh
mise exec -- node --input-type=module -e "import path from 'path'; import broccoli from 'broccoli'; import TreeSync from 'tree-sync'; import { composeTree } from './node_modules/togostanza/src/commands/-build-internal.mjs'; const repositoryDir = path.resolve('.'); const builder = new broccoli.Builder(composeTree(repositoryDir, { environment: 'production' })); try { await builder.build(); new TreeSync(builder.outputPath, 'dist').sync(); } finally { await builder.cleanup(); }"
```

この補助観測では Dart Sass の deprecation warning が多数出た。

### dist tree summary

```text
dist/
  index.html
  hello.js
  hello.js.map
  hello.css
  hello.html
  hello/metadata.json
  hello/assets/local-asset.txt
  hello-world.js
  hello-world.js.map
  hello-world.css
  hello-world.html
  hello-world/metadata.json
  hello-world/assets/local-asset.txt
  assets/root-asset.txt
  stanza-a433efc5.js
  stanza-a433efc5.js.map
  -togostanza/
    Layout-b22dbe15.js
    Layout-b22dbe15.js.map
    help-app.js
    help-app.js.map
    index-app.js
    index-app.js.map
```

### 主要 artifact の観測

- 各 stanza に `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}.html` が生成された。
- 各 stanza に `${id}/metadata.json` が生成された。
- repository root の `assets/root-asset.txt` は `dist/assets/root-asset.txt` にコピーされた。
- stanza 個別の `assets/local-asset.txt` は `dist/${id}/assets/local-asset.txt` にコピーされた。
- `${id}.js` は共有 chunk `./stanza-a433efc5.js` を相対 import する。
- help preview 関連として `index.html` と `-togostanza/help-app.js`、`-togostanza/index-app.js`、`-togostanza/Layout-b22dbe15.js` が生成された。
- `dist/` は Git 管理しない。

## リメイク版観測メモ

リメイク版CLIはまだ未実装のため、`remake/` は空の検証環境として残す。

実装後は、同じ入力意図で build artifact を生成し、現行版との差分を記録する。
