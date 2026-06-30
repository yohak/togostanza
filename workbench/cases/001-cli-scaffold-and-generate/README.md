# 001 CLIの雛形生成とgenerate

## 目的

`togostanza init` と `togostanza generate stanza` が、Stanza開発者にとって自然な入口として機能することを確認する。

## 対応する方針

- `togostanza init` はStanzaリポジトリを作る入口として維持する。
- `togostanza init` はGitHub Pages公開用workflowを含むStanzaリポジトリを作る。
- `togostanza init` は既定でgit初期化を行い、`--skip-git` で抑止できる。
- `generate stanza` は既存Stanzaソース互換を優先し、必要最小限の再設計に留める。
- `generate stanza` は主要optionと必須生成物を維持する。
- 主要コマンド名と短縮aliasは入口として維持する。
- `togostanza upgrade` は破棄する。

## 入力条件

- 空の作業ディレクトリから開始する。
- 現行版ではパッケージマネージャー経由で `togostanza init` を起動し、手作業でStanzaリポジトリ構成を作らない。
- `references/` は変更しない。
- この検証ケースでは、現行版CLIをNode.js 18系で確認する。Node.jsバージョンは各検証環境の `mise.toml` で固定する。
- `current-npm/` と `current-pnpm/` は検証環境とし、それぞれの中で `init --name generated-repo` を実行する。
- `generated-repo/` は `init` が生成したStanzaリポジトリとして扱う。
- `current-npm/` はnpmで `init`、`install`、`generate stanza` を確認する。
- `current-pnpm/` はpnpmの9系でCLI起動、依存取得、local CLI実行を確認する。ただし現行版 `init --package-manager` はpnpmを選べないため、`init` は `--skip-install` で実行する。

## 現行版で観測すること

- `init` が作るリポジトリのscaffold。
- `init` が作るGitHub Pages公開用workflowの有無と内容。
- `init --skip-git` がgit初期化を抑止すること。
- `generate stanza` が作る `stanzas/{id}/` 配下のファイル。
- `generate stanza [id]` が `--label`、`--definition`、`--license`、`--author`、`--timestamp` を受け付けること。
- idのkebab-case化。
- `build` / `serve` / `generate stanza` へ進める初期状態かどうか。
- 短縮alias `g stanza` の入口。

## リメイク版で観測すること

- `init` と `generate stanza` が同じ入口として使えること。
- Phase 1では、`init` がGitHub Pages公開用workflowのplaceholderを生成すること。
- Phase 2-0では、`init .` が現在のディレクトリをStanzaリポジトリとして初期化できること。
- Phase 2-0では、`init . --name <name>` が現在のディレクトリへscaffoldし、`package.json.name` に `--name` の値を書くこと。
- Phase 2-0では、`init .` が許容済みpreflight markerとして既存 `.git/` とlockfileを扱えること。
- Phase 2-0では、`init .` が既存ファイルをmergeせず、衝突pathを含む診断で失敗すること。
- Phase 2では、placeholderを実deploy可能なworkflowへ置き換え、`build` 生成物を公開する導線を持つこと。
- `init` が既定でgit初期化し、`--skip-git` で抑止できること。
- `generate stanza [id]` が主要optionを受け付け、idをkebab-case化すること。
- 生成物が既存Stanzaソース互換を大きく外していないこと。
- 生成後に `build`、`serve`、追加の `generate stanza` が自然に動くこと。
- `upgrade` が提供されない、または明確に非対応として扱われること。

## 合格条件

- Stanza開発者が、既存の入口名でStanzaリポジトリとStanzaソースを作れる。
- Phase 1では、生成されたStanzaリポジトリに有効なGitHub Pages workflow placeholderがある。
- Phase 2-0では、空ディレクトリまたは許容済みpreflight markerだけがあるディレクトリで `init .` が成功する。
- Phase 2-0では、`init . --name <name>` が現在のディレクトリを生成先にし、`--name` をpackage名として使う。
- Phase 2-0では、`package-lock.json` と `pnpm-lock.yaml` によるpackage manager推定と矛盾診断が確認できる。
- Phase 2-0では、`init .` が既存ファイルとのmergeや上書きを行わず、分かりやすく失敗する。
- Phase 2では、生成されたStanzaリポジトリに依存関係のインストール、`togostanza build`、`dist/` のPages artifact化、deployの流れを確認できるGitHub Pages workflowがある。
- `--skip-git` を指定しない場合はgit初期化され、`--skip-git` を指定した場合はgit初期化されない。
- 生成されたStanzaソースが `build` 対象になる。
- `stanzas/{id}/metadata.json`、`index.js`、`style.scss`、`templates/stanza.html.hbs` が確認できる。
- `generate stanza helloWorld` などの入力idが `hello-world` のようにkebab-case化される。
- 生成内容の差分がある場合、理由と移行メモの要否が説明できる。

## 記録する差分

- 生成ファイル一覧。
- `package.json` の依存、script、パッケージマネージャー周辺。
- README、GitHub Pages workflow、git初期化など、開発支援寄りの差分。
- Phase 1ではGitHub Pages workflow placeholderの内容。
- Phase 2-0では `init .`、`init . --name <name>`、preflight marker、lockfile矛盾診断、既存path衝突診断。
- Phase 2ではGitHub Pages workflow内のinstall command、build command、artifact path、deploy action。
- `generate stanza` の主要optionと生成ファイル一覧。
- stdout/stderrの代表ログ。

