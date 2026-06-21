# 既存仕様メモ

この文書では、観測された現行版の挙動を記録する。リメイク版実装の仕様ではない。

この文書が長くなった場合は、このディレクトリ配下に焦点を絞った文書を分割し、このファイルをindexとして維持する。

## 根拠タグ

観測結果を記録するときは、次のタグを使う。

- `docs`: 旧ドキュメントで観測した。
- `tests`: 旧テストまたはsnapshotで観測した。
- `code`: 実装で観測した。
- `consumer`: `metastanza` または `togomedium-web` で観測した。
- `cli`: CLIコマンド実行で観測した。

## 観測メモのテンプレート

```text
### 挙動名

- 領域:
- 観測内容:
- 根拠:
- 実利用での使用:
- 重要なログまたは出力:
- メモ:
```

## 挙動領域

### CLI

- `togostanza` entrypoint は `bin/togostanza.mjs`。[code][cli]
- command は `serve|s`、`build|b`、`generate|g`、`init`、`upgrade`。[code][cli]
- `--version` は `package.json` の version を表示する。調査時点では `3.0.0-beta.57`。[code][cli]
- `build`、`serve`、`generate stanza` は stanza repository 内で実行される前提で、cwd の `package.json` と local install 済み `togostanza` を確認する。[code]
- `init` は repository scaffold のための command で、既存 stanza repository 内での実行前提とは異なる。[code][tests]
- `upgrade` は旧構成から現行構成への移行 command として、metadata 移動と index.js 変換を行う。[code][tests]

### オプション

- `serve|s` は `-p, --port <port>` を持ち、既定値は `8080`。[code][cli]
- `build|b` は `-o, --output-path <dir>` を持ち、既定値は `./dist`。[code][cli]
- `generate stanza [id]` は `--label`、`--definition`、`--license`、`--author`、`--timestamp` を持つ。[code][cli]
- `init` は `--git-url`、`--name`、`--license`、`--package-manager <npm|yarn>`、`--skip-install`、`--skip-git` を持つ。[code][cli][tests]
- docs の Reference では serve option が `-p, -port <port>` と書かれているが、CLI help と実装では `-p, --port <port>`。[docs][code][cli]

### 設定と入力ファイル

- stanza 検出は `stanzas/*/metadata.json` による。[code]
- stanza build 入力は `metadata.json`、`README.md`、`index.tsx|index.ts|index.js`、`templates/*`、`style.scss`、`assets/`。[code]
- repository root の `assets/` は build 入力になり、`dist/assets/` へコピーされる。[code][tests]
- `tsconfig.json` が存在する場合は TypeScript compile 設定として使われる。[code]
- `togostanza-build.mjs` が存在する場合は custom Rollup plugins を追加する。[code][docs]
- watcher は `.`, `README.md`, `package.json`, `stanzas/**`, `lib/**`, `assets/**` を監視対象にする。[code]
- `metastanza` と `togomedium-web/@packages/stanza` では `style.scss` が観測され、`stanza.scss` は観測されなかった。[consumer]
- `metastanza` と `togomedium-web/@packages/stanza` では、確認できた `metadata.json` の `@id` は stanza directory 名と一致していた。[consumer]

### 生成物

- `build` は既定で `./dist` に出力する。[code][cli]
- stanza ごとに `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}/metadata.json`、`${id}/assets/*` が生成される。[code][tests]
- `style.scss` が存在しない場合も空の `${id}.css` が生成される。[code]
- page 側では `index.html`、`${stanza.id}.html`、`-togostanza/index-app.js`、`-togostanza/help-app.js` と関連 chunk が生成される。[code][tests]
- help page は stanza script を `<script type="module" src="./{{metadata.[@id]}}.js" async>` で読み込む。[code]
- docs の Getting Started は埋め込み例として `type="module"` script と `<togostanza-hello say-to="world">` を示している。[docs]
- `sandbox/current-cli-smoke` は `npx togostanza init` と `npx togostanza generate stanza hello` で生成した。ユーザーの通常ターミナルで `build --output-path dist` が成功し、`index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/`、`assets/`、`-togostanza/` が生成された。[cli]
- `sandbox/current-cli-smoke` で runtime 観測用に `runtime-check` stanza を生成して build すると、`runtime-check.html`、`runtime-check.js`、`runtime-check.js.map`、`runtime-check.css`、`runtime-check/metadata.json` が生成された。[cli]
- `sandbox/current-cli-smoke/dist/hello.html` は `<script type="module" src="./hello.js" async>` と `-togostanza/help-app.js` の import を含む。[cli]
- `sandbox/current-cli-smoke/dist/index.html` は `-togostanza/index-app.js` の import を含む。[cli]
- `sandbox/current-cli-smoke/dist/runtime-check.html` は `<script type="module" src="./runtime-check.js" async>` と `-togostanza/help-app.js` の import を含む。[cli]

### 開発サーバ

