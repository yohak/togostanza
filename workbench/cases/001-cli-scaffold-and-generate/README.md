# 001 CLI scaffold and generate

## 目的

`togostanza init` と `togostanza generate stanza` が、Stanza開発者にとって自然な入口として機能することを確認する。

## 対応する方針

- `togostanza init` は Stanza repository を作る入口として維持する。
- `generate stanza` は既存 Stanza source 互換を優先し、必要最小限の再設計に留める。
- 主要 command 名と短縮 alias は入口として維持する。
- `togostanza upgrade` は破棄する。

## 入力条件

- 空の作業ディレクトリから開始する。
- 現行版では `npx togostanza init` を使い、手作業で Stanza repository 構成を作らない。
- `references/` は変更しない。
- このケースでは、現行版CLIを Node 18 系で確認する。Node version は `current/mise.toml` で固定する。

## 現行版で観測すること

- `init` が作る repository scaffold。
- `generate stanza` が作る `stanzas/{id}/` 配下のファイル。
- id の kebab-case 化。
- `build` / `serve` / `generate stanza` へ進める初期状態かどうか。
- 短縮 alias `g stanza` の入口。

## リメイク版で観測すること

- `init` と `generate stanza` が同じ入口として使えること。
- 生成物が既存 Stanza source 互換を大きく外していないこと。
- 生成後に `build`、`serve`、追加の `generate stanza` が自然に動くこと。
- `upgrade` が提供されない、または明確に非対応として扱われること。

## 合格条件

- Stanza開発者が、既存の入口名で Stanza repository と Stanza source を作れる。
- 生成された Stanza source が `build` 対象になる。
- `stanzas/{id}/metadata.json`、`index.js`、`style.scss`、`templates/stanza.html.hbs` が確認できる。
- 生成内容の差分がある場合、理由と移行メモの要否が説明できる。

## 記録する差分

- 生成ファイル一覧。
- `package.json` の依存、script、package manager 周辺。
- README、workflow、git 初期化など、開発支援寄りの差分。
- stdout / stderr の代表ログ。

## 未決定事項

- リメイク版 generator で `index.ts` / `index.tsx` 生成 option を用意するか。
- README 生成内容をどこまで維持するか。

## 現行版観測メモ

- 確認日: 2026-06-21
- 作業ディレクトリ: `workbench/cases/001-cli-scaffold-and-generate/current/`
- Node.js: `v18.20.4`
- npm: `10.7.0`
- `togostanza`: `3.0.0-beta.57`

### 実行したコマンド

```sh
cd workbench/cases/001-cli-scaffold-and-generate

mise exec -- npx togostanza init \
  --git-url "" \
  --name current \
  --license MIT \
  --package-manager npm \
  --skip-install \
  --skip-git

cd current
mise exec -- npm install

mise exec -- npx togostanza generate stanza hello \
  --label Hello \
  --definition "Smoke test stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-21

mise exec -- npx togostanza g stanza helloWorld \
  --label "Hello World" \
  --definition "Alias smoke test stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-21

mise exec -- npx togostanza upgrade --help
```

### 観測結果

- `init --name current` は `current/` directory を作成した。既存の `current/` directory がある場合は、空でも `destination path already exists` で失敗する。
- `init` は `package.json`、`README.md`、`.gitignore`、`common.scss`、`assets/.keep`、`lib/.keep`、`.github/workflows/publish.yml` を生成した。
- 生成直後の `package.json` は `dependencies.togostanza` に `github:togostanza/togostanza` を持つ。
- `generate stanza` は local install 済みの `togostanza` を要求する。`npm install` 前に実行すると、`togostanza is not installed locally. Try npm install or yarn install.` という内容の error で失敗した。
- `npm install` 後、`generate stanza hello` は `stanzas/hello/` を生成した。
- 短縮 alias の `g stanza helloWorld` は成功し、id は `hello-world` に kebab-case 化された。
- `upgrade --help` は現行版では存在する。リメイク版では `upgrade` を破棄する方針なので、remake 側では非対応として扱う。

### 生成ファイル

```text
current/
  mise.toml
  .github/workflows/publish.yml
  .gitignore
  README.md
  assets/.keep
  common.scss
  lib/.keep
  package-lock.json
  package.json
  stanzas/
    hello/
      README.md
      assets/.keep
      index.js
      metadata.json
      style.scss
      templates/stanza.html.hbs
    hello-world/
      README.md
      assets/.keep
      index.js
      metadata.json
      style.scss
      templates/stanza.html.hbs
```

### 注意した warning

- `npm install` では、`sass@1.101.0`、`chokidar@5.0.0`、`readdirp@5.0.0` などが Node `>=20.19.0` を要求する `EBADENGINE` warning を出した。
- `npm install` は deprecated package warning と audit warning を多数出した。
- このケースでは scaffold / generate の確認を目的にするため、これらの warning は記録に留める。

## リメイク版観測メモ

リメイク版CLIはまだ未実装のため、`remake/` は空の検証環境として残す。

実装後は、同じ入力意図で `init`、`generate stanza`、短縮 alias、`upgrade` 非対応を確認する。
