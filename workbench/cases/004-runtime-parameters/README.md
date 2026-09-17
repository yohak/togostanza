# 004 Runtimeパラメーター

## 目的

HTML属性が `metadata.json` の `stanza:parameter` と `stanza:type` に基づいて `this.params` へ渡ることを確認する。

## 対応する方針

- `this.params` はメタデータに基づく値変換を維持する。
- booleanパラメーターはHTML boolean属性として扱う。
- boolean以外の詳細変換は、現行版の観測結果をもとに同等の動作を実装する。

## 入力条件

- `string`、`number`、`boolean`、`json`、`single-choice`、`text` を含むランタイム観測用stanzaを用意する。
- `stanza:style` には `color`、`number`、`text` を含める。
- 必要に応じて `date`、`datetime`、URL系パラメーターも追加する。
- Stanzaソースは `this.params` の値と型を画面またはログに出す。

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
- `parameter-probe` は `metadata.json` に `string`、`number`、`boolean`、`json`、`single-choice`、`text` のパラメーターを持つ。
- `parameter-probe` は `metadata.json` に `color`、`number`、`text` のstyleを持つ。現行版観測では、styleメタデータ由来の値と `this.params` の関係も確認する。
- `index.js` は `this.params` の値と `typeof` を描画し、`handleAttributeChange()` で最後の属性変更を記録する。
- `fixtures/runtime-parameters.html` はビルド後の `../dist/parameter-probe.js` を直接読み込み、次の入力を並べて確認する。
  - boolean attributeあり: `flag`
  - boolean attributeなし
  - 文字列値: `flag="false"`
  - number: `count="42"`、`count="0"`、`count="7.5"`
  - json: object/array
  - single-choice: `mode="compact"`、`mode="comfortable"`
  - text: `note="..."`
  - styleメタデータ: `--parameter-probe-gap="..."`、`--parameter-probe-caption="..."`
  - 属性変更: `window.parameterProbeObserver` から `flag`、`count`、`payload` を変更する
- in-appブラウザから変更を再現できるように、`fixtures/runtime-parameters.html` には変更用の操作ボタンも置く。
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

ビルド後は `fixtures/runtime-parameters.html` を静的配信してブラウザで確認する。ヘルププレビューではなく直接埋め込みHTMLを確認対象にする。

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
- `single-choice` と `text` パラメーターの実際の変換結果。
- `number` と `text` styleメタデータが `this.params` でどう見えるか。
- 属性変更時の再評価挙動。

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

