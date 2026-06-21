# 007 Config and resolution

## 目的

build 設定、import 解決、asset 参照の扱いを確認し、既存 Stanza source を壊さない範囲を見極める。

## 対応する方針

- 現行の `togostanza-build.mjs/js` による Rollup plugin 注入は再設計する。
- 新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。
- 旧設定ファイルは無条件に実行せず、検出して migration note へ誘導する。
- 既存 Stanza source からの asset import が壊れないことを見る。
- alias 互換は実装時判断とするが、既存 Stanza source を壊さないことを優先する。

## 入力条件

- `togostanza-build.mjs` を持つケースを用意する。
- `togostanza-build.js` を持つケースを用意する。
- asset import と public asset 参照を含む Stanza source を用意する。
- 実プロジェクトで観測された alias / tsconfig paths を必要に応じて反映する。

## 現行版で観測すること

- `.mjs` 設定が現行 build に影響するか。
- `.js` 設定が現行 build に影響するか。
- asset import の出力 path。
- root `assets/` と stanza `assets/` の公開 path。
- 実プロジェクトで使われている alias。

## リメイク版で観測すること

- 旧設定ファイルを検出したときの warning / error。
- `togostanza.config.ts` の読み込み。
- Vite plugin / Vite config の escape hatch。
- asset import と public asset 参照が壊れていないこと。
- alias が必要な既存 source を吸収できること。

## 合格条件

- 旧設定ファイルを無条件に実行しない。
- 移行先が分かる診断が出る。
- 既存 Stanza source の asset 参照が壊れない。
- alias 由来の差分がある場合、migration note の要否が判断できる。

## 記録する差分

- 設定ファイル名と読み込み有無。
- warning / error の内容。
- import 解決結果。
- asset 出力 path。
- alias 設定の有無。

## 未決定事項

- `defineTogoStanzaConfig()` の schema。
- alias 合成順。
- asset の inline / emit / hash / threshold。
