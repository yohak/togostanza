# v4 alpha公開チェックリスト

この文書では、`yohak/togostanza` からv4 alphaを内部プレビューへ出す前後の確認を扱う。

alphaはnpm registryへ公開しない。source、build済み `dist/`、package version、Git tagを同じcommitへ揃え、不変tagから配布する。

## 公開単位

最初のalphaは次を使う。

```text
package version: 4.0.0-alpha.0
Git tag: v4.0.0-alpha.0
dependency spec: github:yohak/togostanza#v4.0.0-alpha.0
```

公開済みversionとtagは再利用しない。修正時は `4.0.0-alpha.1` のようにversionを上げる。

## 公開前

- [ ] 機能固定後の変更だけが含まれている。
- [ ] `package.json.version` と公開予定tagが一致している。
- [ ] `package.json.private` が `true` のままであり、npm公開を有効にしていない。
- [ ] `CHANGELOG.md` の対象versionが更新されている。
- [ ] [Alpha版の導入手順](../../README.md#alpha版を試す)のversionとコマンドが一致している。
- [ ] `init` は具体dependency specなしのインストールを拒否する。
- [ ] `TOGOSTANZA_DEPENDENCY_SPEC` で、生成repoの `devDependencies.togostanza` に同じalpha tagを固定できる。
- [ ] 生成repoに `packageManager` fieldを追加していない。
- [ ] Node.js要件が `>=24.0.0` である。

通常の確認を実行する。

```sh
mise exec -- pnpm run check:alpha
git diff --check
```

本リポジトリ内の実プロジェクト確認も行う。ただし、その成功だけではalpha完了条件にしない。

```sh
mise exec -- pnpm run test:compat:local
```

## release commit

alpha tagにはbuild済み `dist/` が必要である。sourceと同じworktreeでbuildし、release commitへ含める。

```sh
mise exec -- pnpm run build
git add package.json CHANGELOG.md README.md docs src
git add -f dist
git status --short
git diff --cached --check
```

stage対象は実際の差分を確認して調整する。既存の未コミット変更を無条件にまとめない。

release commit後に、tagとcommitの内容を確認する。

```sh
ALPHA_VERSION=4.0.0-alpha.0
ALPHA_TAG=v${ALPHA_VERSION}

git status --short
git show HEAD:package.json
git ls-tree -r --name-only HEAD -- bin dist package.json
git tag --list ${ALPHA_TAG}
git ls-remote --tags yohak-github ${ALPHA_TAG}
```

worktreeがcleanであること、`bin/`、`dist/`、`package.json` がrelease commitに含まれること、同名tagがlocalとremoteのどちらにも存在しないことを確認する。

## tag作成と公開

tag作成とpushは、release commitを人間が確認した後に行う。

```sh
git tag -a ${ALPHA_TAG} -m "TogoStanza ${ALPHA_VERSION}"
git push yohak-github ${ALPHA_TAG}
```

公開branchも更新する場合は、tagとは別に対象branchとpush内容を確認する。tag公開だけで内部プレビューを開始できるため、default branchの更新をalpha配布の前提にしない。

## 公開後

npmとpnpmの両方で、公開tagから新しいStanzaリポジトリを生成する。[新規プロジェクトの導入手順](../../README.md#新規プロジェクトで試す)のコマンドをそのまま使う。

次を確認する。

- [ ] `togostanza --version` が対象alphaを表示する。
- [ ] 生成repoの `devDependencies.togostanza` が対象tagへ固定されている。
- [ ] lockfileが公開tagのcommitを固定している。
- [ ] `generate stanza`、`build`、`serve` の代表経路が動く。
- [ ] npmとpnpmの両方でGitHub Pages用workflowを生成できる。

確認結果には、tag、commit SHA、Node.jsとpackage managerのversion、確認コマンド、結果を記録する。

## alpha完了との違い

このチェックリストの完了は、alphaを内部プレビューへ出せることを示す。alphaフェーズ全体の完了には、`metastanza` とTogoMedium Stanzaの各オーナーによる確認が別途必要である。

alpha完了条件と正式版betaへの移行は、[正式版統合計画](./official-integration-plan.md)に従う。
