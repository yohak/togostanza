# 008 Real project regression

## 目的

`metastanza` と `TogoMedium Stanza` を使い、実プロジェクトで重要な互換性を確認する。

## 対応する方針

- 実プロジェクト群は互換性判断の強い根拠として扱う。
- `metastanza` は可能な限り固定点として扱うが、must ではない。
- `TogoMedium Stanza` は検証と発見のための実プロジェクトとして扱う。
- 既存 Stanza source は可能な限り変更しない。

## 入力条件

- `references/metastanza` と `references/togomedium-web` は直接汚さない。
- 必要な場合は、このケースの `current/` と `remake/` に検証用コピーまたは最小再現を作る。
- 実プロジェクト側の build / serve 手順は、各リポジトリの調査メモと照合する。

## 現行版で観測すること

- `metastanza` の Stanza source、metadata、設定、生成物。
- `TogoMedium Stanza` の React / TSX、alias、埋め込み側との関係。
- 実プロジェクトで `this.root`、`main`、`togostanza--menu` 周辺に依存している箇所。
- asset、style、help page、metadata の利用実態。

## リメイク版で観測すること

- 既存 Stanza source の変更量。
- 必要な migration note。
- build / runtime / embedding の通過可否。
- 見た目と DOM の regression。
- TogoMedium 側で調整可能な範囲と、TogoStanza側で吸収すべき範囲。

## 合格条件

- `metastanza` が大きな手修正なしで通る、または外す理由が明確である。
- `TogoMedium Stanza` の主要 Stanza が、説明可能な調整範囲で通る。
- 実プロジェクトで観測された重要な依存が、仕様または migration note に反映される。

## 記録する差分

- 対象 Stanza 一覧。
- source 変更の有無。
- build 結果。
- runtime 確認結果。
- DOM / style / menu の差分。
- migration note 候補。

## 未決定事項

- 実プロジェクトをどこまで自動回帰テストに入れるか。
- visual regression の導入時期。
- TogoMedium 側で調整する範囲。
