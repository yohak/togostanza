# TogoStanza Remake

このリポジトリでは、現行版リポジトリ [`togostanza`](https://github.com/togostanza/togostanza) を参考に、TogoStanza CLI / runtime のリメイク実装を進める。

現時点では短期配布経路としてGitHub dependencyを使い、正式版マージに向けた互換性確認と開発者向け体験の整理を続けている。

## 最初に読むもの

セットアップ、調査範囲、仕様整理の方針は、[ドキュメント](./docs/README.md)を参照する。

## フォルダ構造

```text
bin/
docs/
references/
sandbox/
src/
workbench/
```

| パス | 役割 |
| ---- | ---- |
| `bin/` | CLI entrypoint |
| `docs/` | 計画、調査、仕様整理の文書 |
| `references/` | Git管理外のリファレンスリポジトリ置き場 |
| `sandbox/` | Git管理外の仕様確認用領域 |
| `src/` | リメイク版CLI / runtimeの実装、test、script |
| `workbench/` | 再現可能な検証に使う検証領域 |
