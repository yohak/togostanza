# Phase 1: scaffold生成 引き継ぎ

この文書では、Phase 1完了後にPhase 2へ引き継ぐ事実、境界、注意点を扱う。

Phase 1の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `init` の実挙動を実装した。
- `generate stanza` / `g stanza` の実挙動を実装した。
- `init --name <dir>` を必須の非対話CLIとして扱うようにした。
- `init` で `.github/workflows/publish.yml`、`.gitignore`、`README.md`、`assets/.keep`、`common.scss`、`lib/.keep`、`package.json` を生成するようにした。
- `package.json` には `dependencies.togostanza`、`engines.node`、`private`、`license` を書くようにした。
- `dependencies.togostanza` は、リメイク版パッケージ自身のversionを単一の正本として `^<version>` で生成するようにした。
- `package.json` の `packageManager` fieldは生成しない方針を維持した。
- `--package-manager npm|pnpm`、`--skip-install`、`--skip-git`、`--license` を実装した。
- install commandは実行runnerを差し替えられるようにし、unit testでは実インストールせずcommand組み立てを確認できるようにした。
- `--skip-install` ではinstall runnerを呼ばず、lockfileも生成しないことを確認した。
- `--skip-git` ではgit初期化を抑止できるようにした。
- GitHub Pages workflowは、Phase 2で実deploy workflowへ置き換えるplaceholderとして生成するようにした。
- `generate stanza <id>` はidをkebab-case化し、`stanzas/{id}/` 配下へStanzaソースを生成するようにした。
- `generate stanza` は `--label`、`--definition`、`--license`、`--author`、`--timestamp` を受け付けるようにした。
- `metadata.json` は、Phase 2のbuild / runtime入力として使える現行寄りの最小構造を生成するようにした。
- `index.js` は `import Stanza from "togostanza/stanza"` と `renderTemplate()` を使う最小例として生成するようにした。
- command配下optionを扱うための最小option parserを追加した。
- `gitRunner`、`installRunner`、`cwd`、`currentDate` を注入できるようにし、unit test / integration testを決定的にした。
- build後の `bin/togostanza.mjs` 経由で、`init` と `generate stanza` のsmokeを確認するintegration testを追加した。

## 意図的に残したこと

- `init .`。
- 既存ディレクトリへのmerge、上書き、空ディレクトリ再利用。
- 親ディレクトリや既存Stanzaリポジトリのlockfileを使ったパッケージマネージャー推定。
- lockfile同時存在や `--package-manager` 指定矛盾の診断。
- bare `init` のprompt対応。
- `--git-url`。
- `togostanza.config.ts` 生成。
- 初期stanzaの自動生成。
- `package.json` の `scripts` 生成。
- 実deploy可能なGitHub Pages workflow。
- ローカルtarballを使ったnpm/pnpmの実インストール確認。
- `node_modules/` や実install結果としてのlockfile生成確認。
- `build` / `serve` の実挙動。
- `togostanza/stanza` のランタイム実装。

## Phase 2で使う前提

- Phase 2は、Phase 1で生成したStanzaリポジトリを `build` 入力として扱える。
- Phase 1で生成するworkflowはplaceholderであり、実deploy可能なGitHub Pages workflowではない。
- 実deploy可能なworkflowは、`build` と `dist/` 生成物が成立した後で置き換える。
- `generate stanza` が作る `index.js` は `togostanza/stanza` runtimeの存在を前提にするが、runtime自体はPhase 2で実装する。
- `metadata["@id"]` とstanzaディレクトリ名は、Phase 1生成物では一致している。
- `style.scss`、`templates/stanza.html.hbs`、stanza別 `assets/` は、Phase 2のビルド入力として使える。
- `common.scss`、ルート `assets/`、`lib/` は、Phase 2以降のconfig / resolution / asset確認の入力として使える。
- `init --name <dir>` は、既存ディレクトリがある場合は空でも失敗する。既存ディレクトリや `init .` の扱いはPhase 2-0で回収する。
- `generate stanza` は、Phase 1時点では任意のcwdに `stanzas/{id}/` を作れる。Stanzaリポジトリroot確認はPhase 2-0で追加する。
- `npm_config_user_agent` によるpackage manager推定は実装済みだが、lockfileによる推定は未実装である。
- `pnpm` は公式サポート対象として扱うが、Phase 1では実依存取得ではなくcommand組み立てまでを確認している。

## Phase 2-0で回収すること

- `init .`。
- 空ディレクトリ、既存 `.git/`、既存lockfileだけがあるディレクトリへのscaffold方針。
- 非空ディレクトリへのmergeや上書きをしない診断。
- `package-lock.json` と `pnpm-lock.yaml` によるpackage manager推定。
- lockfile同時存在の診断。
- `--package-manager` と既存lockfileの矛盾診断。
- Stanzaリポジトリroot判定。
- `generate stanza` 実行前のStanzaリポジトリroot確認。
- `build` 実行前のStanzaリポジトリroot確認。

## Phase 2以降で決めること

- `build` / `b` の実挙動。
- Stanza検出、metadata検証、entrypoint優先順、stylesheet、template、asset解決。
- `togostanza/stanza` runtime。
- `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()` などStanza source API。
- `togostanza.config.ts` の生成、schema、読み込み。
- 旧 `togostanza-build.mjs` / `togostanza-build.js` の検出と移行診断。
- 実deploy可能なGitHub Pages workflow。
- `serve` / `s` の実挙動。
- React、Vue、`togostanza-utils` compatibility。
- npm公開metadata、`exports`、`files`、`private` 解除。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm check-all` を実行し、問題なし。
- sandbox内ではPlaywrightのChromium起動がmacOS権限で失敗する場合があるため、browser testを含む完了前確認は承認付き通常実行で確認した。

## 関連commit

- `99bed4e docs: add phase 1 scaffold plan`
- `136723a feat: implement phase 1 scaffolding commands`
- `40d48ff test: cover phase 1 scaffold edge cases`
