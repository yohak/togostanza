# Phase 12 release checklist

この文書では、GitHub dependency distributionへ進む前に人間が確認する項目を整理する。

Phase 12の短期配布経路は、npm registryへのpublishではなくGitHub dependency installである。

正式版の生成repo仕様では、現行版に寄せてタグ無しGitHub dependencyを既定にする。Stanza開発者は自分の `package.json` に次のようなdependencyを持つ。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza"
  }
}
```

開発中の検証、固定点の記録、TogoMedium確認では不変tagを使う。tagは既存refを動かさず、修正版では新しいtagを作る。

## 現在の判断

| 項目 | 状態 | 判断 |
| ---- | ---- | ---- |
| package name | `togostanza` | 維持する。 |
| 配布経路 | GitHub dependency | 短期的にはnpm publishしない。 |
| root package layout | Phase 12-0で移行 | repo rootをinstallable packageにする。 |
| workspace | なし | `docs/`、`workbench/`、`references/` をroot packageのworkspace対象にしない。 |
| install時build | なし | `prepare` やinstall scriptで `dist/` を作らない。 |
| branch roles | `main` への公開反映を1回実施済み | `develop` を通常開発branch、`main` をinstall可能な公開入口、tagを検証・固定refとして扱う。Phase 13とPhase 14は `develop` から `main` へ反映済みで、`main` はbuild済み `dist/` を含む。local `develop` はremote `develop` より6 commit進んでいる。branch protectionとremote `develop` の同期は後続で扱う。 |
| `develop` の `dist/` | 追跡なし | local `develop` では `dist/` をGit追跡対象から外した。通常開発branchでは `dist/` をcommitしない。 |
| `main` の `dist/` | 必須 | タグ無しGitHub dependencyがdefault branchを読むため、`main` はinstall可能な状態を保つ。install時buildを使わない限り、build済み `dist/` を必ず含める。 |
| `.gitignore` と `dist/` | local確認済み / `main` 反映済み | `develop` では無視し、`main` やrelease tagでは明示的に同梱する。 |
| files | `bin/`, `dist/` | install対象を実行入口とcompiled JSへ絞る。 |
| bin | `togostanza` -> `./bin/togostanza.mjs` | root直下の `bin/` で維持する。 |
| exports | `./config`, `./stanza` | Stanza開発者向けの開発契約として維持する。 |
| root export | なし | Phase 12時点では追加しない。 |
| main / top-level types | なし | Phase 12時点では追加しない。 |
| license | `MIT` | 現行版package metadataと生成雛形の既定licenseに合わせる。 |
| engines.node | `>=24.0.0` | GitHub dependency運用前の見直しで、Node 24系の範囲内で下限を緩和した。開発・検証の標準実行環境はroot `mise.toml` のNode 24.5.0とする。 |
| packageManager | rootの `package.json` で固定 | 開発パッケージの固定として維持する。 |
| generated repo `dependencies.togostanza` | `github:yohak/togostanza` | 正式生成仕様ではタグ無しGitHub dependencyを既定にする。開発中の検証では `TOGOSTANZA_DEPENDENCY_SPEC` でtagまたはcommit SHAを注入してよい。 |
| generated repo `packageManager` field | なし | `init` は生成しない。pnpm workflowはpnpm 11系を明示する。 |
| initial release branch | `release/yohak-github-dependency-20260723` | 初回GitHub dependency検証refとして使った。今後の正式運用では `develop` / `main` / tag の役割定義に合わせて見直す。 |
| initial release tag | `yohak-github-20260723` | organization名を明示し、現行版やnpm versionと混同しないtag名にする。tagは不変として扱い、修正時は新しいtagを作る。 |

## GitHub dependency release前に必ず確認すること

- root package layoutへ移行済みである。
- rootで `mise exec -- pnpm run check-all` が通る。
- rootで `mise exec -- pnpm run test:compat:local` が通る。
- rootで `mise exec -- pnpm run test:distribution:local` が通る。
- rootで `mise exec -- pnpm run test:github-dependency:local` が通る。
- 通常開発branchである `develop` に `dist/` をcommitしていない。
- 公開入口である `main` は、タグ無しGitHub dependencyでinstallできる状態になっている。
- 開発中の検証tagにはbuild済み `dist/` が含まれる。
- `main` や検証tagで `dist/` を含める機構が、`.gitignore` と衝突していない。
- タグ無しGitHub dependencyと検証tagの両方で、npmとpnpmのinstall確認方針が決まっている。
- タグ無しGitHub dependencyのlockfileなしfresh installが、その時点のdefault branchを解決することを確認する。
- タグ無しGitHub dependencyのlockfileありfrozen installが、同じcommitを再現することを確認する。
- 既存Stanzaリポジトリが新しい `main` へ更新する正式手順をREADMEに書く。
- 問題のある `main` を公開した場合は、既存tagの置き換えではなくforward-fixを基本にする。
- install後に `togostanza --version`、`init`、`generate stanza`、`build` が動く。
- install後に `togostanza/stanza` と `togostanza/config` が解決できる。
- TogoMedium実リポジトリなど、少なくとも1つの実プロジェクトでGitHub dependencyが意図通り動く。
- generated repoの `dependencies.togostanza` が、正式生成仕様としてタグ無しGitHub dependencyになる。
- 生成READMEに、通常はタグ無しGitHub dependencyを使い、検証や固定化が必要な場合だけtagまたはcommit SHAを使う案内がある。
- `files` によってinstall対象が最小化されている。
- install対象に `dist/test/` やtest supportが混入していない。
- GitHub Pages workflowで使うlockfileとpnpm 11系の前提がREADMEに残っている。

## タグ無しGitHub dependencyの確認観点

正式版の生成repo仕様では、タグ無しGitHub dependencyを既定にする。`develop` から `main` への公開反映手順を定義するときは、tag指定smokeとは別に次を確認する。

- `git+file://...` のref指定なしdependencyで、npmとpnpmのfresh installがlocal release repositoryのdefault branch `main` を解決する。
- `github:yohak/togostanza` のようなタグ無しdependencyで、npmとpnpmのfresh installが公開remoteのdefault branch `main` を解決する。
- fresh install後のlockfileには、解決されたcommitが記録される。
- lockfileありのfrozen installは、default branchが進んでいてもlockfile上の同じcommitを再現する。
- 既存Stanzaリポジトリを新しい `main` へ更新する手順が、npmとpnpmの両方で確認されている。
- 問題のある `main` を公開した場合は、既存tagの置き換えではなくforward-fixする。必要に応じて、検証用の新しいtagまたはcommit SHAを案内する。

