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

## Fixture

`current/` に現行版 `togostanza` 用の最小 Stanza repository を置く。

```text
current/
  mise.toml
  package.json
  common.scss
  fixtures/
    runtime-parameters.html
  stanzas/
    parameter-probe/
      index.js
      metadata.json
      style.scss
      templates/
        stanza.html.hbs
```

- `current/mise.toml` で Node 18 系を指定する。case 直下には `mise.toml` を置かない。
- `current/package.json` は `togostanza` を `github:togostanza/togostanza` として参照する。tgz 化はしない。
- `parameter-probe` は `metadata.json` に `string`、`number`、`boolean`、`json` の parameter を持つ。
- `index.js` は `this.params` の値と `typeof` を描画し、`handleAttributeChange()` で最後の attribute 変更を記録する。
- `fixtures/runtime-parameters.html` は build 後の `../dist/parameter-probe.js` を直接読み込み、次の入力を並べて確認する。
  - boolean attribute あり: `flag`
  - boolean attribute なし
  - 文字列値: `flag="false"`
  - number: `count="42"`、`count="0"`、`count="7.5"`
  - json: object / array
  - attribute mutation: `window.parameterProbeFixture` から `flag`、`count`、`payload` を変更する
- `date`、`datetime`、`url` は追加候補として残す。現時点の fixture には入れず、主要4種の現行観測を優先する。

## 実行予定コマンド

現行版の確認は `current/` で行う。

```sh
cd workbench/cases/004-runtime-parameters/current
mise trust ./mise.toml
mise exec -- node -v
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

build 後は `fixtures/runtime-parameters.html` を静的配信してブラウザで確認する。help preview ではなく直接埋め込みHTMLを確認対象にする。

```sh
python3 -m http.server 4174
```

確認URL例:

```text
http://localhost:4174/fixtures/runtime-parameters.html
```

## 現行版で観測すること

- 属性あり boolean が `true` になること。
- 属性なし boolean が `false` になること。
- `flag="false"` のような文字列値が false 扱いされないこと。
- number、json などの実際の変換結果。
- attribute 変更時の再評価挙動。

### 現行版の観測状況

未実行。fixture と直接埋め込み確認HTMLのみ準備済み。

- `npm install`: 未実行。
- `npx togostanza build --output-path dist`: 未実行。
- ブラウザ確認: 未実行。

記録予定:

- `this.params.label` の値と `typeof`。
- `this.params.count` の値と `typeof`。
- `this.params.flag` の属性あり / なし / `flag="false"` の値と `typeof`。
- `this.params.payload` の object / array 変換結果と `typeof`。
- attribute 変更時に `handleAttributeChange()` が呼ばれるか。
- attribute 変更後に `renderCount` と `this.params` が更新されるか。
- console に warning / error が出るか。

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