### ビルド結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルド時にSass deprecation警告が多数出た。
- `dist/` には `parameter-probe.js`、`parameter-probe.js.map`、`parameter-probe.css`、`parameter-probe.html`、`parameter-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

### 初期パラメーター変換

| 入力 | `this.params.label` | `this.params.count` | `this.params.flag` | `this.params.payload` |
| ---- | ------------------- | ------------------- | ------------------ | --------------------- |
| `flag` attributeあり | `flag-present:string` | `42:number` | `true:boolean` | object `{ "kind": "present", "values": [1, 2] }` |
| `flag` attributeなし | `flag-absent:string` | `0:number` | `false:boolean` | object `{ "kind": "absent", "enabled": false }` |
| `flag="false"` | `flag-string-false:string` | `7.5:number` | `true:boolean` | array object `["false-string", { "nested": true }]` |
| 変更前の初期値 | `before-mutation:string` | `1:number` | `false:boolean` | object `{ "kind": "mutation", "step": "initial" }` |

`single-choice`、`text` パラメーターと `number`、`text` styleメタデータは `dist/parameter-probe/metadata.json` と `dist/parameter-probe.js` に含まれることを確認した。

追加ブラウザ観測では、`mode` と `note` は `this.params` 上でstringとして見えた。`--parameter-probe-gap` と `--parameter-probe-caption` はメタデータとHTML属性には存在するが、`this.params` 上では `undefined` だった。

### 属性変更

変更対象に対して操作ボタンから属性を変更した。

| 操作 | `renderCount` | `lastAttributeChange` | 観測値 |
| ---- | ------------- | --------------------- | ------ |
| `flag=""` を設定 | `2` | `flag`, old `null`, new `""` | `flag` は `true:boolean` |
| `flag="false"` を設定 | `3` | `flag`, old `""`, new `"false"` | `flag` は `true:boolean` |
| `flag` を削除 | `4` | `flag`, old `"false"`, new `null` | `flag` は `false:boolean` |
| `count="9.25"` を設定 | `5` | `count`, old `"1"`, new `"9.25"` | `count` は `9.25:number` |
| `payload` をobject JSONに変更 | `6` | `payload`, old initial JSON, new changed JSON | `payload` はobjectとして更新 |
| `mode="comfortable"` を設定 | `2` | `mode`, old `"compact"`, new `"comfortable"` | `mode` は `comfortable:string` |
| `note="after text mutation"` を設定 | `3` | `note`, old `"before text mutation"`, new `"after text mutation"` | `note` は `after text mutation:string` |
| style属性を変更 | `3` | 変化なし | `--parameter-probe-*` は `this.params` では `undefined` のまま |

style属性を `--parameter-probe-gap="16"`、`--parameter-probe-caption="after style text mutation"` に変更してもrender countは増えなかった。hostのcomputed custom propertyはメタデータ既定値相当の `--parameter-probe-gap: 8`、`--parameter-probe-caption: metadata caption` のままだった。

### ブラウザ観測メモ

- 各 `<togostanza-parameter-probe>` にはopen shadow rootが作られた。
- stylesheet linkは `http://127.0.0.1:4174/dist/parameter-probe.css`。
- ブラウザコンソールのエラー/警告は観測されなかった。

## リメイク版で観測すること

- booleanの公開挙動が一致すること。
- boolean以外も、現行版の観測結果と同等に扱われること。
- `stanza:style` はCSS custom propertyの既定値用途として扱い、`this.params` には入れないこと。
- 不正な値に対する警告/エラーが改善される場合、既存の正しい入力を壊していないこと。

### リメイク版の観測状況

Phase 2-3で確認済み。

- 確認日: 2026-06-30
- 確認対象: `src/test/browser/custom-element.smoke.spec.ts`
- 確認コマンド: `mise exec -- pnpm run test:browser`
- 追加確認: `mise exec -- pnpm run check-all`

リメイク版の観測は、検証ケース配下の独立した `remake/` 環境ではなく、リメイク版パッケージのbrowser test内で一時生成したstanzaリポジトリを使って行った。

確認した入力:

- `label` は `string`。
- `count` は `number`。
- `flag` は `boolean`。
- `payload` は `json`。
- `mode` は `single-choice`。
- `note` は `text`。
- `--parameter-probe-gap` は `stanza:style` 由来のCSS custom property。

初期パラメーター変換:

| 入力 | `this.params.label` | `this.params.count` | `this.params.flag` | `this.params.payload` |
| ---- | ------------------- | ------------------- | ------------------ | --------------------- |
| `flag` attributeあり | `flag-present:string` | `42:number` | `true:boolean` | object `{ "kind": "present", "values": [1, 2] }` |
| `flag` attributeなし | `flag-absent:string` | `0:number` | `false:boolean` | object `{ "kind": "absent", "enabled": false }` |
| `flag="false"` | `flag-string-false:string` | `7.5:number` | `true:boolean` | array object `["false-string", { "nested": true }]` |

追加で、`mode` は `compact:string` または `comfortable:string`、`note` はstringとして描画されることを確認した。

`stanza:style` 由来の `--parameter-probe-gap` は、`this.params["--parameter-probe-gap"]` では `undefined` だった。一方で、hostのcomputed custom propertyとして `--parameter-probe-gap: 8px` が確認できた。

属性変更:

