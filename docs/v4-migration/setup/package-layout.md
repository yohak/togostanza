# パッケージ配置

この文書では、リメイク版パッケージの配置方針を扱う。

リメイク版の機能仕様ではなく、リポジトリ構成と開発環境のセットアップ方針を対象とする。

## 方針

- リメイク版は、リポジトリルートの単一Nodeパッケージとして扱う。
- リメイク版の `package.json`、`pnpm-lock.yaml`、`mise.toml` はリポジトリルートに置く。
- 本リポジトリ全体をNodeワークスペースとして扱わない。
- `pnpm-workspace.yaml` は、pnpm 11のdependency build承認など、pnpm設定を置くために使う。
  - `packages` で複数パッケージを列挙しない。
  - `docs/`、`references/`、`workbench/` をNodeワークスペースのpackageとして扱わない。
- `references/*/package.json` はリファレンスリポジトリ側のものとして扱う。
- `workbench/cases/<case>/<env>/package.json` や `workbench/cases/<case>/<env>/<generated-repo>/package.json` は検証環境側のものとして扱う。

この方針は、GitHub dependencyとして本リポジトリを直接installするV4 alpha配布経路を成立させるためのものとする。
`references/`、`workbench/`、`sandbox/` は、ルートパッケージの一部ではなく、調査・検証用の周辺領域として扱う。

## 想定レイアウト

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
mise.toml
bin/
src/
docs/
references/
workbench/
```

`src/` にはCLI、runtime、test、検証用scriptを置く。
`bin/` には配布時に使うCLI入口を置く。
`dist/` は通常開発branchではgitignore対象とし、build済み成果物として生成する。

Phase 12からPhase 14までは、`develop` を通常開発branch、`main` をタグ無しGitHub dependencyの公開入口、tagを検証・固定refとして扱った。V4 alphaではこの短期運用を引き継がず、不変tagを配布単位にする。alpha tagが指すcommitには、同じsourceからbuildした `dist/` を含める。`main` や `develop` の先端はalphaの依存specに使わない。

localでは `develop` branchを作成し、`dist/` をGit追跡対象から外した。remote `develop` も作成済みである。公開remoteのdefault branchが `main` であることは2026-07-27に確認したが、V4 alphaの利用者はdefault branchではなく明示されたtagを参照する。

`develop` から `main` へsourceをmergeし、同じworktreeでbuildした `dist/` を公開merge commitへ含める手順は、Phase 13とPhase 14の公開反映で実施済みである。これは過去の公開手順の記録であり、V4 alphaのrelease手順には [V4 Alpha Release Checklist](../../release/v4-alpha-release-checklist.md) を使う。

## 将来の分割

現段階では、現行版の仕様踏襲を優先し、リメイク版は単一パッケージとして扱う。

将来、CLI、ランタイム、テンプレート、互換レイヤーなどを別パッケージとして分ける必要が出た場合は、ワークスペース化を検討する。
その場合は、`packages/togostanza/` などへの分割も含めて、あらためて配置方針を決める。
