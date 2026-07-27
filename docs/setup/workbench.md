# 検証領域セットアップ

`workbench/` は、CLI実行確認と、現行版/リメイク版比較に使う検証領域とする。

これは使い捨てのサンドボックスではない。検証ケースごとに現行版とリメイク版の検証環境を分け、同じ入力条件で両方を比較できる構造を保つ。

仕様確認のために作って壊す作業は `sandbox/` で行い、再現可能な検証手順として残す段階で `workbench/` に移す。

## 役割

- 検証ケースごとに現行版CLIを実行する検証環境を置く。
- 検証ケースごとにリメイク版CLIを実行する検証環境を置く。
- 再現可能な検証ケースを手順として定義する。
- `references/` を汚さずに現行版CLIの確認を行う。
- 同じ検証ケース内で現行版とリメイク版を比較する。
- 比較のため、生成物をローカルに保持する。

## 方針

- `workbench/` 自体はプロジェクト構造の一部とする。
- 各検証ケースの `current/` と `remake/` は、それぞれ検証環境として扱う。パッケージマネージャーや実行条件を分ける場合は、`current-npm/`、`current-pnpm/` のような検証環境名を使ってよい。
- `init` の挙動を確認する検証ケースでは、検証環境の中で `init --name <name>` を実行し、その生成先ディレクトリをStanzaリポジトリとして扱う。
- 検証ケースは [workbench/cases/](../../workbench/cases/README.md) 配下のディレクトリとしてGit管理する。
- `package.json`、Stanzaソース、検証用HTMLなどは、検証ケースの入力条件として必要な場合にGit管理する。
- `node_modules/`、`dist/`、一時ログ、キャッシュはGit管理から除外する。
- リメイク方針と仕様の確認に必要なケースに絞り、追加時は観測契約を明示する。

## 配置例

```text
workbench/
  cases/
    README.md
    001-cli-scaffold-and-generate/
      README.md
      current-npm/
        mise.toml
        generated-repo/
          package.json
          node_modules/
      current-pnpm/
        mise.toml
        generated-repo/
          package.json
          node_modules/
      remake/
        package.json
        node_modules/
    002-build-artifacts/
      README.md
      current-pnpm/
        mise.toml
        generated-repo/
      remake/
```

## 検証ケースの形

検証ケースは、検証ケースごとの `README.md` と、同じ検証ケース内の検証環境ディレクトリで構成する。基本形は `current/` / `remake/` だが、必要に応じて `current-npm/`、`current-pnpm/` のように分ける。各検証ケースでは、次の関係が分かるようにする。

- 入力条件
- 観測対象のコマンド、ブラウザ画面、生成物、ログ
- 現行版の出力
- リメイク版の出力
- メモと重要なログ抜粋

## 人間へ相談する条件

検証ケース定義として、対象の検証ケースの検証環境、または検証環境内の生成リポジトリに `package.json`、最小Stanzaソース、検証用HTMLを置くことは想定範囲とする。

依存インストール、lockfileの生成、外部通信を伴うコマンド実行、または検証ケース範囲を超えるソース変更が必要になりそうな場合は、変更前に停止して人間へ相談する。

## 観測時の記録方針

Codexなどの管理された実行環境で `workbench/` を観測する場合は、現行版CLIの挙動と実行環境差を分けて記録する。詳細な注意点は [開発用ノート](../development-notes.md) を参照する。

特に次の項目は、各検証ケースの `README.md` に残す。

- 依存インストールを通常手順で実行できたかどうか。
- `package-lock.json` がある検証ケースで `npm ci` を使った場合は、lockfileからのクリーンインストールとして記録する。
- 通常手順外の一時実験を行った場合は、その実験を検証完了として扱わないこと。
- sandboxed実行で失敗し、unsandboxed実行で成功したコマンド。
- `EMFILE: too many open files, watch` など、Codex実行環境差として扱ったエラー。
- ローカルHTTPサーバーの起動コマンド、URL、停止方法。
- ブラウザで確認したURL。
- ブラウザコンソールの代表的な警告/エラー。

lockfileは、現行版依存の解決結果を固定したい検証ケースではGit管理する。`node_modules/`、`dist/`、キャッシュ、一時サーバーログはGit管理しない。

ブラウザ上で属性変更やユーザー操作を観測する検証ケースでは、in-app browserから操作できるボタンなどを観測補助HTMLに置く。読み取り専用のブラウザ評価に依存した確認だけを基準にしない。
