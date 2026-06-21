# サンドボックスセットアップ

`sandbox/` は、仕様確認のために一時的な Stanza群プロジェクトを作って壊す作業用領域。

調査中の試行錯誤はまず `sandbox/` で行い、再現可能な検証手順として残す段階で `workbench/` に移す。

## 役割

- 現行版CLIの挙動を自由に試す。
- Stanza群プロジェクトの構成や生成物を確認する。
- 失敗した構成や途中状態を気にせず破棄する。
- 検証領域へ移す前の下調べを行う。

## 方針

- `sandbox/` の中身はGit管理外とする。
- `sandbox/` 内の `package.json`、lockfile、`node_modules/`、生成物はコミットしない。
- 調査結果として残す内容は、`docs/investigation/` に記録する。
- 再現可能な比較手順として残す内容は、`workbench/cases/` に移す。
- 現行版/リメイク版の比較に使う構成は、必要に応じて `workbench/cases/<case>/current/` と `workbench/cases/<case>/remake/` に反映する。

## 検証領域との違い

| 項目 | サンドボックス | 検証領域 |
| ---- | -------------- | -------- |
| 目的 | 仕様確認の試行錯誤 | 再現可能な比較 |
| Git管理 | しない | 検証環境と検証ケース定義は管理する想定 |
| 内容 | 作って壊す途中状態を許可する | 後から同じ確認を実行できる状態に整える |
| 配置 | `sandbox/` | `workbench/` |

## 初期作成

必要になった環境で作成する。

```sh
mkdir -p sandbox
```

`sandbox/` はGit管理外領域なので、作成した内容はこのリポジトリにはコミットしない。

## 現行版CLIのsandboxを作るときの注意

現行版の Stanza群プロジェクトを確認するときは、手作業で構成を作らず、まず現行版CLIの `init` で生成する。

```sh
cd /Volumes/DATA/repositories/togostanza-remake/sandbox

mise exec -- npx togostanza init \
  --git-url "" \
  --name current-cli-smoke \
  --license MIT \
  --package-manager npm \
  --skip-install \
  --skip-git
```

`togostanza init` は、指定した `--name` のサブディレクトリを作る。`sandbox/current-cli-smoke` の中で実行すると `sandbox/current-cli-smoke/current-cli-smoke` のように二重になるため、`sandbox/` 直下で実行する。

`--skip-install` と `--skip-git` を付け、初期生成物の確認と依存installを分ける。生成直後の `package.json` は `dependencies.togostanza` が `github:togostanza/togostanza` になる。

```sh
cd /Volumes/DATA/repositories/togostanza-remake/sandbox/current-cli-smoke
mise exec -- npm install
```

現行版は最近ほとんど動いていないため、sandbox では通常利用に近い `github:togostanza/togostanza` 参照のまま扱う。ローカルで作ったパッケージに差し替えるようなイレギュラーなセットアップは、通常経路との差分が増えるため避ける。

`npm install` は GitHub と npm registry へのアクセス、および npm cache への書き込みを行う。AIが実行する場合は、必要に応じて network/cache 書き込みを許可したうえで実行する。

```sh
ls -la node_modules/togostanza
mise exec -- npx togostanza --version
```

Stanzaを追加する場合も現行版CLIで生成する。

```sh
mise exec -- npx togostanza generate stanza hello \
  --label Hello \
  --definition "Smoke test stanza" \
  --license MIT \
  --author Codex \
  --timestamp 2026-06-20
```

## AI実行時の注意

Codex などのAIが管理された shell sandbox 内で `togostanza build` や `togostanza serve` を実行すると、Broccoli watcher が `EMFILE: too many open files, watch` で失敗する場合がある。

この失敗は、少なくとも `current-cli-smoke` では現行版CLIの一般的な失敗ではない。同じ環境でも、ユーザーの通常ターミナルと Codex の unsandboxed 実行では `build` が完了した。

AIが現行版CLIの `build` / `serve` を確認するときは、sandboxed exec で粘らず、許可済みの unsandboxed 実行として扱う。`.codex/rules/default.rules` には、現行版調査で使う `togostanza build` / `serve` 系コマンドを許可対象として記載する。

```sh
cd /Volumes/DATA/repositories/togostanza-remake/sandbox/current-cli-smoke

mise exec -- npx togostanza build --output-path dist
mise exec -- npx togostanza serve --port 8099
```

`serve` を起動した場合は、調査メモに次を記録する。

- 起動コマンド
- 作業ディレクトリ
- ポート
- 停止方法
- ブラウザ確認に使ったURL

ローカルホスト確認は外部ブラウザを起動せず、in-app browser で行う。
