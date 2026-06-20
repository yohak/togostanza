# TogoStanza Remake

このリポジトリは、現行版リポジトリ [`togostanza`](https://github.com/togostanza/togostanza) を参考にした、非公式リメイクの準備用リポジトリ。

現時点では、実装済みツールではなく、調査と計画を進める段階。現行版の既存挙動を把握し、実プロジェクトでの使われ方を確認しながら、将来のリメイク方針を整理する。

## 最初に読むもの

セットアップ、調査範囲、仕様整理の方針は、[ドキュメント](./docs/README.md)を参照する。

## フォルダ構造

```text
docs/
references/
sandbox/
workbench/
package/
```

| パス | 役割 |
| ---- | ---- |
| `docs/` | 計画、調査、仕様整理の文書 |
| `references/` | リファレンスリポジトリを置くGit管理外領域 |
| `sandbox/` | 仕様確認の試行錯誤に使うGit管理外領域 |
| `workbench/` | 再現可能な検証に使う検証領域 |
| `package/` | リメイク版の単一パッケージ実装置き場 |
