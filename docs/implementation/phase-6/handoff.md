# Phase 6: workbench executability 引き継ぎ

この文書では、Phase 6完了後にPhase 7以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 6の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `togostanza init` が生成する `package.json` に、利用者向けscriptとして `build: "togostanza build"` と `serve: "togostanza serve"` を追加した。
- 001から010までの `workbench/cases/*/remake/generated-repo/` を追加し、repo-local CLIで実行できるworkbench入力として整えた。
- 各 `remake/generated-repo/package.json` に、workbench用scriptとして `togostanza:local`、`build:local`、`serve:local`、`generate:stanza:local` を追加した。
- `build:local` と `serve:local` は、pack installではなく `node ../../../../../package/bin/togostanza.mjs ...` で本リポジトリ内のcompiled CLIを直接呼ぶ形にした。
- `build` / `serve` は、生成repo利用者向けscriptとして `togostanza build` / `togostanza serve` のまま残した。
- 003から010のうちdirect embed確認が必要なケースには、fixture HTMLを配信する `serve:fixture` を残した。
- 008のReact、009のVue、010の `togostanza-utils` は、workbench入力として必要なlocal dependencyを `package.json` に明示した。
- 010は `references/togostanza-utils` をlocal linkとして使い、`d3`、`date-fns`、`csv-stringify` は `togostanza.config.ts` のVite aliasで `package/node_modules` へ向けた。
- 各ケースREADMEに、Phase 6のリメイク版workbench入力、基本手順、repo-local scriptと利用者向けscriptの違いを追記した。
- 011はPhase 6では `remake/generated-repo/` を作らず、Phase 3のpackage automated testを確認入口として扱うことをREADMEに記録した。
- 012はPhase 6では `remake/generated-repo/` を作らず、Phase 9の実プロジェクト回帰へ送ることをREADMEに記録した。
- `workbench/cases/**/remake/generated-repo/pnpm-lock.yaml` は、Phase 6のコミット対象にしない生成物として `.gitignore` に追加した。

## 意図的に残したこと

- pack install smoke。
- tarball生成。
- `npm exec togostanza@latest` / `pnpm dlx togostanza@latest` の実解決。
- `remake/generated-repo` のlockfile固定。
- 011の独立workbench入力化。
- 012のreferencesローカル再現手順の完成。
- metastanza / TogoMedium全Stanzaのbuild runner。
- 全Stanza browser smoke。
- TogoMedium Webアプリ本体E2E。
- workbench全体のrunner。

## Phase 7以降へ渡す前提

- Phase 6の `remake/generated-repo` は、純粋な `init` 出力ではない。workbenchでrepo-local CLIを呼ぶためのscriptとlocal dependencyを追加した検証入力である。
- repo-local CLI scriptは `package/bin/togostanza.mjs` を直接呼ぶため、実行前に `package/dist` がビルド済みである必要がある。
- クリーンチェックアウトからworkbench入力を動かす基本手順は、`cd package && mise exec -- pnpm run build`、対象ケースで `pnpm install`、対象ケースで `pnpm run build:local` の順である。
- `dependencies.togostanza` は `link:../../../../../package` としているが、これはpack install確認ではない。
- 001から010の `build:local` は通っている。007では旧 `togostanza-build.mjs` / `.js` 検出警告が出るが、旧設定を自動実行しないことを確認するための期待差分である。
- 010は `references/togostanza-utils` と `package/node_modules` に依存する。これはローカルworkbench確認用であり、公開packageのdependency分類や配布時の再現性を保証しない。
- 011のserve挙動は、watcher、HTTP server、一時ディレクトリcleanupを含むため、Phase 6時点ではpackage automated testを正本の確認入口とする。
- 012の実プロジェクト回帰は、Phase 9で改めてローカル再現手順と対象範囲を整理する。

## Phase Xへ渡す前提

- Phase 6では `build` / `serve` scriptを生成repoへ追加したが、公開packageとしての `togostanza` 解決は確認していない。
- `pack -> install -> 実行` 未検証は、引き続きPhase Xのdistribution blockerである。
- `files`、`exports`、`bin`、型定義、`private`、version、tarball install、GitHub Actions live deployはPhase 6では扱っていない。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run test:unit` を承認付き通常実行で確認し、69件が通った。
- `cd package && mise exec -- pnpm run test:integration` を承認付き通常実行で確認し、19件が通った。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、format、lint、type-check、build、unit test、integration test、browser testが通った。
- browser testは13件が通った。
- 001から010までの `remake/generated-repo` で `pnpm run build:local` を実行し、すべて通った。

## 関連文書

- [Phase 6設計](./plan.md)
- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [実装計画](../index.md)
