# 004 Runtime parameters

## 目的

HTML attributesが `metadata.json` の `stanza:parameter` と `stanza:type` に基づいて `this.params` へ渡ることを確認する。

## 対応する方針

- `this.params` はmetadataに基づく値変換を維持する。
- boolean parameterはHTML boolean attributeとして扱う。
- boolean以外の詳細変換は、現行版の観測結果をもとに同等の動作を実装する。

## 入力条件

- `string`、`number`、`boolean`、`json`、`single-choice`、`text` を含むruntime観測用stanzaを用意する。
- `stanza:style` には `color`、`number`、`text` を含める。
- 必要に応じて `date`、`datetime`、URL系parameterも追加する。
- Stanza sourceは `this.params` の値と型を画面またはログに出す。

## ケース入力と観測補助

`current-pnpm/` はpnpmで現行版を確認する検証環境として用意する。
`generated-repo/` に現行版 `togostanza` 用の最小Stanzaリポジトリを置く。

```text
current-pnpm/
  mise.toml
  generated-repo/
    package.json
    pnpm-lock.yaml
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

- `current-pnpm/mise.toml` でNode.jsの18系とpnpmの9系を指定する。検証ケース直下には `mise.toml` を置かない。
- `current-pnpm/generated-repo/package.json` は `togostanza` を `github:togostanza/togostanza` として参照する。tgz化はしない。
- `parameter-probe` は `metadata.json` に `string`、`number`、`boolean`、`json`、`single-choice`、`text` のparameterを持つ。
- `parameter-probe` は `metadata.json` に `color`、`number`、`text` のstyleを持つ。style metadata由来の値も `this.params` で観測する。
- `index.js` は `this.params` の値と `typeof` を描画し、`handleAttributeChange()` で最後のattribute変更を記録する。
- `fixtures/runtime-parameters.html` はbuild後の `../dist/parameter-probe.js` を直接読み込み、次の入力を並べて確認する。
  - boolean attributeあり: `flag`
  - boolean attributeなし
  - 文字列値: `flag="false"`
  - number: `count="42"`、`count="0"`、`count="7.5"`
  - json: object/array
  - single-choice: `mode="compact"`、`mode="comfortable"`
  - text: `note="..."`
  - style metadata: `--parameter-probe-gap="..."`、`--parameter-probe-caption="..."`
  - attribute mutation: `window.parameterProbeObserver` から `flag`、`count`、`payload` を変更する
- in-app browserからmutationを再現できるように、`fixtures/runtime-parameters.html` にはmutation用の操作ボタンも置く。
- `date`、`datetime`、`url` は追加候補として残す。現時点の観測補助HTMLには入れず、主要4種の現行観測を優先する。

## 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/004-runtime-parameters/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza build --output-path dist
```

build後は `fixtures/runtime-parameters.html` を静的配信してブラウザで確認する。help previewではなく直接埋め込みHTMLを確認対象にする。

```sh
mise exec -- pnpm run serve:fixture
```

確認URL例:

```text
http://localhost:4174/fixtures/runtime-parameters.html
```

## 現行版で観測すること

- 属性ありbooleanが `true` になること。
- 属性なしbooleanが `false` になること。
- `flag="false"` のような文字列値がfalse扱いされないこと。
- number、jsonなどの実際の変換結果。
- `single-choice` と `text` parameterの実際の変換結果。
- `number` と `text` style metadataが `this.params` でどう見えるか。
- attribute変更時の再評価挙動。

### 現行版の観測状況

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/004-runtime-parameters/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4174/fixtures/runtime-parameters.html`

### 実行したコマンド

```sh
cd workbench/cases/004-runtime-parameters/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm run serve:fixture
```

`mise.toml` は `current-pnpm/` に置き、Node.jsの18系とpnpmの9系を固定している。

`mise trust`、`install`、`build`、ローカルHTTPサーバーは、Codex sandboxの権限制約、network制限、またはwatcher制限を避けるため、承認済みの通常コマンド実行で行った。

### build結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build時にSass deprecation warningが多数出た。
- `dist/` には `parameter-probe.js`、`parameter-probe.js.map`、`parameter-probe.css`、`parameter-probe.html`、`parameter-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

