# GitHub dependency 運用ガイド

この文書では、Stanza開発者がリメイク版 `togostanza` をGitHub dependencyとして使うときの運用を扱う。

この文書はnpm registry公開手順ではない。短期的な `github:yohak/togostanza` 経路で、インストール、lockfile、更新の扱いを揃えるための案内である。

## 基本方針

生成リポジトリの `package.json` では、通常はタグ無しGitHub dependencyを使う。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza"
  }
}
```

タグ無しGitHub dependencyは、インストール時点の公開remoteのdefault branchを解決する。リメイク版では、公開remoteのdefault branchを `main` とし、`main` をインストール可能な公開入口として扱う。

## lockfileの扱い

npm / pnpmは、GitHub dependencyを解決したcommitをlockfileへ記録する。

そのため、`main` が更新されても、既存のStanzaリポジトリが自動で新しいcommitへ追従するわけではない。

- lockfileなしの新規インストールは、その時点の `main` を解決する。
- lockfileありのfrozen installは、lockfileに記録されたcommitを再現する。
- 既存Stanzaリポジトリで新しい `main` へ更新したい場合は、dependencyを明示更新し、lockfileを再生成する。

## 更新手順

npmの場合:

```sh
npm install togostanza@github:yohak/togostanza
git status --short
```

pnpmの場合:

```sh
pnpm update togostanza --latest --force
git status --short
```

更新後は、`package-lock.json` または `pnpm-lock.yaml` の差分を確認し、Stanzaリポジトリ側でcommitする。

## 固定refを使う場合

通常はタグ無しGitHub dependencyを使う。検証や一時的な固定が必要な場合だけ、tagまたはcommit SHAを指定する。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza#yohak-github-20260723"
  }
}
```

公開済みtagは不変として扱う。問題が見つかった場合、既存tagを置き換えず、新しいtagまたは `main` のforward-fixへ進む。

## 古い内容が使われる場合

まずlockfileが古いcommitを固定していないか確認する。lockfileが古い場合は、上記の更新手順でdependencyを更新する。

キャッシュ削除は、公開済みtagの置き換えやlockfile更新の代替ではない。ローカルで原因を切り分ける必要がある場合だけ使う。

macOSの標準設定でpnpmのdlxキャッシュを疑う場合の例:

```sh
pnpm store prune
rm -rf ~/Library/Caches/pnpm/dlx
```

別OSや設定変更済み環境では、実際のpnpm cache配置を確認してから削除する。

## 関連文書

- [リメイク版仕様](../spec/index.md)
- [Phase 12 release checklist](../implementation/phase-12/release-checklist.md)
