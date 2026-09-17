# TogoStanza V4 Alpha

## このプロジェクトについて

TogoStanzaは、データの可視化などを行うstanzaを作成し、Webページへ埋め込める形で配布するためのツール。stanzaはWeb Componentsとして動作し、HTMLから読み込んで利用できる。

V4は、[従来のTogoStanza](https://github.com/togostanza/togostanza)をもとに、YohakがCLI・ビルド環境・ランタイムを再設計したもの。既存のstanzaソースとWebページへの埋め込み方法を可能な範囲で活かしながら、Node.js 24とVite 8を使う構成へ更新している。既存プロジェクトでは、一部の設定やソースの移行が必要になる。

現在は、正式公開に向けてAlpha版を公開し、実プロジェクトでのビルド、表示、操作、移行手順を確認する段階にある。このREADMEでは、公開済みの `v4.0.0-alpha.0` を試す手順を示す。Alpha版はnpmレジストリではなく、`yohak/togostanza` のGitタグから導入する。

今後はAlpha版での確認を経て、正式版リポジトリへの統合、npmでのBeta版公開、正式版 `4.0.0` の公開へ進む予定。各段階の条件は[正式公開までのロードマップ](./docs/for-maintainers/release/official-integration-plan.md)を参照する。

## Alpha版を試す

### 前提条件

- Node.js 24以上。
- npm、またはpnpm 11以降。既存プロジェクトでは、使用中のパッケージマネージャーを使う。
- Git。

以下のコマンドは、TogoStanza本体の開発リポジトリではなく、試したいstanzaプロジェクトで実行する。新規作成の場合は、プロジェクトを置きたい親ディレクトリから始める。

### 既存プロジェクトで試す

作業用のブランチを作り、移行前の `package.json` とlockfileをGitに残してから進める。既存設定の自動変換は行われないため、依存を更新した後に設定を確認する。

**1. Alpha版へ依存を更新する**

`package.json` の `devDependencies.togostanza` を、次のGitタグへ書き換える。`dependencies` に `togostanza` がある場合は、`devDependencies` へ移す。他の依存はそのまま残す。

```json
{
  "devDependencies": {
    "togostanza": "github:yohak/togostanza#v4.0.0-alpha.0"
  }
}
```

変更後、プロジェクトのルートで、使用中のパッケージマネージャーに合わせてインストールする。

npmの場合:

```sh
npm install
npm exec -- togostanza --version
```

pnpmの場合:

```sh
pnpm install
pnpm exec togostanza --version
```

バージョン表示が `4.0.0-alpha.0` になることを確認する。

**2. 既存の設定を確認する**

次に該当する場合は、[ソース・設定の移行ガイド](./docs/for-developers/guides/source-config-migration.md)に沿って変更する。

- `togostanza-build.js` / `togostanza-build.mjs` を使っている場合は、設定を `togostanza.config.ts` へ移す。
- `tsconfig.json` の `paths` や独自のimport別名を使っている場合は、ビルドに必要な別名を `vite.resolve.alias` に指定する。
- TypeScriptで `togostanza/stanza` や `togostanza/config` の型を解決する場合は、`moduleResolution` の設定を確認する。

**3. ビルドとブラウザ表示を確認する**

npmの場合:

```sh
npm exec -- togostanza build
npm exec -- togostanza serve
```

pnpmの場合:

```sh
pnpm exec togostanza build
pnpm exec togostanza serve
```

起動後に [http://localhost:8080/](http://localhost:8080/) を開き、一覧から確認したいstanzaを選ぶ。代表的なstanzaの表示、パラメーター変更、操作を確認する。既存の埋め込みページがある場合は、そちらの表示とデータ連携も確認する。

サーバーは `Ctrl+C` で停止できる。移行後の `package.json` とlockfileの差分を確認し、必要になった設定・ソースの修正とともに記録する。

### 新規プロジェクトで試す

npmとpnpmのどちらか一方を選び、次の手順を実行する。`my-stanza-repository` は作成するディレクトリ名に置き換えられる。

`init` はプロジェクトの雛形作成、Git初期化、依存関係のインストールまで行う。`TOGOSTANZA_DEPENDENCY_SPEC` は、生成先のTogoStanza依存を、起動するCLIと同じAlpha版へ固定するために指定する。

npmの場合:

```sh
TOGOSTANZA_DEPENDENCY_SPEC=github:yohak/togostanza#v4.0.0-alpha.0 \
npm exec --yes --package github:yohak/togostanza#v4.0.0-alpha.0 -- \
  togostanza init --name my-stanza-repository --package-manager npm

cd my-stanza-repository
npm exec -- togostanza --version
npm exec -- togostanza generate stanza hello
npm run build
npm run serve
```

pnpmの場合:

```sh
TOGOSTANZA_DEPENDENCY_SPEC=github:yohak/togostanza#v4.0.0-alpha.0 \
pnpm --package github:yohak/togostanza#v4.0.0-alpha.0 dlx togostanza \
  init --name my-stanza-repository --package-manager pnpm

cd my-stanza-repository
pnpm exec togostanza --version
pnpm exec togostanza generate stanza hello
pnpm build
pnpm serve
```

起動後に [http://localhost:8080/hello.html](http://localhost:8080/hello.html) を開き、`Hello, world!` の表示を確認する。パラメーター `say-to` を変更すると、挨拶の相手が変わる。

生成したstanzaは `stanzas/hello/` にある。ソースやスタイルを編集し、再ビルド後にブラウザを再読み込みすると変更を確認できる。サーバーは `Ctrl+C` で停止する。

`package.json` と、npmでは `package-lock.json`、pnpmでは `pnpm-lock.yaml` を同じコミットに含める。

### Alpha版を更新する

別のAlpha版へ更新するときは、`package.json` の `devDependencies.togostanza` を、次に試す公開済みGitタグへ書き換える。その後、`npm install` または `pnpm install` を実行し、バージョン表示、ビルド、代表的なstanzaのブラウザ表示を再確認する。

Gitタグは固定して使い、タグ無し参照やブランチ指定へ戻さない。公開済みタグは上書きされず、修正版は新しいバージョンとして公開される。更新後は `package.json` とlockfileの差分を確認し、同じコミットに含める。確認結果と必要になった移行修正も記録する。

## 不具合・確認結果のフィードバック

不具合や移行時に困った点は、[yohak/togostanzaのIssues](https://github.com/yohak/togostanza/issues)へ報告する。問題なく動いた場合の確認結果も、Alpha版の検証に役立つ。

報告には次を含める。

- 使用したAlpha版のバージョンとGitタグ。
- 対象プロジェクトとコミット、Node.jsとパッケージマネージャーのバージョン。
- 実行したコマンドと、インストール・ビルドの成否。
- 確認したstanzaやページ、期待した動作と実際の結果。エラーがある場合はログや再現手順。
- 移行に必要だった設定・ソースの修正。

## 開発ドキュメント

- [stanza作成者向け文書](./docs/for-developers/README.md): 導入、設定移行、現行V4仕様への案内。
- [TogoStanza本体の開発・保守文書](./docs/for-maintainers/README.md): 品質確認、開発環境、公開手順への案内。
- [開発ドキュメント一覧](./docs/README.md): 計画、設計、調査記録の入口。
- [V4仕様](./docs/v4-migration/spec/index.md): CLI、設定、stanzaソースAPI、ランタイムなどの仕様。
- [正式公開までのロードマップ](./docs/for-maintainers/release/official-integration-plan.md): Alpha、Beta、正式版への移行条件と進め方。