### 初期parameter変換

| 入力 | `this.params.label` | `this.params.count` | `this.params.flag` | `this.params.payload` |
| ---- | ------------------- | ------------------- | ------------------ | --------------------- |
| `flag` attributeあり | `flag-present:string` | `42:number` | `true:boolean` | object `{ "kind": "present", "values": [1, 2] }` |
| `flag` attributeなし | `flag-absent:string` | `0:number` | `false:boolean` | object `{ "kind": "absent", "enabled": false }` |
| `flag="false"` | `flag-string-false:string` | `7.5:number` | `true:boolean` | array object `["false-string", { "nested": true }]` |
| mutation初期値 | `before-mutation:string` | `1:number` | `false:boolean` | object `{ "kind": "mutation", "step": "initial" }` |

`single-choice`、`text` parameterと `number`、`text` style metadataは `dist/parameter-probe/metadata.json` と `dist/parameter-probe.js` に含まれることを確認した。

追加browser観測では、`mode` と `note` は `this.params` 上でstringとして見えた。`--parameter-probe-gap` と `--parameter-probe-caption` はmetadataとHTML attributeには存在するが、`this.params` 上では `undefined` だった。

### attribute mutation

mutation targetに対して操作ボタンからattributeを変更した。

| 操作 | `renderCount` | `lastAttributeChange` | 観測値 |
| ---- | ------------- | --------------------- | ------ |
| `flag=""` を設定 | `2` | `flag`, old `null`, new `""` | `flag` は `true:boolean` |
| `flag="false"` を設定 | `3` | `flag`, old `""`, new `"false"` | `flag` は `true:boolean` |
| `flag` を削除 | `4` | `flag`, old `"false"`, new `null` | `flag` は `false:boolean` |
| `count="9.25"` を設定 | `5` | `count`, old `"1"`, new `"9.25"` | `count` は `9.25:number` |
| `payload` をobject JSONに変更 | `6` | `payload`, old initial JSON, new changed JSON | `payload` はobjectとして更新 |
| `mode="comfortable"` を設定 | `2` | `mode`, old `"compact"`, new `"comfortable"` | `mode` は `comfortable:string` |
| `note="after text mutation"` を設定 | `3` | `note`, old `"before text mutation"`, new `"after text mutation"` | `note` は `after text mutation:string` |
| style attributesを変更 | `3` | 変化なし | `--parameter-probe-*` は `this.params` では `undefined` のまま |

style attributesを `--parameter-probe-gap="16"`、`--parameter-probe-caption="after style text mutation"` に変更してもrender countは増えなかった。hostのcomputed custom propertyはmetadata default相当の `--parameter-probe-gap: 8`、`--parameter-probe-caption: metadata caption` のままだった。

### ブラウザ観測メモ

- 各 `<togostanza-parameter-probe>` にはopen shadow rootが作られた。
- stylesheet linkは `http://127.0.0.1:4174/dist/parameter-probe.css`。
- browser consoleのerror/warningは観測されなかった。

## リメイク版で観測すること

- booleanの公開挙動が一致すること。
- boolean以外も、現行版の観測結果と同等に扱われること。
- 不正な値に対するwarning/errorが改善される場合、既存の正しい入力を壊していないこと。

## 合格条件

- boolean parameterの属性有無による判定が一致する。
- 主要な `stanza:type` の変換結果が、現行版観測と矛盾しない。
- 実プロジェクト由来の `single-choice` / `text` parameterと `number` / `text` style metadataの扱いが説明できる。
- `this.params` がStanza sourceから同じ形で参照できる。

## 記録する差分

- metadataのparameter定義。
- HTML attributes。
- `this.params` の値と型。
- attribute変更時の挙動。
- 不正入力時のwarning/error。

## 未決定事項

- boolean以外の詳細変換規則を、どこまで正式仕様へ移すか。
- validation errorとruntime fallbackの境界。
