# 既存仕様メモ

この文書では、観測された現行版の挙動を記録する。リメイク版実装の仕様ではない。

この文書が長くなった場合は、このディレクトリ配下に焦点を絞った文書を分割し、このファイルをインデックスとして維持する。

## 根拠タグ

観測結果を記録するときは、次のタグを使う。

- `docs`: 旧ドキュメントで観測した。
- `tests`: 旧テストまたはスナップショットで観測した。
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

- `togostanza` のエントリポイントは `bin/togostanza.mjs`。[code][cli]
- コマンドは `serve|s`、`build|b`、`generate|g`、`init`、`upgrade`。[code][cli]
- `--version` は `package.json` の `version` を表示する。調査時点では `3.0.0-beta.57`。[code][cli]
- `build`、`serve`、`generate stanza` は stanza repository内で実行される前提で、`cwd` の `package.json` とローカルインストール済み `togostanza` を確認する。[code]
- `init` はリポジトリ雛形生成のためのコマンドで、既存stanzaリポジトリ内での実行前提とは異なる。[code][tests]
- `upgrade` は旧構成から現行構成への移行コマンドとして、メタデータの移動と `index.js` 変換を行う。[code][tests]

### オプション

- `serve|s` は `-p, --port <port>` を持ち、既定値は `8080`。[code][cli]
- `build|b` は `-o, --output-path <dir>` を持ち、既定値は `./dist`。[code][cli]
- `generate stanza [id]` は `--label`、`--definition`、`--license`、`--author`、`--timestamp` を持つ。[code][cli]
- `init` は `--git-url`、`--name`、`--license`、`--package-manager <npm|yarn>`、`--skip-install`、`--skip-git` を持つ。[code][cli][tests]
- docsのReferenceでは、serveオプションが `-p, -port <port>` と書かれているが、CLIヘルプと実装では `-p, --port <port>`。[docs][code][cli]

### 設定と入力ファイル

- stanza検出は `stanzas/*/metadata.json` による。[code]
- stanza buildの入力は `metadata.json`、`README.md`、`index.tsx|index.ts|index.js`、`templates/*`、`style.scss`、`assets/`。[code]
- リポジトリルートの `assets/` はビルド入力になり、`dist/assets/` へコピーされる。[code][tests]
- `tsconfig.json` が存在する場合は TypeScriptコンパイル設定として使われる。[code]
- `togostanza-build.mjs` が存在する場合は custom Rollup pluginsを追加する。[code][docs]
- watcherは `.`, `README.md`, `package.json`, `stanzas/**`, `lib/**`, `assets/**` を監視対象にする。[code]
- `metastanza` と `togomedium-web/@packages/stanza` では `style.scss` が観測され、`stanza.scss` は観測されなかった。[consumer]
- `metastanza` と `togomedium-web/@packages/stanza` では、確認できた `metadata.json` の `@id` は stanzaディレクトリ名と一致していた。[consumer]

### 生成物

- `build` は既定で `./dist` に出力する。[code][cli]
- stanzaごとに `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}/metadata.json`、`${id}/assets/*` が生成される。[code][tests]
- `style.scss` が存在しない場合も空の `${id}.css` が生成される。[code]
- ページ側では `index.html`、`${stanza.id}.html`、`-togostanza/index-app.js`、`-togostanza/help-app.js` と関連チャンクが生成される。[code][tests]
- ヘルプページは stanza scriptを `<script type="module" src="./{{metadata.[@id]}}.js" async>` で読み込む。[code]
- docsのGetting Startedは埋め込み例として `type="module"` scriptと `<togostanza-hello say-to="world">` を示している。[docs]
- `sandbox/current-cli-smoke` は `npx togostanza init` と `npx togostanza generate stanza hello` で生成した。ユーザーの通常ターミナルで `build --output-path dist` が成功し、`index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/`、`assets/`、`-togostanza/` が生成された。[cli]
- `sandbox/current-cli-smoke` でランタイム観測用に `runtime-check` stanzaを生成して buildすると、`runtime-check.html`、`runtime-check.js`、`runtime-check.js.map`、`runtime-check.css`、`runtime-check/metadata.json` が生成された。[cli]
- `sandbox/current-cli-smoke/dist/hello.html` は `<script type="module" src="./hello.js" async>` と `-togostanza/help-app.js` の importを含む。[cli]
- `sandbox/current-cli-smoke/dist/index.html` は `-togostanza/index-app.js` の importを含む。[cli]
- `sandbox/current-cli-smoke/dist/runtime-check.html` は `<script type="module" src="./runtime-check.js" async>` と `-togostanza/help-app.js` の importを含む。[cli]

### 開発サーバ

