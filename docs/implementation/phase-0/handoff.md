# Phase 0: skeleton 引き継ぎ

この文書では、Phase 0完了後にPhase 1へ引き継ぐ事実、境界、注意点を扱う。

Phase 0の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `package/` 直下の単一packageとして、リメイク版パッケージを置いた。
- `package.json` に `bin`、`engines.node`、`build` scriptを追加した。
- `tsconfig.build.json` で `src/` から `dist/` へcompiled JSと型定義を出力する構成にした。
- `bin/togostanza.mjs` から `dist/cli.js` を起動するCLI入口を作った。
- `src/cli/` 配下にentrypoint、router、command table、result型を分けた。
- `--version`、`-v`、`--help`、未実装command、unknown command、不正global optionの最小診断を実装した。
- `init`、`generate stanza`、`g stanza`、`build`、`b`、`serve`、`s` をroutingで認識するようにした。
- `upgrade` はcommand tableに含めず、unknown commandとして扱うようにした。
- unit testでrouterの分岐を確認し、integration testでbuild後の `bin` 入口を確認するようにした。
- `pnpm check-all` にbuildを含め、`docs/setup/quality.md` にbuildとCLI手元確認の手順を反映した。

## 意図的に残したこと

- `init` の実挙動。
- `generate stanza` / `g stanza` の実挙動。
- `build` / `b` の実挙動。
- `serve` / `s` の実挙動。
- Stanzaリポジトリの生成。
- generator templateの内容。
- `init`、`generate stanza` などcommand配下optionのvalidation。
- 裸の `togostanza` commandとしてのPATH解決確認。
- npm公開、`private` 解除、`exports`、`files`、公開用metadataの最終判断。

## Phase 1で使う前提

- Phase 1は、既存のCLI routerに `init` と `generate stanza` のhandlerを差し込む形で始められる。
- `generate stanza` と `g stanza` は同じcanonical commandへ寄せられる前提で扱える。
- command配下のoptionは、Phase 1で対象commandの実装と一緒にvalidationを定義する。
- 成功時はstdoutとexit code `0`、失敗時はstderrとnon-zeroという基本方針を踏襲する。
- integration testは、TypeScript直接実行ではなく、build後の `bin/togostanza.mjs` を起動して確認する。
- 手元確認では、裸の `togostanza` commandではなく `node ./bin/togostanza.mjs` を明示して、現行版とのPATH衝突を避ける。

## Phase 1で決めること

- `init` が受け付ける引数とoption。
- `init` の生成先。特に `--name` 型だけにするか、`.` へのscaffoldを含めるか。
- 既存ファイル、既存ディレクトリ、空ディレクトリ、非空ディレクトリに対する診断。
- `--package-manager npm|pnpm`、既存lockfile、`npm_config_user_agent` の優先順と矛盾時の診断。
- `--skip-install`、`--skip-git` の挙動。
- GitHub Pages workflowの生成内容。
- `generate stanza [id]` のoption、idのkebab-case化、衝突時診断。
- Stanza生成templateの内容と、現行版からの差分説明。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。

## 関連commit

- `df5d2fa docs: add phase 0 skeleton plan`
- `41e1589 feat: implement phase 0 cli skeleton`
- `62eecb5 docs: clarify local cli verification`
