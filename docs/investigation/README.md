# 既存挙動調査

このセクションでは、既存挙動を調査する。リメイク版の実装設計は扱わない。

## 目的

現行版 `togostanza` の挙動と、実プロジェクトでの使われ方を把握する。

## 調査範囲

次のリポジトリを調査対象にする。

- `references/togostanza`
- `references/metastanza`
- `references/togomedium-web`

調査では、観測された挙動、関連ドキュメント、テスト、ソース参照、直接依存の役割、CLI実行観測、未解決事項を扱う。

## 調査順

1. まず現行版 `togostanza` を調査する。
2. 調査結果を `metastanza` と照合する。
3. 調査結果を `togomedium-web` と照合する。
4. 未解決事項を [未解決事項](./open-questions.md) に記録する。

## 成果物

- [既存仕様メモ](./spec/index.md): 観測された既存挙動。
- [togostanzaメモ](./repositories/togostanza.md): 現行版リポジトリの詳細メモ。
- [metastanzaメモ](./repositories/metastanza.md): **metastanza** の詳細メモ。
- [togomedium-webメモ](./repositories/togomedium-web.md): **TogoMedium Stanza** の詳細メモ。
- [未解決事項](./open-questions.md): 未解決事項と人間判断待ち。

## 境界

ここではリメイク版のアーキテクチャを決めない。

`必須`、`候補`、`不明`、`除外候補` のような採用判断カテゴリは、この調査セクションに最終判断として記録しない。それらは今後 `docs/spec/` で扱うリメイク版仕様に属する。

このセクションには、後続の判断材料になる根拠事実を記録する。
