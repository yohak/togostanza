# 004 Runtime parameters

## 目的

HTML attributes が `metadata.json` の `stanza:parameter` と `stanza:type` に基づいて `this.params` へ渡ることを確認する。

## 対応する方針

- `this.params` は metadata に基づく値変換を維持する。
- boolean parameter は HTML boolean attribute として扱う。
- boolean 以外の詳細変換は、現行版の観測結果をもとに同等の動作を実装する。

## 入力条件

- `string`、`number`、`boolean`、`json` を含む runtime 観測用 stanza を用意する。
- 必要に応じて `date`、`datetime`、URL系 parameter も追加する。
- Stanza source は `this.params` の値と型を画面またはログに出す。

## 現行版で観測すること

- 属性あり boolean が `true` になること。
- 属性なし boolean が `false` になること。
- `flag="false"` のような文字列値が false 扱いされないこと。
- number、json などの実際の変換結果。
- attribute 変更時の再評価挙動。

## リメイク版で観測すること

- boolean の公開挙動が一致すること。
- boolean 以外も、現行版の観測結果と同等に扱われること。
- 不正な値に対する warning / error が改善される場合、既存の正しい入力を壊していないこと。

## 合格条件

- boolean parameter の属性有無による判定が一致する。
- 主要な `stanza:type` の変換結果が、現行版観測と矛盾しない。
- `this.params` が Stanza source から同じ形で参照できる。

## 記録する差分

- metadata の parameter 定義。
- HTML attributes。
- `this.params` の値と型。
- attribute 変更時の挙動。
- 不正入力時の warning / error。

## 未決定事項

- boolean 以外の詳細変換規則を、どこまで正式仕様へ移すか。
- validation error と runtime fallback の境界。
