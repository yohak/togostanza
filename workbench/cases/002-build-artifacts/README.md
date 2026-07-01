# 002 ビルド生成物

## 目的

`togostanza build` が、Stanza利用者の埋め込みに必要なランタイム生成物と、Stanza開発者が期待する生成物配置を作ることを確認する。

## 対応する方針

- `togostanza build` / `togostanza b` は入口として維持する。
- `build --output-path` は維持候補として扱う。
- ランタイム用の主要生成物配置は利用契約として維持する。
- ヘルププレビュー側生成物は再設計可能とする。

## 入力条件

- この検証ケースの `current-pnpm/` と `remake/` に同等のStanzaリポジトリを用意する。
- 少なくとも1つのbasic stanzaと、ランタイム観測用stanzaを含める。
- リポジトリルートの `assets/` とstanza個別 `assets/` を含める。
- 現行版CLIは `current-pnpm/mise.toml` でNode.js 18系とpnpm 9系に固定する。
- `generate stanza` の挙動は001で確認する。この検証ケースでは、001の生成済みstanzaソースをケース入力としてコピーし、ビルド生成物の観測に集中する。

## 現行版で観測すること

- `build --output-path dist` の成功 / 失敗。
- `dist/` 配下の主要生成物。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、`${id}/assets/*`。
- リポジトリルート `assets/` から `dist/assets/` へのコピー。
- `${id}.js.map`、`index.html`、`-togostanza/help-app.js` など開発支援寄り生成物。
- 空の初期scaffoldに対してbuildが成功するかどうか。

## リメイク版で観測すること

- 同じ入力から、利用契約上必要な生成物が生成されること。
- Phase 2-1では、ViteでStanza entrypointがbundleされること。
- Phase 2-1では、`togostanza/stanza` がbuild用runtime stubとしてbundle解決されること。
- Phase 2-1では、build用runtime stubはCLI package内の同梱物として扱い、生成リポジトリ側 `node_modules/togostanza` をbundle時に実解決しないこと。
- `{id}.js` と共有チャンク一式が、`dist/` 内で相対importにより自己完結すること。
- `${id}.html` が存在すること。
- `${id}.js.map` と `${id}.css.map` が存在し、生成物から相対参照されること。
- Phase 2-1では、source map生成を検証目標とする。ただしsource mapは外部互換契約として扱わない。
- Phase 2-1では、`@use '@/common.scss';` を含む `style.scss` がcompileできること。
- Phase 2-1では、`index.html` と `-togostanza/` を生成しないこと。
- Phase 2-1では、stanzaが1つもない場合は分かりやすく失敗すること。
- ヘルププレビュー側生成物が変わる場合、ランタイム生成物との差分が説明できること。

## 合格条件

- 一般Webサイトから読み込むためのmodule scriptが生成される。
- Phase 2-1では、custom elementとして動くことは確認しない。後続runtimeが使うJS生成物が存在することまでを確認する。
- `${id}.css` が生成される。
- `${id}/metadata.json` が生成される。
- asset参照が壊れていない。
- Phase 2-1では、`${id}.js.map` と `${id}.css.map` が生成される。ただしsource map内容の互換は固定しない。

## 記録する差分

- `dist/` treeの一覧。
- 主要生成物のpath。
- sharedチャンクの有無。
- source mapのpathと相対参照。
- ヘルププレビュー関連生成物の差分。
- stanzaがないリポジトリでのbuild挙動差分。
- ビルド時の警告/エラー。

## 未決定事項

- assetのinline/emit/hash/thresholdの詳細。
- Stanza entrypointからのasset importの詳細。
- source map内部のsources pathや内容の詳細。
- ヘルププレビュー生成物の最終構造。

## 現行版準備メモ

- 確認日: 2026-06-22
- 検証環境: `workbench/cases/002-build-artifacts/current-pnpm/`
- 生成リポジトリ: `workbench/cases/002-build-artifacts/current-pnpm/generated-repo/`
- `current-pnpm/` で `pnpm dlx togostanza init --name generated-repo ... --skip-install` を実行し、雛形を生成した。
- `generated-repo/stanzas/` は、001の `current-npm/generated-repo/stanzas/` からコピーした。
- root assetとして `assets/root-asset.txt` を追加した。
- stanza個別assetとして `stanzas/hello/assets/local-asset.txt` と `stanzas/hello-world/assets/local-asset.txt` を追加した。
- Node.jsバージョンとpnpmバージョンは `current-pnpm/mise.toml` で固定する。

### mise設定

```toml
[tools]
node = "18"
pnpm = "9"
```

### 実行したコマンド

