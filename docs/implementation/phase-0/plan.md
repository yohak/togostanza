# Phase 0: skeleton 設計

この文書では、Phase 0で作るリメイク版パッケージとCLI土台の設計を扱う。

Phase 0は、後続フェーズで `init`、`generate stanza`、`build`、`serve` の実装を足せる状態を作るための準備フェーズである。各commandの実挙動は、このフェーズでは実装しない。

## 目的

Phase 0の目的は、`package/` 直下の単一パッケージとして、リメイク版の実装土台を固めることである。

このフェーズでは、次を成立させる。

- リメイク版パッケージの基本構成。
- format、lint、type-check、unit test、integration test、browser smoke testの入口。
- compiled JSとして実行できるCLI入口。
- 後続フェーズがhandlerを差し込めるcommand routing。
- 成功時と失敗時の終了コードの基本構造。

## 完了条件

Phase 0は、次を満たした時点で完了とする。

- `package/` がリメイク版パッケージの単一packageとして成立している。
- `package.json` に `bin` と `engines.node` があり、`togostanza` 相当のCLI入口を確認できる。
- TypeScriptソースから `dist/` へcompiled JSを生成するbuild scriptがある。
- `bin` 入口はcompiled JSを実行する。
- CLIは `--version` と `--help` を成功扱いで実行できる。
- CLIは提供予定commandをroutingで認識できる。
- 未実装command、unknown command、不正optionは失敗扱いで終了できる。
- `pnpm check-all` でformat、lint、type-check、build、unit、integration、browser smokeを確認できる。

## 対象範囲

含めるもの:

- `bin/togostanza.mjs`。
- `package.json` の `bin` と `engines.node`。
- `dist/` 出力用の `tsconfig.build.json`。
- `src/cli/` 配下のentrypoint、router、command table、result型、未実装handler。
- `--version`、`--help`、command alias、未実装command、unknown command、不正optionの最小診断。
- Phase 0完了条件に対応するunit testとintegration test。

含めないもの:

- `togostanza init` の実挙動。
- `togostanza generate stanza` / `togostanza g stanza` の実挙動。
- `togostanza build` / `togostanza b` の実挙動。
- `togostanza serve` / `togostanza s` の実挙動。
- Stanzaリポジトリの生成。
- ビルド生成物、ランタイム、開発サーバーの実装。
- npm公開に必要な `exports`、`files`、公開用metadataの最終判断。

`package.json` の `private: true` はPhase 0では維持する。npm公開に向けた `private` の解除、`exports`、`files`、公開用metadataの判断はPhase 5で扱う。

## CLI方針

Phase 0では、CLI parserはNode.js標準機能を中心にした最小実装とする。

この判断はPhase 0の範囲に限る。将来、help出力、subcommand定義、option validation、エラー表示の複雑さが増えた場合は、`commander` などのCLIライブラリ採用を再検討してよい。

compiled JSと `bin` 入口をPhase 0に含めるのは、将来の `npm exec togostanza@latest` や `pnpm dlx togostanza@latest` で使う実行経路を早期に確認するためである。ただし、npm公開そのものと配布対象ファイルの最終設計はPhase 5に残す。

Phase 0で確認するCLI入口は、`bin/togostanza.mjs` からcompiled JSへ接続される経路である。手元環境で裸の `togostanza` commandを実行できることは、PATH上の現行版 `togostanza` との衝突、package manager経由の実行、npm公開後の配布確認を含むため、Phase 0の完了条件には含めない。裸の `togostanza` commandとしての実行確認は、Phase 5のdistribution確認で扱う。

package buildは、Phase 0では追加のbundlerを使わず、TypeScript compilerで行う。`tsconfig.build.json` を用意し、`src/` から `dist/` へJavaScriptと型定義を出力する。

Phase 0で認識するcommandは次の通り。

| command | Phase 0での扱い |
| ------- | --------------- |
| `init` | 認識するが、実挙動は未実装。 |
| `generate stanza` | 認識するが、実挙動は未実装。 |
| `g stanza` | `generate stanza` のaliasとして認識するが、実挙動は未実装。 |
| `build` | 認識するが、実挙動は未実装。 |
| `b` | `build` のaliasとして認識するが、実挙動は未実装。 |
| `serve` | 認識するが、実挙動は未実装。 |
| `s` | `serve` のaliasとして認識するが、実挙動は未実装。 |

`upgrade` はリメイク版では提供しない。Phase 0のcommand tableには含めず、unknown commandとして扱う。

## 診断と終了コード

CLI出力文言そのものは互換対象にしない。ただし、Phase 0では出力先と終了コードを確認対象にする。

- `--version` はstdoutに出力し、exit code `0` を返す。
- `-v` は既存の最小CLIに合わせ、Phase 0では `--version` のaliasとして扱う。
- `--help` はstdoutに出力し、exit code `0` を返す。
- 未実装commandはstderrに診断を出し、exit code `1` を返す。
- unknown commandはstderrに診断を出し、exit code `1` を返す。
- 不正optionはstderrに診断を出し、exit code `1` を返す。

`dev:cli` scriptは開発用入口として残してよい。ただし、Phase 0完了時には `bin` 入口と同じrouterを通るようにし、公開契約ではなく開発補助として扱う。

Phase 0で不正optionとして扱うのは、commandより前に置かれた未知のglobal optionだけとする。たとえば `--bad` は不正optionとして扱う。一方で、`init --bad` のように認識済みだが未実装のcommand配下にあるoptionは、Phase 0では個別に解釈せず、未実装command扱いにする。各command固有のoption validationは、そのcommandを実装するフェーズで扱う。

## 確認方針

Phase 0完了時は、次を確認する。

- `cd package && mise exec -- pnpm run check-all`
- `git diff --check`

個別の失敗を切り分ける場合は、`format:check`、`lint`、`type-check`、`build`、`test:unit`、`test:integration`、`test:browser` を個別に実行してよい。ただし、完了確認は `check-all` を正とする。

packageの品質確認やbrowser smoke testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
