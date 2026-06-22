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
- in-app browser から mutation を再現できるように、`fixtures/runtime-parameters.html` には mutation 用の操作ボタンも置く。
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
mise exec -- node -e "const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const port=4174;const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const pathname=url.pathname==='/'?'/fixtures/runtime-parameters.html':url.pathname;const file=path.join(process.cwd(),decodeURIComponent(pathname));fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end('not found');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(body);});}).listen(port,()=>console.log('http://localhost:'+port+'/fixtures/runtime-parameters.html'));"
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

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/004-runtime-parameters/current/`
- Node.js: `v18.20.4`
- npm: `10.7.0`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4174/fixtures/runtime-parameters.html`

### 実行したコマンド

```sh
cd workbench/cases/004-runtime-parameters/current
mise trust ./mise.toml
mise exec -- npm install
mise exec -- npm install --package-lock-only
mise exec -- npx togostanza --version
mise exec -- npx togostanza build --output-path dist
mise exec -- node -e "..."
```

依存取得は、Codex sandbox の実行環境制限を避けるため通常手順外の一時実験を含んだ。このため、依存取得そのものは通常手順での完了確認として扱わない。

`package-lock.json` は、通常の npm command として `mise exec -- npm install --package-lock-only` で生成した。

`mise trust`、`build`、local HTTP server は、Codex sandbox の権限制約または watcher 制限を避けるため許可済みの unsandboxed 実行で行った。

### build 結果

- sandboxed exec の `mise exec -- npx togostanza build --output-path dist` は、`EMFILE: too many open files, watch` で失敗した。
- 同じ command は unsandboxed 実行では成功した。
- build 時に Sass deprecation warning が多数出た。
- `dist/` には `parameter-probe.js`、`parameter-probe.js.map`、`parameter-probe.css`、`parameter-probe.html`、`parameter-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

### 初期 parameter 変換

| 入力 | `this.params.label` | `this.params.count` | `this.params.flag` | `this.params.payload` |
| ---- | ------------------- | ------------------- | ------------------ | --------------------- |
| `flag` attribute あり | `flag-present:string` | `42:number` | `true:boolean` | object `{ "kind": "present", "values": [1, 2] }` |
| `flag` attribute なし | `flag-absent:string` | `0:number` | `false:boolean` | object `{ "kind": "absent", "enabled": false }` |
| `flag="false"` | `flag-string-false:string` | `7.5:number` | `true:boolean` | array object `["false-string", { "nested": true }]` |
| mutation 初期値 | `before-mutation:string` | `1:number` | `false:boolean` | object `{ "kind": "mutation", "step": "initial" }` |

### attribute mutation

mutation target に対して操作ボタンから attribute を変更した。

| 操作 | `renderCount` | `lastAttributeChange` | 観測値 |
| ---- | ------------- | --------------------- | ------ |
| `flag=""` を設定 | `2` | `flag`, old `null`, new `""` | `flag` は `true:boolean` |
| `flag="false"` を設定 | `3` | `flag`, old `""`, new `"false"` | `flag` は `true:boolean` |
| `flag` を削除 | `4` | `flag`, old `"false"`, new `null` | `flag` は `false:boolean` |
| `count="9.25"` を設定 | `5` | `count`, old `"1"`, new `"9.25"` | `count` は `9.25:number` |
| `payload` を object JSON に変更 | `6` | `payload`, old initial JSON, new changed JSON | `payload` は object として更新 |

### ブラウザ観測メモ

- 各 `<togostanza-parameter-probe>` には open shadow root が作られた。
- stylesheet link は `http://127.0.0.1:4174/dist/parameter-probe.css`。
- browser console の error / warning は観測されなかった。

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
