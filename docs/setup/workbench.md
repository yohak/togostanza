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
- 各ケースの `current/` と `remake/` は、それぞれ Stanza群プロジェクトとして扱う。
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
      current/
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

検証ケースは、ケースごとの `README.md` と、同じケース内の `current/` / `remake/` によって構成する。各検証ケースでは次の関係が分かるようにする。

- 入力条件
- 観測対象のコマンド、ブラウザ画面、生成物、ログ
- 現行版の出力
- リメイク版の出力
- メモと重要なログ抜粋

## 人間へ相談する条件

ケース定義として、対象ケースの `current/` / `remake/` に `package.json`、最小 Stanza source、検証用HTMLを置くことは想定範囲とする。

依存 install、lockfile 生成、外部通信を伴うコマンド実行、またはケース範囲を超えるソース変更が必要になりそうな場合は、変更前に停止して人間へ相談する。