`test:github-dependency:local` は、local release repositoryのrefなし `git+file://...` dependencyで、lockfileなしfresh install、lockfileありfrozen install、同じdependency specでの明示更新を確認する。公開remoteの `github:yohak/togostanza` 経路は、実際の `main` へ反映した後に別途確認する。

公開remoteの `main` 反映後は、`TOGOSTANZA_EXPECTED_GITHUB_MAIN_SHA` に公開したcommit SHAを渡して `test:github-dependency:local` を実行する。これにより、生成リポジトリのlockfileが期待した `main` commitを解決したことを確認する。

## `develop` から `main` への公開反映手順

正式版のbranch運用では、`develop` を通常開発branch、`main` をinstall可能な公開入口として扱う。`develop` には `dist/` をcommitしない。`main` へ公開反映するときだけ、対応するsourceからbuildした `dist/` を明示的に含める。

1. remote stateを取得し、公開remoteのdefault branchが `main` であることを確認する。

```sh
REMOTE=yohak-github
DEVELOP_BRANCH=develop
PUBLIC_BRANCH=main

git fetch --prune --tags ${REMOTE}
git remote show ${REMOTE}
git rev-parse ${DEVELOP_BRANCH}
git rev-parse ${PUBLIC_BRANCH}
git rev-parse ${REMOTE}/${PUBLIC_BRANCH}
git ls-remote --heads ${REMOTE} ${DEVELOP_BRANCH}
```

`git remote show` で `HEAD branch: main` と表示されることを確認する。`main` がremote-tracking branchと同じcommitを指していない場合は、どのcommitを公開対象にするかを人間が判断してから進める。remote `develop` がまだ存在しない場合は、`develop` の最終確認後に人間承認を受けてpushする。

