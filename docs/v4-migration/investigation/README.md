# 既存挙動調査

このセクションでは、既存挙動の調査を扱う。リメイク版の実装設計は扱わない。

## 目的

現行版 `togostanza` の挙動と、実プロジェクトでの使われ方を把握する。

## 調査範囲

次のリポジトリを調査対象にする。

- `references/togostanza`
- `references/metastanza`
- `references/togomedium-web`

調査では、観測された挙動、関連ドキュメント、テスト、ソース参照、直接依存の役割、CLI実行観測、未解決事項を扱う。

調査中に挙がった改善案は、今回の仕様範囲へ自動的には含めず、必要に応じて[Follow-ups](./follow-ups.md)に分離する。

## 調査順

1. まず現行版 `togostanza` を調査する。
2. 調査結果を `metastanza` と照合する。
3. 調査結果を `togomedium-web` と照合する。
4. 未解決事項を[未解決事項](./open-questions.md)に記録する。

## 成果物

- [既存仕様メモ](./spec/index.md): 観測された既存挙動。
- [パラメーター互換性の再確認](./parameter-compatibility-2026-09-18.md): 2026-09-18のV3/V4比較とPhase 11記録の訂正。
- [togostanzaメモ](./repositories/togostanza.md): 現行版リポジトリの詳細。
- [metastanzaメモ](./repositories/metastanza.md): **metastanza**の詳細。
- [togomedium-webメモ](./repositories/togomedium-web.md): **TogoMedium Stanza**の詳細。
- [togostanza-utilsメモ](./repositories/togostanza-utils.md): 実プロジェクトで使われるutility package APIを扱う別調査。
- [未解決事項](./open-questions.md): 未解決事項と人間判断待ち。
- [Follow-ups](./follow-ups.md): 調査中に挙がった改善案と後続候補。

## 境界

この調査では、リメイク版のアーキテクチャを決めない。

`必須`、`再設計`、`破棄` のような採用判断カテゴリは、この調査セクションに最終判断として記録しない。それらは[リメイク方針](../spec/remake-policy.md)で扱う。

このセクションでは、後続の判断材料になる根拠事実を記録する。
