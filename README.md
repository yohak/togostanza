# TogoStanza Remake

このリポジトリでは、現行版リポジトリ [`togostanza`](https://github.com/togostanza/togostanza) を参考に、TogoStanza CLI / runtime のリメイク実装を進める。

現時点ではv4 alphaの内部プレビュー準備を進めている。alphaは `yohak/togostanza` の不変Git tagから配布し、正式版リポジトリへ統合した後にbetaとしてnpm公開する。

## 最初に読むもの

セットアップ、調査範囲、仕様整理の方針は、[ドキュメント](./docs/README.md)を参照する。

v4 alphaを試す場合は、[alpha内部プレビュー手順](./docs/guides/alpha-testing.md)を参照する。

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
