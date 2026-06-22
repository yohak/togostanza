# 003 Runtime embedding

## 目的

Stanza Web Component が、一般的なWebサイトへ直接埋め込めることを確認する。

## 対応する方針

- `type="module"` script と `<togostanza-{id}>` custom element による埋め込み形式は利用契約として必須。
- 埋め込み先Webサイトに Vite、React、Vue、npm install、追加 build step を要求しない。
- help preview の実装やUIは runtime 埋め込み形式とは別物として扱う。
- `serve` はローカル確認の入口として維持する。

## 入力条件

- build 済みの `dist/` を静的に配信できる状態にする。
- help preview ではない、最小のHTMLページを用意する。
- HTML は `<script type="module" src="./{id}.js">` と `<togostanza-{id}>` を直接書く。

## Fixture

`current/` は 001 の scaffold 結果を参考にした、現行版用の最小 Stanza repository として用意する。

```text
current/
  mise.toml
  package.json
  package-lock.json
  common.scss
  runtime-embed.html
  stanzas/
    hello/
      index.js
      metadata.json
      style.scss
      templates/stanza.html.hbs
```

`runtime-embed.html` は help preview とは別の確認用HTMLで、build 後の `./dist/hello.js` を module script として読み込み、`<togostanza-hello say-to="runtime">` を直接配置する。

`remake/` はリメイク版CLI実装後に、同じ入力意図で作る。

## 実行コマンド

現行版の確認は `current/` で行う。

```sh
mise trust ./mise.toml
mise exec -- node -v
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

build 後は、`current/runtime-embed.html` を静的配信してブラウザで確認する。確認方法は `serve` または簡易HTTPサーバのどちらでもよいが、help preview ではなく `runtime-embed.html` を開く。

```sh
mise exec -- npx togostanza serve
```

または、build artifact の静的配信だけを確認する場合は、Node.js の簡易サーバを使う。

```sh
mise exec -- node -e "const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const port=4173;const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const pathname=url.pathname==='/'?'/runtime-embed.html':url.pathname;const file=path.join(process.cwd(),decodeURIComponent(pathname));fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end('not found');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(body);});}).listen(port,()=>console.log('http://localhost:'+port+'/runtime-embed.html'));"
```

その場合の確認URL例:

```text
http://localhost:4173/runtime-embed.html
```

## 現行版で観測すること

- module script が読み込まれること。
- custom element が定義されること。
- shadow root が `open` で作られること。
- Stanza ごとの CSS が shadow root 内に適用されること。
- help preview と直接埋め込みで挙動を混同しないこと。

### 現行版の観測状況

未実行。fixture と確認HTMLのみ準備済み。

記録予定:

- `dist/hello.js` が生成されるか。
- `runtime-embed.html` から `dist/hello.js` が module script として読み込まれるか。
- `customElements.get("togostanza-hello")` が定義済みになるか。
- `<togostanza-hello>` に open shadow root が作られるか。
- `say-to="runtime"` が `this.params["say-to"]` として反映されるか。
- console に致命的な module load error が出ないか。

## リメイク版で観測すること

- 同じHTMLで custom element が動くこと。
- 埋め込み先が追加 build step を持たなくても動くこと。
- framework runtime が必要な場合も Stanza 配布物側に含まれていること。
- shared chunk がある場合、静的ホスティング上の相対 import で動くこと。

## 合格条件

- `<togostanza-{id}>` がブラウザ上で描画される。
- shadow root と stylesheet が確認できる。
- console に致命的な module load error が出ない。
- help preview のUIに依存せず確認できる。

## 記録する差分

- 確認URL。
- HTML snippet。
- network request の主要 path。
- browser console の warning / error。
- shadow root と描画結果の観測メモ。

## 未決定事項

- `serve` の CORS、HMR、watch、livereload の詳細。
- in-app browser 以外のブラウザ検証をどの段階で行うか。
