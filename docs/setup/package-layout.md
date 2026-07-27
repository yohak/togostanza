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

この方針は、GitHub dependencyとして本リポジトリを直接installする短期配布経路を成立させるためのものとする。
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

正式版のbranch運用では、`develop` を通常開発branch、`main` を一般公開入口、tagを検証・固定refとして扱う方針を採用した。タグ無しGitHub dependencyがdefault branchを読むため、`main` はinstall可能である必要がある。install時buildを行わない方針を維持する限り、`main` は `dist/` を必ず含める。一方、`develop` では `dist/` を追跡しない。

localでは `develop` branchを作成し、`dist/` をGit追跡対象から外した。remote `develop` も作成済みである。タグ無しGitHub dependencyはdefault branchを解決するため、公開remoteのdefault branchは `main` として維持する。公開remoteのdefault branchが `main` であることは2026-07-27に確認した。branch protectionと、`develop` から `main` への反映実行は後続作業で扱う。

## 将来の分割

現段階では、現行版の仕様踏襲を優先し、リメイク版は単一パッケージとして扱う。

将来、CLI、ランタイム、テンプレート、互換レイヤーなどを別パッケージとして分ける必要が出た場合は、ワークスペース化を検討する。
その場合は、`packages/togostanza/` などへの分割も含めて、あらためて配置方針を決める。