| 操作 | `lastAttributeChange` | 観測値 |
| ---- | --------------------- | ------ |
| `count="9.25"` を設定 | `count`, old `"1"`, new `"9.25"` | `count` は `9.25:number` |
| `payload` をobject JSONに変更 | `payload`, old initial JSON, new changed JSON | `payload` はobjectとして更新 |
| `flag=""` を設定 | `flag` の変更として扱う | `flag` は `true:boolean` |
| `flag` を削除 | `flag` の変更として扱う | `flag` は `false:boolean` |

Phase 2-3では、date/datetimeの変換はunit testで確認した。004のbrowser観測では主要型の表示と属性変更を優先した。

### Phase 11-4 runtime edge確認

Phase 11-4では、`references/togostanza` commit `2e5982d` の `stanza.ts` を読み、`this.params` のedge semanticsを再確認した。

- booleanは、引き続き属性の有無で判定する。
- boolean以外の未指定parameterは、現行版では `this.params` にkeyが入り、値は `null` になる。リメイク版もPhase 11-4でこの挙動へ寄せた。
- `number` は `Number(value)` で変換する。invalid値は `NaN` になる。
- `date` / `datetime` は `new Date(value)` で変換する。invalid値はInvalid Dateになる。
- `json` は `JSON.parse(value)` で変換する。invalid JSONは例外になる。リメイク版もPhase 11-4でこの挙動へ寄せた。
- `single-choice`、`text`、未知の `stanza:type` はstringとして扱う。

invalid値の細かいfallbackや警告条件は、引き続きリメイク版仕様の外部契約としては固定しない。集約結果は `docs/v4-migration/implementation/phase-11/runtime-edge-semantics.md` に記録した。

## 合格条件

- booleanパラメーターの属性有無による判定が一致する。
- 主要な `stanza:type` の変換結果が、現行版観測と矛盾しない。
- 実プロジェクト由来の `single-choice` / `text` パラメーターと `number` / `text` styleメタデータの扱いが説明できる。
- リメイク版では、styleメタデータが `this.params` ではなくCSS custom propertyの既定値として扱われる。
- `this.params` がStanzaソースから同じ形で参照できる。

## 記録する差分

- メタデータのパラメーター定義。
- HTML属性。
- `this.params` の値と型。
- 属性変更時の挙動。
- 不正入力時の警告/エラー。

## 未決定事項

- boolean以外の詳細変換規則を、どこまで正式仕様へ移すか。
- validationエラーとランタイムfallbackの境界。

## Phase 6 リメイク版workbench入力

`remake/generated-repo/` は、004のパラメーター変換観測をリメイク版CLIで再実行するための入力である。

基本手順:

```sh
cd package
mise exec -- pnpm run build
cd ../workbench/cases/004-runtime-parameters/remake/generated-repo
pnpm install
pnpm run build:local
pnpm run serve:fixture
```

確認URLは `http://127.0.0.1:4174/fixtures/runtime-parameters.html` とする。`build:local` / `serve:local` はrepo-local CLIを呼ぶworkbench用scriptであり、生成repo利用者向けの `build` / `serve` とは分けている。

## Phase 13 ヘルププレビュー観測

- 確認日: 2026-07-27
- 確認対象: `src/test/browser/custom-element.smoke.spec.ts`
- 確認コマンド: `mise exec -- pnpm run test:browser`

リメイク版のリッチなヘルププレビューで、次を確認した。

- `stanza:parameter` からtext、number、boolean、single-choice、date、datetime、jsonのフォームが生成される。
- パラメーター初期値は `stanza:default` を優先し、無い場合は `stanza:example` を使う。
- query parameterを付けてヘルプページを開いても、フォーム初期値は上書きされない。
- フォーム値の変更はプレビュー対象custom elementの属性へ反映され、Stanzaの再描画へつながる。
- booleanがfalseの場合は対象属性を付けず、trueにした場合だけ属性を付ける。
- `stanza:style` の既定値からフォームを生成し、変更値をcustom elementのCSS custom propertyへ反映する。
- HTML snippetは現在のparameter値を反映し、既定値から変更されたstyleだけをstyle blockへ含める。