2. `develop` で最終確認を行う。

```sh
git switch ${DEVELOP_BRANCH}
git status --short
git ls-files dist
test -z "$(git status --porcelain)"
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
```

`git ls-files dist` が何も出力しないこと、`git status --short` が空であることを確認する。

remote `develop` が存在しない、またはlocal `develop` のcommitを公開remoteへ反映する必要がある場合は、人間承認後にpushする。

```sh
git push -u ${REMOTE} ${DEVELOP_BRANCH}
```

3. `main` へ `develop` をmergeし、build済み `dist/` を追加する。

```sh
git switch ${PUBLIC_BRANCH}
test -z "$(git status --porcelain)"
git merge --no-ff --no-commit ${DEVELOP_BRANCH}
mise exec -- pnpm run build
git add -f dist
git status --short
git commit -m "release: publish main from ${DEVELOP_BRANCH}"
git ls-tree -r --name-only HEAD -- bin dist package.json
```

`main` は公開入口branchなので、過去の `dist/` 公開commitを保持する。`develop` は `main` の `dist/` commitを取り込まない。反復可能にするため、`main` 側で `develop` を `--no-commit` でmergeし、そのmerge結果から `dist/` をbuildして、source mergeと `dist/` 更新を1つの公開merge commitとして記録する。`dist/` が対応するsourceから生成されたことを保つため、merge後に同じworktreeでbuildし、すぐcommitする。

4. push前に、local `main` のinstall経路を確認する。

```sh
mise exec -- pnpm run test:github-dependency:local
```

このsmokeはlocal release repositoryのdefault branch `main` をref指定なしでinstallする経路を含む。

5. 人間承認後に `main` をpushし、公開GitHub dependencyを確認する。

```sh
git push ${REMOTE} ${PUBLIC_BRANCH}
TOGOSTANZA_EXPECTED_GITHUB_MAIN_SHA=$(git rev-parse ${PUBLIC_BRANCH}) mise exec -- pnpm run test:github-dependency:local
```

push後のsmokeでは、`github:yohak/togostanza` が公開remoteのdefault branch `main` を解決する経路も確認対象になる。

`main` にbranch protectionを設定する場合は、この手順と矛盾しないようにする。直接pushを許容する場合は、release担当者だけが明示承認後にpushできるようにする。PR必須にする場合は、公開merge commitの内容を変えないmerge方式を使い、merge後に上記の公開GitHub dependency smokeを必ず再実行する。force pushは許可しない。

6. 問題が見つかった場合は、既存tagを置き換えずforward-fixする。

- push前なら、`main` を `${REMOTE}/${PUBLIC_BRANCH}` へ戻してやり直す。
- push後なら、`develop` で修正し、同じ手順で新しい `main` commitを公開する。
- Stanzaリポジトリ側はlockfileが解決commitを固定するため、必要に応じてdependency更新とlockfile再生成を案内する。

## release ref作成手順

ここでは、開発中の検証・固定refとしてrelease branch / tagを作る手順を示す。正式生成仕様の既定はタグ無しGitHub dependencyだが、検証や固定化が必要な場合は不変tagを使う。通常開発branchへ `dist/` を混入させないため、作業前にworktreeがcleanであることを確認する。

1. base branch、release branch名、tag名、生成repoへ書くdependency specを決める。通常は `develop` をbase branchにし、release branchとtagには未使用のrelease idを使う。

```sh
REMOTE=yohak-github
BASE_BRANCH=develop
RELEASE_ID=yohak-github-YYYYMMDD-label
RELEASE_BRANCH=release/${RELEASE_ID}
RELEASE_TAG=${RELEASE_ID}
DEPENDENCY_SPEC=github:yohak/togostanza#${RELEASE_TAG}
```

`release/yohak-github-dependency-20260723` と `yohak-github-20260723` は初回検証で使用済みの値であり、再利用しない。
同じ日に複数回release refを作る場合は、`label` に短い目的や連番を入れて重複を避ける。

2. base branchが存在し、release branchとtagがlocal / remoteの両方で未使用であることを確認する。

