# Phase 12 release checklist

この文書では、GitHub dependency distributionへ進む前に人間が確認する項目を整理する。

Phase 12の短期配布経路は、npm registryへのpublishではなくGitHub dependency installである。Stanza開発者は自分の `package.json` に次のようなdependencyを書く。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza#<tag-or-sha>"
  }
}
```

## 現在の判断

| 項目 | 状態 | 判断 |
| ---- | ---- | ---- |
| package name | `togostanza` | 維持する。 |
| 配布経路 | GitHub dependency | 短期的にはnpm publishしない。 |
| root package layout | Phase 12-0で移行 | repo rootをinstallable packageにする。 |
| workspace | なし | `docs/`、`workbench/`、`references/` をroot packageのworkspace対象にしない。 |
| install時build | なし | `prepare` やinstall scriptで `dist/` を作らない。 |
| release branch / tag | local smokeで機構確認済み | build済み `dist/` を含むGitHub dependency向けrefを作る。 |
| main branchの `dist/` | なし | 通常開発branchでは `dist/` をcommitしない。 |
| `.gitignore` と `dist/` | `git add -f dist/` を採用 | 通常branchでは無視し、release refでは明示的に同梱する。 |
| files | `bin/`, `dist/` | install対象を実行入口とcompiled JSへ絞る。 |
| bin | `togostanza` -> `./bin/togostanza.mjs` | root直下の `bin/` で維持する。 |
| exports | `./config`, `./stanza` | Stanza開発者向けの開発契約として維持する。 |
| root export | なし | Phase 12時点では追加しない。 |
| main / top-level types | なし | Phase 12時点では追加しない。 |
| license | `MIT` | 現行版package metadataと生成雛形の既定licenseに合わせる。 |
| engines.node | `>=24.5.0` | Phase 12時点では維持する。GitHub dependency運用前に利用者環境と再確認する。 |
| packageManager | rootの `package.json` で固定 | 開発パッケージの固定として維持する。 |
| generated repo `dependencies.togostanza` | `github:yohak/togostanza#<tag-or-sha>` | 通常生成ではplaceholderを書き、release時にtagまたはcommit SHAへ差し替える。 |
| generated repo `packageManager` field | なし | `init` は生成しない。pnpm workflowはpnpm 11系を明示する。 |
| initial release branch | `release/yohak-github-dependency-20260723` | 初回GitHub dependency release refとして使う。 |
| initial release tag | `yohak-github-20260723` | organization名を明示し、現行版やnpm versionと混同しないtag名にする。同じ日付の初期調整では、tag名を増やさず必要に応じてcache削除で対応する。 |

## GitHub dependency release前に必ず確認すること

- root package layoutへ移行済みである。
- rootで `mise exec -- pnpm run check-all` が通る。
- rootで `mise exec -- pnpm run test:compat:local` が通る。
- rootで `mise exec -- pnpm run test:distribution:local` が通る。
- rootで `mise exec -- pnpm run test:github-dependency:local` が通る。
- 通常開発branchに `dist/` をcommitしていない。
- release branch / tagにはbuild済み `dist/` が含まれる。
- release branch / tagで `dist/` を含める機構が、`.gitignore` と衝突していない。
- release branch / tagのrefを使って、npmとpnpmの両方でGitHub dependency installできる。
- install後に `togostanza --version`、`init`、`generate stanza`、`build` が動く。
- install後に `togostanza/stanza` と `togostanza/config` が解決できる。
- TogoMedium実リポジトリなど、少なくとも1つの実プロジェクトでGitHub dependencyが意図通り動く。
- generated repoの `dependencies.togostanza` が、GitHub dependency specとして意図した値になる。
- 生成READMEに、`<tag-or-sha>` をrelease tagまたはcommit SHAへ差し替えてからinstallする案内がある。
- `files` によってinstall対象が最小化されている。
- install対象に `dist/test/` やtest supportが混入していない。
- GitHub Pages workflowで使うlockfileとpnpm 11系の前提がREADMEに残っている。