- `serve` は development environment で preview server を起動する。[code]
- 起動ログは `Serving at http://localhost:${port}`。[code]
- SIGINT/SIGTERM で watcher を停止する handler が登録される。[code]
- Codex の sandboxed exec では、切り分け中に `build` が `Error: EMFILE: too many open files, watch` で終了するケースがあった。[cli]
- ユーザーの通常ターミナルと Codex の unsandboxed 実行では、`sandbox/current-cli-smoke` の `build --output-path dist` が成功した。[cli]
- AI が現行版の `build` / `serve` を確認する場合は、sandboxed exec ではなく許可済みの unsandboxed 実行を使う必要がある。[cli]
- `sandbox/current-cli-smoke` で `serve --port 8099` を起動すると、`http://127.0.0.1:8099/` は `List of Stanzas` ページとして表示され、`hello.html` と `runtime-check.html` へのリンクを持つ。[cli]
- `serve` の help page は stanza script を absolute URL の `type="module"` script として読み込み、`-togostanza/help-app.js` と development reloader を読み込む。[cli]
- `runtime-check.html` の help preview は metadata の parameter example を使って custom element を生成する。`data-url="./data.json"` の example は sandbox に実ファイルがないため、preview 内の fetch が JSON parse error になった。[cli]

### ランタイム挙動

- build entrypoint は stanza module、metadata、precompiled templates、`import.meta.url` を `defineStanzaElement` に渡す。[code]
- custom element 名は `metadata["@id"]` から `togostanza-${id}` として定義される。[code][docs]
- observed attributes は metadata の `stanza:parameter` key と `togostanza-menu_placement`。[code]
- custom element は open shadow root を作り、CSS variable defaults と `${url.replace(/\.js$/, ".css")}` の stylesheet を shadow root に追加する。[code]
- `Stanza` base class は shadow root 内に `main` と `togostanza--menu` を作る。[code]
- `this.params` は HTML attributes を metadata の parameter type に応じて `boolean`、`number`、`date`、`datetime`、`json` などへ変換する。[code][docs]
- `togostanza--container` は子 stanza、`togostanza--event-map`、`togostanza--data-source` を読んで stanza 間の attribute 連携を行う。[code][docs]
- `togostanza--event-map` は custom element class ではなく、container が読む設定要素として扱われる。[code]
- `togostanza--data-source` は fetch した blob を `URL.createObjectURL()` に変換して receiver attribute に渡す。[code]
- `metastanza` と `togomedium-web` では `togostanza--data-container`、`togostanza--container`、`togostanza--data-source`、`togostanza--event-map` の使用は観測されなかった。[consumer]
- `metastanza` と `togomedium-web` では `this.query` または `.query(` の使用は観測されなかった。[consumer]
- runtime 観測用 stanza では、`count="42"` が `number` の `42`、空の `flag` attribute が `boolean` の `true`、attribute がない `flag` が `boolean` の `false`、`data='{"value":7}'` が object として `this.params` に渡された。[cli]
- runtime 観測用 stanza では、method 未指定の `this.query()` が `POST` で `/sparql` へ request した。[cli]
- runtime 観測用 stanza では、`togostanza--data-source` が receiver の `data-url` attribute に `blob:http://127.0.0.1:8100/...` を設定し、receiver 側で blob URL の JSON を読めた。[cli]
- runtime 観測用 stanza では、`togostanza--event-map` が container 内で同じ outgoing event を出す stanza すべての event を受け、`receiver` に一致する element の `target-attribute` を更新した。event-map 自体には送信元 selector はない。[cli]

### エラー、警告、ログ

- cwd に `package.json` がない場合は `package.json is missing. Make sure you are in the stanza repository directory.` を出す。[code]
- `package.json` に `dependencies.togostanza` がない場合は `togostanza is not specified as a dependency in package.json. Make sure you are in the stanza repository directory.` を出す。[code]
- local install がない場合は `togostanza is not installed locally. Try npm install or yarn install.` を出す。[code]
- `build` は成功時に exit code `0`、失敗時に exit code `1` を返す。[code]
- Codex managed exec の sandboxed 実行では `build` が watcher の `EMFILE: too many open files, watch` を捕捉できず、Node の unhandled error として終了するケースがあった。[cli]
- `serve` と `build` では、現行依存の Sass deprecation warning が複数出力された。[cli]
- `serve` の help app 実行時、Vue feature flag `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` が明示定義されていない旨の warning が browser console に出た。[cli]
- `runtime-check.html` の help preview では、存在しない `data-url="./data.json"` を読もうとして JSON parse error が browser console に出た。[cli]

### 直接依存と仕様影響

- Broccoli は build tree 合成、watch、serve の基盤として使われている。[code]
- Rollup は stanza entrypoint と page app の bundle に使われている。[code]
- Sass は `style.scss` の CSS compile に使われている。[code]
- Handlebars は stanza template と HTML/template generation に使われている。[code][docs]
- Yeoman は `init` と `generate stanza` の scaffold generator に使われている。[code]
- jscodeshift は `upgrade` の index.js 変換に使われている。[code][tests]
