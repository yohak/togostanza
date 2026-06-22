# 検証領域セットアップ

`workbench/` は、CLI実行確認と将来の現行版/リメイク版比較に使う検証領域。

これは使い捨てのサンドボックスではない。検証ケースごとに現行版とリメイク版の検証環境を分け、同じ入力条件を両方で比較できる構造を保つ。

仕様確認のために作って壊す作業は `sandbox/` で行い、再現可能な検証手順として残す段階で `workbench/` に移す。

## 役割

- ケースごとに現行版CLIを実行する検証環境を置く。
- ケースごとにリメイク版CLIを実行する検証環境を置く。
- 再現可能な検証ケースを手順として定義する。
- `references/` を汚さずに現行版CLIの確認を行う。
- 同じ検証ケース内で現行版とリメイク版を比較する。
- 比較のため、生成物をローカルに保持する。

## 初期方針

- `workbench/` 自体はプロジェクト構造の一部とする。
- 各ケースの `current/` と `remake/` は、それぞれ検証環境として扱う。package manager や実行条件を分ける場合は、`current-npm/`、`current-pnpm/` のような検証環境名を使ってよい。
- `init` の挙動を確認するケースでは、検証環境の中で `init --name <name>` を実行し、その生成先 directory を Stanza repository として扱う。
- 検証ケースは [workbench/cases/](../../workbench/cases/README.md) 配下のディレクトリとしてGit管理する想定とする。
- `package.json`、Stanza source、検証用HTMLなどは、ケースの入力条件として必要ならGit管理する。
- `node_modules/`、`dist/`、一時ログ、cache はGit管理から除外する。
- 現時点では、リメイク方針から必要な初期ケースに絞る。

## 想定レイアウト

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
      current/
      remake/
```

## 検証ケースの形

検証ケースは、ケースごとの `README.md` と、同じケース内の検証環境 directory によって構成する。基本形は `current/` / `remake/` だが、必要に応じて `current-npm/`、`current-pnpm/` のように分ける。各検証ケースでは次の関係が分かるようにする。

- 入力条件
- 観測対象のコマンド、ブラウザ画面、生成物、ログ
- 現行版の出力
- リメイク版の出力
- メモと重要なログ抜粋

## 人間へ相談する条件

ケース定義として、対象ケースの検証環境、または検証環境内の生成 repository に `package.json`、最小 Stanza source、検証用HTMLを置くことは想定範囲とする。

依存 install、lockfile 生成、外部通信を伴うコマンド実行、またはケース範囲を超えるソース変更が必要になりそうな場合は、変更前に停止して人間へ相談する。

## 観測時の記録方針

Codex などの管理された実行環境で workbench を観測する場合は、現行版CLIの挙動と実行環境差を分けて記録する。詳細な注意点は [開発用ノート](../development-notes.md) を参照する。

特に次の項目は、各 case の `README.md` に残す。

- 依存 install を通常手順で実行できたかどうか。
- `package-lock.json` がある case で `npm ci` を使った場合は、lockfile からの clean install として記録する。
- 通常手順外の一時実験を行った場合は、その実験を検証完了として扱わないこと。
- sandboxed 実行で失敗し、unsandboxed 実行で成功した command。
- `EMFILE: too many open files, watch` など、Codex実行環境差として扱った error。
- local HTTP server の起動 command、URL、停止方法。
- ブラウザで確認した URL。
- browser console の代表的な warning / error。

lockfile は、現行版依存の解決結果を固定したい case では Git 管理する。`node_modules/`、`dist/`、cache、一時 server log は Git 管理しない。

ブラウザ上で attribute mutation や user interaction を観測する case では、in-app browser から操作できる button などを fixture HTML に置く。read-only な browser evaluation に依存した確認だけを正本にしない。
