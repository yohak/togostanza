# パッケージ配置

この文書では、リメイク版パッケージの配置方針を扱う。

リメイク版の機能仕様ではなく、リポジトリ構成と開発環境のセットアップ方針を対象とする。

## 方針

- ルートの `package.json` は置かない。
- リメイク版は、`package/` 直下の単一パッケージとして作る。
- リメイク版の `package.json` は `package/package.json` に置く。
- 本リポジトリ全体をNodeワークスペースとして扱わない。
- `references/*/package.json` はリファレンスリポジトリ側のものとして扱う。
- `workbench/cases/<case>/<env>/package.json` や `workbench/cases/<case>/<env>/<generated-repo>/package.json` は検証環境側のものとして扱う。

この方針により、リポジトリルートは調査・計画・検証・実装をまとめる場所として扱い、Nodeパッケージとしての関心は `package/` に閉じる。

## 想定レイアウト

```text
docs/
references/
workbench/
package/
  package.json
  src/
  test/
```

## 将来の分割

現段階では、現行版の仕様踏襲を優先し、リメイク版は単一パッケージとして扱う。

将来、CLI、ランタイム、テンプレート、互換レイヤーなどを別パッケージとして分ける必要が出た場合は、ワークスペース化を検討する。その場合は `package/` から `packages/togostanza/` への移行も含めて、あらためて配置方針を決める。