## release ref作成手順

ここでは、公開GitHub dependency用のrelease branch / tagを作る手順を示す。通常開発branchへ `dist/` を混入させないため、作業前にworktreeがcleanであることを確認する。

1. release branch名、tag名、生成repoへ書くdependency specを決める。初回は次の値を使う。

```sh
RELEASE_BRANCH=release/yohak-github-dependency-20260723
RELEASE_TAG=yohak-github-20260723
DEPENDENCY_SPEC=github:yohak/togostanza#${RELEASE_TAG}
```

2. 通常branchで最終確認を実行する。

```sh
git status --short
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
```

3. release branchを作る。

```sh
git switch -c ${RELEASE_BRANCH}
```

4. build済み `dist/` を作り、`.gitignore` を越えて明示的にstageする。

```sh
mise exec -- pnpm run build
git add -f dist
git status --short
```

5. release refに必要なファイルが含まれることを確認してcommitする。

```sh
git commit -m "release: include built dist for ${RELEASE_TAG}"
git ls-tree -r --name-only HEAD -- bin dist package.json
```

6. tagを作る。

```sh
git tag ${RELEASE_TAG}
```

7. push前に、tagが指す内容を確認する。

```sh
git ls-tree -r --name-only ${RELEASE_TAG} -- dist/cli.js dist/stanza.js dist/config.js
```

8. 人間承認後にrelease branchとtagをpushする。

```sh
git push yohak-github ${RELEASE_BRANCH}
git push yohak-github ${RELEASE_TAG}
```

9. 公開GitHub refを使って、npm / pnpmの両方でinstall確認を行う。生成repoを作る場合は、実tagまたはcommit SHAを `TOGOSTANZA_DEPENDENCY_SPEC` で注入するか、生成後に `package.json` の `<tag-or-sha>` を差し替える。

```sh
TOGOSTANZA_DEPENDENCY_SPEC=${DEPENDENCY_SPEC} npm exec --package ${DEPENDENCY_SPEC} -- togostanza init --name npm-stanza
TOGOSTANZA_DEPENDENCY_SPEC=${DEPENDENCY_SPEC} pnpm --package ${DEPENDENCY_SPEC} dlx togostanza init --name pnpm-stanza
```

`--skip-install` で生成する場合は、生成後に `package.json` の `github:yohak/togostanza#<tag-or-sha>` を実tagまたはcommit SHAへ差し替えてからinstallする。

pnpmで同名tagの古い内容を掴む場合は、次の順でcacheを削除してから再実行する。

```sh
pnpm store prune
rm -rf ~/Library/Caches/pnpm/dlx
```

`pnpm store prune` はstore metadataとpackage cacheを削除する。`pnpm dlx` が古いtag内容を使い続ける場合は、別途 `~/Library/Caches/pnpm/dlx` の削除が必要になる。

## rollback / 差し替え手順

- push前に問題が見つかった場合は、tagを削除し、release branchを破棄して通常branchへ戻る。

```sh
git tag -d ${RELEASE_TAG}
git switch main
git branch -D ${RELEASE_BRANCH}
```

- push後に問題が見つかった場合は、原則として既存tagを上書きしない。修正commitから新しいrelease branch / tagを作り、生成repoのdependency specを新しいrefへ差し替える。
- 初回GitHub dependency releaseのように利用者が限られる場合は、人間判断で同じtagを差し替えてよい。その場合は、pnpmの古いdlx cacheを削除する手順を合わせて案内する。
- push済みtagの削除や置き換えが必要な場合は、Stanza開発者への影響を確認し、人間承認を受けてから行う。

## 外部副作用があるため明示承認を受けてから行うこと

- release branchのpush。
- tag作成。
- GitHub release作成。
- 公開GitHub Pages環境へのlive deploy。
- npm registryへのpublish。

## Phase 12通常作業では行わないこと

- `npm publish`
- GitHub Packages npm registryへの公開。
- npm registry上の `latest` packageを使った確認。
- install時buildに依存するGitHub dependency確認。
