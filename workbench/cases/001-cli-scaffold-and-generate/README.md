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
- 現行版では package manager 経由で `togostanza init` を起動し、手作業で Stanza repository 構成を作らない。
- `references/` は変更しない。
- このケースでは、現行版CLIを Node 18 系で確認する。Node version は各 fixture の `mise.toml` で固定する。
- `current-npm/` と `current-pnpm/` は実行環境の fixture とし、それぞれの中で `init --name generated-repo` を実行する。
- `generated-repo/` は `init` が生成した Stanza repository として扱う。
- `current-npm/` は npm で `init`、`install`、`generate stanza` を確認する。
- `current-pnpm/` は pnpm 9 系で CLI 起動、依存取得、local CLI 実行を確認する。ただし現行版 `init --package-manager` は pnpm を選べないため、`init` は `--skip-install` で実行する。

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
- リメイク版 `init` で、子 directory 作成だけでなく現在の directory へ scaffold する入口を用意するか。
  - 例: `togostanza init .`
  - 既存ファイルがある場合の衝突検出、merge、上書き option の扱いも合わせて検討する。
- リメイク版 `init` の package manager 対応をどうするか。
  - npm と pnpm を主対象にする。
  - yarn は、現行版の選択肢にはあるが、リメイク版では不要候補として扱う。

## npm 観測メモ (`current-npm/generated-repo/`)

- 確認日: 2026-06-22
- fixture: `workbench/cases/001-cli-scaffold-and-generate/current-npm/`
- 生成 repository: `workbench/cases/001-cli-scaffold-and-generate/current-npm/generated-repo/`
- Node.js: `v18.20.4`
- npm: `10.7.0`
- `togostanza`: `3.0.0-beta.57`

### mise 設定

```toml
[tools]
node = "18"
```

### 実行したコマンド

```sh
cd workbench/cases/001-cli-scaffold-and-generate/current-npm
mise trust ./mise.toml
mise exec -- node -v
mise exec -- npm -v

mise exec -- npx togostanza init \
  --git-url "" \
  --name generated-repo \
  --license MIT \
  --package-manager npm \
  --skip-install \
  --skip-git

cd generated-repo
mise exec -- npm install
mise exec -- npx togostanza --version

mise exec -- npx togostanza generate stanza hello \
  --label Hello \
  --definition "Smoke test stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-22

mise exec -- npx togostanza g stanza helloWorld \
  --label "Hello World" \
  --definition "Alias smoke test stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-22

mise exec -- npx togostanza build --output-path dist
mise exec -- npx togostanza upgrade --help
```

### 観測結果

- `current-npm/mise.toml` は、Node 18 固定のために観測用 fixture として追加した。
- `current-npm/` 内で `init --name generated-repo` を実行すると、`generated-repo/` directory が作成された。既存の directory がある場合は、空でも `destination path already exists` で失敗する。
- `init` は `package.json`、`README.md`、`.gitignore`、`common.scss`、`assets/.keep`、`lib/.keep`、`.github/workflows/publish.yml` を生成した。
- 生成直後の `package.json` は `dependencies.togostanza` に `github:togostanza/togostanza` を持つ。
- `generate stanza` は local install 済みの `togostanza` を要求する。事前確認では、`npm install` 前に実行すると、`togostanza is not installed locally. Try npm install or yarn install.` という内容の error で失敗した。
- `npm install` 後、`generate stanza hello` は `stanzas/hello/` を生成した。
- 短縮 alias の `g stanza helloWorld` は成功し、id は `hello-world` に kebab-case 化された。
- `build --output-path dist` は成功した。Sass deprecation warning は出るが、生成された `stanzas/hello/` と `stanzas/hello-world/` は build 対象になった。
- `upgrade --help` は現行版では存在する。リメイク版では `upgrade` を破棄する方針なので、remake 側では非対応として扱う。

### 生成ファイル

```text
current-npm/
  mise.toml
  generated-repo/
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
- `build` は Sass の legacy JS API、`@import`、global builtin、color function などの deprecation warning を多数出した。
- このケースでは scaffold / generate の確認を目的にするため、これらの warning は記録に留める。

## pnpm 観測メモ (`current-pnpm/generated-repo/`)

- 確認日: 2026-06-22
- fixture: `workbench/cases/001-cli-scaffold-and-generate/current-pnpm/`
- 生成 repository: `workbench/cases/001-cli-scaffold-and-generate/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`

### mise 設定

```toml
[tools]
node = "18"
pnpm = "9"
```

### 実行したコマンド

```sh
cd workbench/cases/001-cli-scaffold-and-generate/current-pnpm
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
mise exec -- pnpm exec togostanza init --help
mise exec -- pnpm exec togostanza generate stanza pnpmProbe \
  --label "PNPM Probe" \
  --definition "PNPM install path probe stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-22
mise exec -- pnpm exec togostanza build --output-path dist
```

### 観測結果

- `current-pnpm/mise.toml` で Node 18 と pnpm 9 を固定できた。
- `current-pnpm/` 内で `pnpm dlx togostanza init --name generated-repo ... --skip-install` を実行すると、`generated-repo/` directory が作成された。
- 現行版 `init --help` の `--package-manager` は `<npm|yarn>` で、pnpm は選択肢にない。そのため、`init` には `--package-manager npm --skip-install` を渡し、依存取得以降を pnpm に切り替えた。
- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza --version` は `3.0.0-beta.57` を返した。
- `mise exec -- pnpm exec togostanza generate stanza pnpmProbe ...` は失敗した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。ただし `generate stanza` が失敗しているため、これは生成済み stanza の build 確認ではなく、空の init scaffold で build command が起動することの確認として扱う。

`generate stanza` の失敗内容:

```text
AssertionError [ERR_ASSERTION]: Trying to copy from a source that does not exist:
.../node_modules/.pnpm/togostanza@.../node_modules/togostanza/src/generators/stanza/templates/**/*
```

実ファイルとしては `src/generators/stanza/templates/` 配下の template は pnpm 配置内に存在した。
そのため、現時点では pnpm install 自体ではなく、現行版 generator の template copy と pnpm の virtual store path の相性問題として扱う。

### 生成ファイル

```text
current-pnpm/
  mise.toml
  generated-repo/
    .github/workflows/publish.yml
    .gitignore
    README.md
    assets/.keep
    common.scss
    lib/.keep
    package.json
    pnpm-lock.yaml
```

`node_modules/` と `dist/` は Git 管理しない。pnpm 側では `generate stanza` が失敗するため、`stanzas/` は生成されない。

## リメイク版観測メモ

リメイク版CLIはまだ未実装のため、`remake/` は空の検証環境として残す。

実装後は、同じ入力意図で `init`、`generate stanza`、短縮 alias、`upgrade` 非対応を確認する。