```sh
git fetch --prune --tags ${REMOTE}
git branch --list ${BASE_BRANCH}
git branch --list ${RELEASE_BRANCH}
git tag --list ${RELEASE_TAG}
git ls-remote --heads ${REMOTE} ${BASE_BRANCH}
git ls-remote --heads ${REMOTE} ${RELEASE_BRANCH}
git ls-remote --tags ${REMOTE} ${RELEASE_TAG}
```

`BASE_BRANCH` はlocal / remoteの両方で表示されること、`RELEASE_BRANCH` と `RELEASE_TAG` はlocal / remoteの両方で何も表示されないことを確認する。

3. base branchがpush先remoteと同じcommitを指していることを確認し、最終確認を実行する。

```sh
git switch ${BASE_BRANCH}
git rev-parse ${BASE_BRANCH}
git rev-parse ${REMOTE}/${BASE_BRANCH}
git status --short
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
```

2つの `git rev-parse` が同じcommitを表示することを確認する。異なる場合は、base branchを更新するか、どのcommitをbaseにするかを人間が判断してから進める。

4. release branchを作る。

```sh
git switch -c ${RELEASE_BRANCH}
```

5. build済み `dist/` を作り、`.gitignore` を越えて明示的にstageする。

```sh
mise exec -- pnpm run build
git add -f dist
git status --short
```

6. release refに必要なファイルが含まれることを確認してcommitする。

```sh
git commit -m "release: include built dist for ${RELEASE_TAG}"
git ls-tree -r --name-only HEAD -- bin dist package.json
```

7. tagを作る。

```sh
git tag ${RELEASE_TAG}
```

8. push前に、tagが指す内容を確認する。

```sh
git ls-tree -r --name-only ${RELEASE_TAG} -- dist/cli.js dist/stanza.js dist/config.js
```

9. 人間承認後にrelease branchとtagをpushする。

```sh
git push ${REMOTE} ${RELEASE_BRANCH}
git push ${REMOTE} ${RELEASE_TAG}
```

10. 公開GitHub refを使って、npm / pnpmの両方でinstall確認を行う。生成repoを作る場合は、検証用の実tagまたはcommit SHAを `TOGOSTANZA_DEPENDENCY_SPEC` で注入し、固定ref経路でも既定installが通ることを確認する。

```sh
TOGOSTANZA_DEPENDENCY_SPEC=${DEPENDENCY_SPEC} npm exec --package ${DEPENDENCY_SPEC} -- togostanza init --name npm-stanza
TOGOSTANZA_DEPENDENCY_SPEC=${DEPENDENCY_SPEC} pnpm --package ${DEPENDENCY_SPEC} dlx togostanza init --name pnpm-stanza
```

GitHub dependencyのtagは不変として扱う。npm / pnpmのlockfileはGit dependencyを解決したcommitへ固定するため、既存tagを動かしても既存生成リポジトリのfrozen installは旧commitを参照し続ける。修正版を出す場合は、新しいtagを作り、Stanzaリポジトリ側のdependency spec更新とlockfile再生成を案内する。

過去の初期調整や切り分けで古いcacheを疑う場合だけ、ローカル対処として次を使う。これは公開済みtagの更新手順ではない。`~/Library/Caches/pnpm/dlx` はmacOSの標準設定を前提にした例であり、別OSや設定変更済み環境では実際のpnpm cache配置を確認してから削除する。

```sh
pnpm store prune
rm -rf ~/Library/Caches/pnpm/dlx
```

## rollback / 差し替え手順

- push前に問題が見つかった場合は、tagを削除し、release branchを破棄して通常branchへ戻る。

```sh
git tag -d ${RELEASE_TAG}
git switch ${BASE_BRANCH}
git branch -D ${RELEASE_BRANCH}
```

- push後に問題が見つかった場合は、既存tagを上書きしない。修正commitから新しいrelease branch / tagを作り、Stanzaリポジトリ側のdependency specを新しいrefへ差し替え、lockfileを再生成する。
- push済みtagの置き換えや再利用は行わない。問題のあるtagを削除する必要がある場合も、Stanza開発者への影響を確認し、人間承認を受けたうえで削除だけを行い、修正版には必ず新しいtag名を使う。

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