```sh
cd workbench/cases/002-build-artifacts/current-pnpm

mise trust ./mise.toml
mise exec -- node -v
mise exec -- pnpm -v

mise exec -- pnpm dlx togostanza init \
  --git-url "" \
  --name generated-repo \
  --license MIT \
  --package-manager npm \
  --skip-install \
  --skip-git

cd generated-repo
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm exec togostanza b --output-path dist
```

### バージョン

- Node: `v18.20.4`
- pnpm: `9.15.9`
- togostanza: `3.0.0-beta.57`

### インストール結果

`mise exec -- pnpm install` は成功した。
`pnpm-lock.yaml` が生成され、`togostanza 3.0.0-beta.57` がインストールされた。

### CLIビルド結果

`mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
短縮形の `mise exec -- pnpm exec togostanza b --output-path dist` も成功した。

ビルド時はDart Sassのdeprecation警告が多数出た。

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
  stanza-07dfec38.js
  stanza-07dfec38.js.map
  -togostanza/
    Layout-7c8ef6c1.js
    Layout-7c8ef6c1.js.map
    help-app.js
    help-app.js.map
    index-app.js
    index-app.js.map
```

### 主要生成物の観測

- 各stanzaに `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}.html` が生成された。
- 各stanzaに `${id}/metadata.json` が生成された。
- リポジトリルートの `assets/root-asset.txt` は `dist/assets/root-asset.txt` にコピーされた。
- stanza個別の `assets/local-asset.txt` は `dist/${id}/assets/local-asset.txt` にコピーされた。
- `${id}.js` は共有チャンク `./stanza-07dfec38.js` を相対importする。
- ヘルププレビュー関連として `index.html` と `-togostanza/help-app.js`、`-togostanza/index-app.js`、`-togostanza/Layout-7c8ef6c1.js` が生成された。
- `dist/` はGit管理しない。

## リメイク版観測メモ

### Phase 2-1観測

- 確認日: 2026-06-30
- 対象: Phase 2-1 build artifact spine
- 確認環境: `package/` のintegration testで、compiled `bin/togostanza.mjs` を実行した。
- `remake/` は、生成物をGit管理しないため空の検証領域として残す。

### 実行したコマンド

Phase 2-1では、integration test内で次と同等の流れを確認した。

```sh
cd package
pnpm run test:integration
```

生成リポジトリ内では、compiled bin経由で次の操作を行った。

```sh
togostanza init . --skip-install --skip-git
togostanza generate stanza helloWorld --timestamp 2026-06-30
togostanza build --output-path public
```

root assetとして `assets/root-asset.txt` を追加し、stanza個別assetとして `stanzas/hello-world/assets/local-asset.txt` を追加した。

### 生成結果

```text
public/
  .togostanza-build-output
  hello-world.js
  hello-world.js.map
  hello-world.css
  hello-world.css.map
  hello-world.html
  hello-world/
    metadata.json
    assets/
      local-asset.txt
  assets/
    root-asset.txt
```

### 主要生成物の観測

- `hello-world.js` と `hello-world.js.map` が生成された。
- `hello-world.css` と `hello-world.css.map` が生成された。
- `hello-world.html` が生成された。
- `hello-world/metadata.json` が生成された。
- リポジトリルートの `assets/root-asset.txt` は `public/assets/root-asset.txt` にコピーされた。
- stanza個別の `assets/local-asset.txt` は `public/hello-world/assets/local-asset.txt` にコピーされた。
- `hello-world.js` には、ブラウザで解決できないbare import `togostanza/stanza` は残らない。
- build用runtime stubはbundleされる。ただし、custom element登録や実DOM動作の確認はPhase 2-2へ送る。
- `index.html` と `-togostanza/` はPhase 2-1では生成しない。これは現行版との差分として扱う。
- 空の初期scaffoldに対するbuildは、現行版ではヘルププレビュー生成により成功するが、リメイク版Phase 2-1ではstanzaがないためエラーにする。
- source mapは生成と相対参照だけを確認する。source map内部のpathや内容互換は固定しない。
- `.togostanza-build-output` は、TogoStanzaが所有する出力先として次回buildでcleanできることを示すmarkerである。

## Phase 6 リメイク版workbench入力

`remake/generated-repo/` は、002のbuild生成物観測をリメイク版CLIで再実行するための入力である。`current-pnpm/generated-repo/` の観測入力から、生成済み `dist/`、`node_modules/`、lockfileを除いたソースを持つ。

基本手順:

```sh
cd package
mise exec -- pnpm run build
cd ../workbench/cases/002-build-artifacts/remake/generated-repo
pnpm install
pnpm run build:local
```

workbench用scriptはrepo-local CLIを呼ぶ `build:local` / `serve:local` として追加している。生成repo利用者向けの `build` / `serve` は、`togostanza build` / `togostanza serve` を呼ぶscriptとして残す。