- `serve` は開発環境でプレビューサーバーを起動する。[code]
- 起動ログは `Serving at http://localhost:${port}`。[code]
- SIGINT/SIGTERMで watcherを停止する handlerが登録される。[code]
- Codexのsandboxed execでは、切り分け中に `build` が `Error: EMFILE: too many open files, watch` で終了するケースがあった。[cli]
- ユーザーの通常ターミナルとCodexのunsandboxed実行では、`sandbox/current-cli-smoke` の `build --output-path dist` が成功した。[cli]
- AIが現行版の `build` / `serve` を確認する場合は、sandboxed execではなく許可済みのunsandboxed実行を使う必要がある。[cli]
- `sandbox/current-cli-smoke` で `serve --port 8099` を起動すると、`http://127.0.0.1:8099/` は `List of Stanzas` ページとして表示され、`hello.html` と `runtime-check.html` へのリンクを持つ。[cli]
- `serve` のヘルプページは stanza scriptを absolute URLの `type="module"` scriptとして読み込み、`-togostanza/help-app.js` と development reloaderを読み込む。[cli]
- `runtime-check.html` のヘルププレビューはメタデータのパラメーター例を使ってcustom elementを生成する。`data-url="./data.json"` の例はsandboxに実ファイルがないため、プレビュー内のfetchがJSON parseエラーになった。[cli]

### ランタイム挙動

- build entrypointは stanza module、metadata、precompiled templates、`import.meta.url` を `defineStanzaElement` に渡す。[code]
- custom element名は `metadata["@id"]` から `togostanza-${id}` として定義される。[code][docs]
- observed attributesはメタデータの `stanza:parameter` keyと `togostanza-menu_placement`。[code]
- custom elementは open shadow rootを作り、CSS variable defaultsと `${url.replace(/\.js$/, ".css")}` の stylesheetを shadow rootに追加する。[code]
- `Stanza` base classは shadow root内に `main` と `togostanza--menu` を作る。[code]
- `this.params` はHTML属性をメタデータのパラメーター型に応じて `boolean`、`number`、`date`、`datetime`、`json` などへ変換する。[code][docs]
- `togostanza--container` は子stanza、`togostanza--event-map`、`togostanza--data-source` を読んでstanza間の属性連携を行う。[code][docs]
- `togostanza--event-map` は custom element classではなく、containerが読む設定要素として扱われる。[code]
- `togostanza--data-source` はfetchしたblobを `URL.createObjectURL()` に変換して受信側属性に渡す。[code]
- `metastanza` と `togomedium-web` では `togostanza--data-container`、`togostanza--container`、`togostanza--data-source`、`togostanza--event-map` の使用は観測されなかった。[consumer]
- `metastanza` と `togomedium-web` では `this.query` または `.query(` の使用は観測されなかった。[consumer]
- ランタイム観測用 stanzaでは、`count="42"` が `number` の `42`、空の `flag` attributeが `boolean` の `true`、attributeがない `flag` が `boolean` の `false`、`data='{"value":7}'` が objectとして `this.params` に渡された。[cli]
- ランタイム観測用 stanzaでは、method未指定の `this.query()` が `POST` で `/sparql` へ requestした。[cli]
- ランタイム観測用 stanzaでは、`togostanza--data-source` が receiverの `data-url` attributeに `blob:http://127.0.0.1:8100/...` を設定し、receiver側で blob URLの JSONを読めた。[cli]
- ランタイム観測用stanzaでは、`togostanza--event-map` がcontainer内で同じ送出イベントを出すstanzaすべてのイベントを受け、`receiver` に一致するelementの `target-attribute` を更新した。event-map自体には送信元selectorはない。[cli]

### エラー、警告、ログ

- `cwd` に `package.json` がない場合は `package.json is missing. Make sure you are in the stanza repository directory.` を出す。[code]
- `package.json` に `dependencies.togostanza` がない場合は `togostanza is not specified as a dependency in package.json. Make sure you are in the stanza repository directory.` を出す。[code]
- local installがない場合は `togostanza is not installed locally. Try npm install or yarn install.` を出す。[code]
- `build` は成功時に exit code `0`、失敗時に exit code `1` を返す。[code]
- Codex managed execのsandboxed実行では `build` が watcherの `EMFILE: too many open files, watch` を捕捉できず、Nodeのunhandled errorとして終了するケースがあった。[cli]
- `serve` と `build` では、現行依存の Sass deprecation warningが複数出力された。[cli]
- `serve` のhelp app実行時、Vue feature flag `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` が明示定義されていない旨の警告がブラウザコンソールに出た。[cli]
- `runtime-check.html` のヘルププレビューでは、存在しない `data-url="./data.json"` を読もうとしてJSON parseエラーがブラウザコンソールに出た。[cli]

### 直接依存と仕様影響

- Broccoliは build tree合成、watch、serveの基盤として使われている。[code]
- Rollupは stanza entrypointとページアプリのbundleに使われている。[code]
- Sassは `style.scss` の CSS compileに使われている。[code]
- Handlebarsは stanza templateと HTML/template generationに使われている。[code][docs]
- Yeomanは `init` と `generate stanza` の雛形生成に使われている。[code]
- jscodeshiftは `upgrade` の index.js変換に使われている。[code][tests]
