# v4 alpha内部プレビュー

この文書では、`yohak/togostanza` のv4 alphaを、不変のGit tagから試す手順を示す。

alphaはnpm registryへ公開しない。対象tagと生成されるStanzaリポジトリの依存を同じrefへ固定し、lockfileもcommitする。

## 前提

- Node.js 24以上。
- npmまたはpnpm 11。
- 使用するalpha versionが、`yohak/togostanza` のGit tagとして公開済みであること。

以下の例では `4.0.0-alpha.0` を使う。別のalphaを試す場合は、versionとtagを同時に置き換える。

```sh
ALPHA_VERSION=4.0.0-alpha.0
ALPHA_SPEC=github:yohak/togostanza#v${ALPHA_VERSION}
```

公開済みtagは移動、上書き、再利用しない。修正版は `alpha.1`、`alpha.2` のようにversionを上げる。

## npmで新しいStanzaリポジトリを作る

```sh
TOGOSTANZA_DEPENDENCY_SPEC=${ALPHA_SPEC} \
npm exec --yes --package ${ALPHA_SPEC} -- \
  togostanza init --name my-stanza-repository --package-manager npm
```

生成後に、versionとlockfileを確認する。

```sh
cd my-stanza-repository
npm exec togostanza --version
npm run build
git status --short
```

`package.json` は次の形になる。

```json
{
  "devDependencies": {
    "togostanza": "github:yohak/togostanza#v4.0.0-alpha.0"
  }
}
```

`package-lock.json` と `package.json` を同じcommitに含める。

## pnpmで新しいStanzaリポジトリを作る

```sh
TOGOSTANZA_DEPENDENCY_SPEC=${ALPHA_SPEC} \
pnpm --package ${ALPHA_SPEC} dlx togostanza \
  init --name my-stanza-repository --package-manager pnpm
```

生成後に、versionとlockfileを確認する。

```sh
cd my-stanza-repository
pnpm exec togostanza --version
pnpm build
git status --short
```

`pnpm-lock.yaml` と `package.json` を同じcommitに含める。

## 既存のStanzaリポジトリで試す

作業前にbranchを作り、既存のlockfileを保持する。

npmの場合:

```sh
npm install --save-dev togostanza@${ALPHA_SPEC}
npm exec togostanza --version
npm run build
git status --short
```

pnpmの場合:

```sh
pnpm add --save-dev togostanza@${ALPHA_SPEC}
pnpm exec togostanza --version
pnpm build
git status --short
```

既存の `dependencies.togostanza` は `devDependencies.togostanza` へ移す。package managerが自動で移動しない場合は `package.json` を修正してから、もう一度インストールする。

## alphaを更新する

別のalphaへ更新するときは、Git refを明示的に変更する。既存tagを追従させたり、default branchへ戻したりしない。

npmの場合:

```sh
NEXT_ALPHA_VERSION=4.0.0-alpha.1
NEXT_ALPHA_SPEC=github:yohak/togostanza#v${NEXT_ALPHA_VERSION}
npm install --save-dev togostanza@${NEXT_ALPHA_SPEC}
```

pnpmの場合:

```sh
NEXT_ALPHA_VERSION=4.0.0-alpha.1
NEXT_ALPHA_SPEC=github:yohak/togostanza#v${NEXT_ALPHA_VERSION}
pnpm add --save-dev togostanza@${NEXT_ALPHA_SPEC}
```

更新後は、package定義とlockfileの差分を確認し、ビルドと代表的なブラウザ表示を再確認する。

## 確認結果を記録する

実プロジェクトの確認結果には、少なくとも次を残す。

- 使用したalpha versionとGit tag。
- 対象プロジェクトのcommit。
- Node.jsとpackage managerのversion。
- インストールとビルドの結果。
- 確認した代表的なStanzaまたはページ。
- 必要になった移行修正。
- beta移行を妨げる問題の有無。

本リポジトリ内の検証成功だけではalpha完了としない。`metastanza` とTogoMedium Stanzaは、それぞれのオーナーによる確認をalpha完了条件にする。

## 関連文書

- [正式版統合計画](../implementation/official-integration-plan.md)
- [v4仕様](../spec/index.md)
- [GitHub dependency運用ガイド](./github-dependency.md)
