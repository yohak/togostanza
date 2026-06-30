# Phase 2-0: preflight / repo detection 引き継ぎ

この文書では、Phase 2-0完了後にPhase 2-1へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-0の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- `init .` を実装した。
- `init . --name <name>` を、現在のディレクトリへ雛形生成し、`--name` の値を `package.json.name` に使う入口として実装した。
- `init --name <dir>` はPhase 1の新規子ディレクトリ生成入口として維持した。
- `init --name <dir>` は親ディレクトリのlockfileを見ないようにした。
- `init .` では、空ディレクトリ、既存 `.git/`、既存 `package-lock.json`、既存 `pnpm-lock.yaml` だけがあるディレクトリを許容した。
- 既存 `.git/` がある場合は、`--skip-git` がなくても既存 `.git/` を壊さず、`git init` を実行しないようにした。
- `package-lock.json` だけがある場合は `npm`、`pnpm-lock.yaml` だけがある場合は `pnpm` と推定するようにした。
- `package-lock.json` と `pnpm-lock.yaml` が同時にある場合は失敗するようにした。
- `--package-manager` と既存lockfileが矛盾する場合は失敗するようにした。
- lockfileがない場合は、Phase 1と同じく `npm_config_user_agent`、最後に `npm` の順で推定するようにした。
- `init .` は既存ファイルとのmergeや上書きをせず、衝突pathを含む診断で失敗するようにした。
- `.gitignore`、`README.md`、`LICENSE` だけがある「ほぼ空」のディレクトリも、Phase 2-0では衝突として扱うようにした。
- `resolvePackageManager()` を `package/src/cli/package-manager.ts` へ切り出した。
- Stanzaリポジトリroot判定を `package/src/cli/repo-context.ts` へ切り出した。
- Stanzaリポジトリrootの最小条件を、`package.json` と `dependencies.togostanza` または `devDependencies.togostanza` の宣言にした。
- Stanza repo contextに、root directory、`package.json` path、package name、detected package manager、lockfile path、`togostanza` dependency specを持たせた。
- Stanza repo contextは宣言ベースの判定に留め、`node_modules/` や実際のdependency解決は見ないようにした。
- malformed `package.json` は例外終了ではなく、CLI診断として失敗するようにした。
- `generate stanza` / `g stanza` は、Stanzaリポジトリroot以外では失敗するようにした。
- `build` / `b` handlerを追加し、Stanzaリポジトリroot判定を通すようにした。
- `build --output-path <dir>` は受理するが、Phase 2-0では生成物を作らず、root判定後に未実装診断としてnon-zeroを返すようにした。
- unit testとintegration testを、`generate stanza` 成功時にStanzaリポジトリrootを用意する形へ更新した。
- unit testで `init .`、lockfile推定、矛盾診断、root外 `generate stanza`、root外 `build`、valid rootでの `build` 未実装診断を確認した。
- integration testで build後の `bin/togostanza.mjs` 経由の `init .`、lockfile推定、矛盾診断、root外 `generate stanza`、root外 `build`、valid rootでの `build` 未実装診断を確認した。

## 意図的に残したこと

- `build` の生成物作成。
- Stanza検出。
- metadata validation。
- `metadata.json` の `@id` とディレクトリ名の一致確認。
- entrypoint候補の解決。
- stylesheet、template、assetの処理。
- `togostanza` dependencyの実利用可能性確認。
- `togostanza/stanza` runtime exportの確認。
- `togostanza.config.ts` の生成や読み込み。
- 旧 `togostanza-build.mjs` / `togostanza-build.js` の検出と移行診断。
- 既存ファイルがあるディレクトリへのmerge。
- 上書きoption。
- `.gitignore`、`README.md`、`LICENSE` などの既存ファイル許容。
- bare `init` のprompt対応。
- `serve` / `s` の実挙動。
- GitHub Pages workflow placeholderの実deploy workflow化。

## Phase 2-1で使う前提

- `build` / `b` はrouteされ、`--output-path <dir>` を受け付ける。
- `build` はStanzaリポジトリrootでのみ進められる。
- Phase 2-1では、valid root時の `build` 未実装診断を、実際の生成物作成へ置き換える。
- Stanzaリポジトリroot判定は `resolveStanzaRepoContext()` を使える。
- `resolveStanzaRepoContext()` は内部APIであり、外部仕様として固定しない。
- `resolveStanzaRepoContext()` は `stanzas/` の存在を要求しない。
- `generate stanza` は、まだstanzaがないStanzaリポジトリrootに最初のstanzaを作れる。
- `init .` 後のリポジトリは、Phase 2-1の `build` 入力として使える。
- `init . --skip-install` では、既存lockfileがあっても依存関係の実更新は行わない。
- Stanzaリポジトリroot判定は、`package.json` の宣言だけを見る。dependencyが実際に解決できるかは、Phase 2-1以降で必要に応じて確認する。
- `package.json` が壊れている場合は、`build` と `generate stanza` のpreflight診断として失敗する。
- CLI診断文言の完全一致は互換対象にしない。ただし、修正に必要なpathや不足情報は含める。

## Phase 2-1で回収すること

- `build` / `b` の生成物作成。
- `--output-path <dir>` と未指定時 `dist` の実出力。
- Stanza検出。
- no stanza時の診断。
- metadata validation。
- `metadata.json` の `@id` とstanzaディレクトリ名の一致確認。
- entrypoint候補の優先順と解決。
- `style.scss`、`templates/*.hbs`、stanza別 `assets/` の最小処理。
- `dist/{id}.js`、`dist/{id}.css`、`dist/{id}.html`、`dist/{id}/metadata.json` の最小生成。
- GitHub Pagesのサブパス配信で壊れない相対URL生成。
- `togostanza` dependencyの実利用可能性をPhase 2-1で確認するか、さらに後続へ送るかの判断。

## 後続判断として残すこと

- bare `init` をprompt付き入口として追加するか。
- 既存ファイルがあるディレクトリへのmerge。
- 上書きoption。
- `.gitignore`、`README.md`、`LICENSE` などのmerge許容。
- lockfileだけがあるディレクトリをpreflight markerとして許容した状態で、既存lockfileの内容が生成される `package.json` とずれる場合の扱い。
- `init .` でlockfile矛盾と既存ファイル衝突が同時にある場合の診断優先順。
- `withOptionalLockfilePath` 相当の内部ヘルパー重複を共通化するか。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && pnpm check-all` を承認付き通常実行で確認し、問題なし。
- `pnpm check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。

## 関連commit

- `2eb160b docs: add phase 2 subphase plan`
- `d8339f1 feat: implement phase 2 preflight`
- `0a2ae75 fix: report malformed stanza package json`