## 未決定事項

- リメイク版generatorで `index.ts` / `index.tsx` 生成optionを用意するか。
- README生成内容をどこまで維持するか。
- `init .` で既存 `.gitignore`、`README.md`、`LICENSE` などを将来merge対象として許容するか。

## npm観測メモ (`current-npm/generated-repo/`)

- 確認日: 2026-06-22
- 検証環境: `workbench/cases/001-cli-scaffold-and-generate/current-npm/`
- 生成リポジトリ: `workbench/cases/001-cli-scaffold-and-generate/current-npm/generated-repo/`
- Node.js: `v18.20.4`
- npm: `10.7.0`
- `togostanza`: `3.0.0-beta.57`

### mise設定

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

- `current-npm/mise.toml` は、Node.js 18系固定のために観測用の検証環境設定として追加した。
- `current-npm/` 内で `init --name generated-repo` を実行すると、`generated-repo/` ディレクトリが作成された。既存のディレクトリがある場合は、空でも `destination path already exists` で失敗する。
- `init` は `package.json`、`README.md`、`.gitignore`、`common.scss`、`assets/.keep`、`lib/.keep`、`.github/workflows/publish.yml` を生成した。
- `.github/workflows/publish.yml` は `main` branchへのpushで起動し、`npm ci`、`npx togostanza build`、`actions/upload-pages-artifact@v1` による `./dist` upload、`actions/deploy-pages@v1` によるdeployを行う。
- 生成直後の `package.json` は `dependencies.togostanza` に `github:togostanza/togostanza` を持つ。
- `generate stanza` はローカルインストール済みの `togostanza` を要求する。事前確認では、`npm install` 前に実行すると、`togostanza is not installed locally. Try npm install or yarn install.` という内容のエラーで失敗した。
- `npm install` 後、`generate stanza hello` は `stanzas/hello/` を生成した。
- 短縮aliasの `g stanza helloWorld` は成功し、idは `hello-world` にkebab-case化された。
- `build --output-path dist` は成功した。Sass deprecation warningは出るが、生成された `stanzas/hello/` と `stanzas/hello-world/` はbuild対象になった。
- `upgrade --help` は現行版では存在する。リメイク版では `upgrade` を破棄する方針なので、remake側では非対応として扱う。

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

### 注意した警告

- `npm install` では、`sass@1.101.0`、`chokidar@5.0.0`、`readdirp@5.0.0` などがNode `>=20.19.0` を要求する `EBADENGINE` 警告を出した。
- `npm install` はdeprecated package警告とaudit警告を多数出した。
- `build` はSassのlegacy JS API、`@import`、global builtin、color functionなどのdeprecation警告を多数出した。
- この検証ケースではscaffold/generateの確認を目的にするため、これらの警告は記録に留める。

## pnpm観測メモ (`current-pnpm/generated-repo/`)

- 確認日: 2026-06-22
- 検証環境: `workbench/cases/001-cli-scaffold-and-generate/current-pnpm/`
- 生成リポジトリ: `workbench/cases/001-cli-scaffold-and-generate/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`

### mise設定

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

- `current-pnpm/mise.toml` でNode.js 18系とpnpm 9系を固定できた。
- `current-pnpm/` 内で `pnpm dlx togostanza init --name generated-repo ... --skip-install` を実行すると、`generated-repo/` ディレクトリが作成された。
- 現行版 `init --help` の `--package-manager` は `<npm|yarn>` で、pnpmは選択肢にない。そのため、`init` には `--package-manager npm --skip-install` を渡し、依存取得以降をpnpmに切り替えた。
- `.github/workflows/publish.yml` はnpm向けtemplateとして生成され、`npm ci`、`npx togostanza build`、`actions/upload-pages-artifact@v1` による `./dist` upload、`actions/deploy-pages@v1` によるdeployを行う。これは `init --package-manager npm` を渡したためで、pnpm向けworkflowは現行版では観測対象外。
- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza --version` は `3.0.0-beta.57` を返した。
- `mise exec -- pnpm exec togostanza generate stanza pnpmProbe ...` は失敗した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。ただし `generate stanza` が失敗しているため、これは生成済みstanzaのbuild確認ではなく、空のinit scaffoldでbuildコマンドが起動することの確認として扱う。

`generate stanza` の失敗内容:

```text
AssertionError [ERR_ASSERTION]: Trying to copy from a source that does not exist:
.../node_modules/.pnpm/togostanza@.../node_modules/togostanza/src/generators/stanza/templates/**/*
```

実ファイルとしては `src/generators/stanza/templates/` 配下のtemplateはpnpm配置内に存在した。
そのため、現時点ではpnpm install自体ではなく、現行版generatorのtemplate copyとpnpmのvirtual store pathの相性問題として扱う。

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

`node_modules/` と `dist/` はGit管理しない。pnpm側では `generate stanza` が失敗するため、`stanzas/` は生成されない。

## リメイク版観測メモ

リメイク版CLIはまだ未実装のため、`remake/` は空の検証環境として残す。

実装後は、同じ入力意図で `init`、`generate stanza`、短縮alias、`upgrade` 非対応を確認する。
