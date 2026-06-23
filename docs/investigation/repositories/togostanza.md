# リポジトリメモ: togostanza

現行版リポジトリの調査メモ。

## リポジトリの役割

- 参照元: `references/togostanza`
- 役割: 現行版の実装、ドキュメント、テスト、CLI挙動を確認するための参照元。

## 共通メモ

- リポジトリ状態: `references/togostanza` はcommit `2e5982d` を参照中。ローカル調査用の `mise.toml` が未追跡ファイルとして存在する。
- 関連コマンド:
  - `mise exec -- node bin/togostanza.mjs --version`
  - `mise exec -- node bin/togostanza.mjs --help`
  - `mise exec -- node bin/togostanza.mjs serve --help`
  - `mise exec -- node bin/togostanza.mjs build --help`
  - `mise exec -- node bin/togostanza.mjs generate stanza --help`
  - `mise exec -- node bin/togostanza.mjs init --help`
- 重要なパス:
  - `bin/togostanza.mjs`
  - `src/commands/`
  - `src/build-stanzas.mjs`
  - `src/build-pages.mjs`
  - `src/stanza-element.mjs`
  - `stanza.ts`
  - `doc/`
  - `tests/cli.test.js`
  - `tests/__snapshots__/cli.test.js.snap`
- 環境メモ:
  - `mise exec -- node -v`: `v18.20.4`
  - `mise exec -- npm -v`: `10.7.0`
  - `mise exec -- node bin/togostanza.mjs --version`: `3.0.0-beta.57`

## 現行版固有メモ

### 公開ドキュメント

- `README.md` は `togostanza` を、JavaScriptバックエンド版Stanzaの雛形生成器、builder、開発サーバーを含むコマンドとして説明している。
- `doc/Getting-Started.md` はNode.js 14.x、`npx togostanza init`、`npx togostanza serve`、`type="module"` 属性のscriptと `<togostanza-...>` custom elementによる埋め込みを説明している。
- `doc/Reference.md` はリポジトリ構造、メタデータ、パラメーター、`Stanza` class、template、style、assets、menu、utility methodsを説明している。
- `doc/Inter-stanza-Communication.md` は `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` によるstanza間連携を説明している。
- `doc/Tips.md` はself hosting、custom Rollup plugins、forced update、TypeScript/React/Vue/Svelteの例を説明している。

### テストとsnapshot

- `tests/cli.test.js` とsnapshotは、`generate stanza`、`build`、`init`、`upgrade` の代表的な出力を確認している。
- build snapshotでは、`dist` 配下に `index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/bar`、`assets/foo`、`-togostanza/` が生成されることを確認している。
- `generate stanza helloWorld` のsnapshotでは、stanza IDが `hello-world` にkebab-case化される。

### CLIコマンド

- entrypointは `bin/togostanza.mjs`。`package.json` のversionを読み、`serve`、`build`、`generate`、`init`、`upgrade` をcommanderに登録する。
- `--help` で観測したコマンド一覧:
  - `serve|s [options]`
  - `build|b [options]`
  - `generate|g`
  - `init [options]`
  - `upgrade`
- `serve|s` は `-p, --port <port>` を持ち、既定値は `8080`。
- `build|b` は `-o, --output-path <dir>` を持ち、既定値は `./dist`。
- `generate|g` の子コマンドは `stanza [options] [id]`。`--label`、`--definition`、`--license`、`--author`、`--timestamp` を持つ。
- `init` は `--git-url`、`--name`、`--license`、`--package-manager <npm|yarn>`、`--skip-install`、`--skip-git` を持つ。
- `upgrade` はhelp上では追加オプションを持たない。

### `build` / `serve` 挙動

- `build` と `serve` はどちらも実行前に `ensureTogoStanzaIsLocallyInstalled` を呼び、cwdの `package.json` に `dependencies.togostanza` があることと、ローカルインストール済みであることを確認する。
- `build` はproduction environmentで `BuildStanzas` と `BuildPages` のtreeをmergeし、既定では `./dist` に出力する。
- `serve` は開発環境でプレビューサーバーを起動し、起動時に `Serving at http://localhost:${port}` を出力する。
- watcherの監視対象は `.`, `README.md`, `package.json`, `stanzas/**`, `lib/**`, `assets/**`。
- stanza検出は `stanzas/*/metadata.json` による。stanza入力として `metadata.json`、`README.md`、`index.tsx|index.ts|index.js`、`templates/*`、`style.scss`、`assets/` が使われる。
- root `assets/` は `dist/assets/` にコピーされる。
- stanzaごとの生成物は `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}/metadata.json`、`${id}/assets/*`。`style.scss` がない場合も空の `${id}.css` が生成される。
- ページ側は `index.html`、`${stanza.id}.html`、`-togostanza/index-app.js`、`-togostanza/help-app.js` と関連チャンクを生成する。

### generatorとtemplate

- `generate stanza` はYeoman generatorを呼ぶ。idはkebab-case化され、既定labelはidから生成される。
- `generate stanza` のtimestamp既定値は `fecha.format(new Date(), 'isoDate')`。調査日のhelpでは `2026-06-20` と表示された。
- `generate stanza` は `stanzas/{id}/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成する。
- `init` はリポジトリgeneratorを呼び、npm/yarn、git初期化、インストール、GitHub Pages workflowなどをtemplateから構成する。

### upgrade挙動

- `upgrade` はstanza root直下の `*/metadata.json` を `stanzas/{from}/metadata.json` に移動する。
- `upgrade` は `jscodeshift` transformerを `stanzas/*/index.js` に適用する。
- test snapshotでは `Stanza(function(stanza, params) { ... })` 形式が `export default function hello(stanza, params) { ... }` 形式へ変換される。

### ランタイム / custom element

- build entrypointはstanza module、メタデータ、precompiled templates、`import.meta.url` を `defineStanzaElement` に渡す。
- custom element名は `metadata["@id"]` から `togostanza-${id}` として定義される。
- observed attributesはメタデータの `stanza:parameter` keyと `togostanza-menu_placement`。
- custom elementはopen shadow rootを作り、CSS variable defaultsと `${url.replace(/\.js$/, ".css")}` のstylesheetをshadow rootに追加する。
- `Stanza` base classは `main` と `togostanza--menu` をshadow root内に作り、`params`、`renderTemplate`、`root`、`element`、`query` などを提供する。
- `this.params` はattribute文字列をparameter metadataに従って `boolean`、`number`、`date`、`datetime`、`json` などへ変換する。

### stanza間連携

- built-in custom elementとして定義されるのは `togostanza--menu`、`togostanza--container`、`togostanza--data-source`。
- `togostanza--event-map` はcustom element classとしては定義されず、`togostanza--container` がqueryして設定要素として読む。
- `togostanza--event-map` は `on`、`receiver`、`target-attribute`、`value-path` を読み、event detailから取得した値を受信側の属性へ反映する。
- event-mapで値が `true` の場合は空属性、`false` または `undefined` の場合は属性削除、string以外は `JSON.stringify` で反映される。
- `togostanza--data-source` は `url`、`receiver`、`target-attribute` を使い、fetchしたblobを `URL.createObjectURL()` に変換して受信側属性に渡す。

### 直接依存

観測された直接依存の役割と、仕様への影響を記録する。

## CLI実行メモ

コマンド、作業ディレクトリ、結果、重要な `stdout` / `stderr` 抜粋、追加確認事項を記録する。

- 作業ディレクトリ: `references/togostanza`
- 実行済み:
  - `mise exec -- node -v` -> `v18.20.4`
  - `mise exec -- npm -v` -> `10.7.0`
  - `mise exec -- node bin/togostanza.mjs --version` -> `3.0.0-beta.57`
  - `mise exec -- node bin/togostanza.mjs --help`
  - `mise exec -- node bin/togostanza.mjs serve --help`
  - `mise exec -- node bin/togostanza.mjs build --help`
  - `mise exec -- node bin/togostanza.mjs generate --help`
  - `mise exec -- node bin/togostanza.mjs generate stanza --help`
  - `mise exec -- node bin/togostanza.mjs init --help`
  - `mise exec -- node bin/togostanza.mjs upgrade --help`
- 作業ディレクトリ: `sandbox/current-cli-smoke`
- `mise exec -- npx togostanza init --git-url "" --name current-cli-smoke --license MIT --package-manager npm --skip-install --skip-git`
  - `sandbox/` 直下で実行し、`sandbox/current-cli-smoke` を生成した。
  - 生成物は `package.json`、`README.md`、`.gitignore`、`common.scss`、`assets/.keep`、`lib/.keep`、`.github/workflows/publish.yml`。
  - 生成直後の `package.json` は `dependencies.togostanza: "github:togostanza/togostanza"`。
- `mise exec -- npm install`
  - 生成直後のGitHub参照のままinstallするのが通常経路。
  - `package-lock.json` では `togostanza` が `git+ssh://git@github.com/togostanza/togostanza.git#2e5982d25bdebc604574908c6ebc72d0334cb000` に解決された。
  - `mise exec -- npx togostanza --version` は `3.0.0-beta.57`。
  - `sass@1.101.0`、`chokidar@5.0.0` などからNode engine warningが出た。
- `mise exec -- npx togostanza generate stanza hello --label Hello --definition "Smoke test stanza" --license MIT --author Codex --timestamp 2026-06-20`
  - `stanzas/hello/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成した。
- `mise exec -- npx togostanza generate stanza runtime-check --label "Runtime Check" --definition "Runtime behavior check stanza" --license MIT --author Codex --timestamp 2026-06-20`
  - `stanzas/runtime-check/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成した。
  - 生成後、ランタイム観測用に `text`、`count`、`flag`、`data`、`data-url` パラメーターと `query.rq.hbs` を追加した。
- `mise exec -- npx togostanza build --output-path dist`
  - Codexのsandboxed execでは、切り分け中に `Error: EMFILE: too many open files, watch` で終了するケースがあった。
  - ユーザーの通常ターミナルでは同じコマンドが成功した。
  - Codexでも、unsandboxed実行では同じコマンドが成功した。
  - 今後AIが現行版の `build` / `serve` を確認する場合は、sandboxed execではなく許可済みのunsandboxed実行として扱う。
  - 成功後の `dist/` には `index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/`、`runtime-check.html`、`runtime-check.js`、`runtime-check.js.map`、`runtime-check.css`、`runtime-check/metadata.json`、`assets/`、`-togostanza/` が生成された。
  - `hello.html` は `<script type="module" src="./hello.js" async>` と `-togostanza/help-app.js` のimportを含む。
  - `index.html` は `-togostanza/index-app.js` のimportを含む。
- `mise exec -- npx togostanza serve --port 8099`
  - 作業ディレクトリ: `sandbox/current-cli-smoke`
  - URL: `http://127.0.0.1:8099/`
  - 停止方法: 起動中のcommand sessionへ `Ctrl-C` を送る。
  - 起動ログとして `Serving at http://localhost:8099` を出力した。
  - Sass deprecation warningを多数出力した後、build完了ログを出した。
  - in-appブラウザで `/` を開くと `List of Stanzas` ページが表示され、`hello.html` と `runtime-check.html` へのリンクが観測された。
  - `runtime-check.html` は `<script type="module" src="http://127.0.0.1:8099/runtime-check.js" async>` と `-togostanza/help-app.js` のimportを含むヘルプページとして表示された。
  - ヘルプページのプレビューはメタデータのパラメーター例から `<togostanza-runtime-check>` を生成し、`text`、`count`、`flag`、`data`、`data-url` 属性を設定した。
  - `data-url="./data.json"` はsandboxに存在しないため、プレビュー内のfetchがJSON parseエラーになり、serve停止時に `data.json` の `ENOENT` が出た。
  - ブラウザコンソールにはVue feature flag `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` が明示定義されていない旨の警告が出た。
- ランタイム観測用の静的サーバ:
  - 作業ディレクトリ: `sandbox/current-cli-smoke`
  - URL: `http://127.0.0.1:8100/runtime-observe.html`
  - 配信対象: `dist/` と `/sparql` の観測用JSON response。
  - 停止方法: 起動中のcommand sessionへ `Ctrl-C` を送る。
  - `<script type="module" src="./runtime-check.js">` でstanza scriptを読み込み、custom elementはopen shadow rootと `runtime-check.css` stylesheet linkを持った。
  - `count="42"` は `42:number`、空属性の `flag` は `true:boolean`、属性がない `flag` は `false:boolean`、`data='{"value":7}'` は `7:object` として描画された。
  - `this.query()` はmethod未指定時に `POST` で `/sparql` へ送信され、query bodyが描画された。
  - `togostanza--data-source` はreceiverの `data-url` attributeに `blob:http://127.0.0.1:8100/...` を設定し、receiver側で `from-data-source` が描画された。
  - `togostanza--event-map` はcontainer内で同じ送出イベントを出すstanzaすべてのイベントを受け、`receiver` に一致するelementの `target-attribute` を更新した。event-map自体に送信元selectorはないため、複数stanzaが同じイベントを出す場合は後続のイベントで上書きされる。
  - 静的サーバは確認後に `Ctrl-C` で停止した。

## このリポジトリの未解決事項

横断的な未解決事項は [未解決事項](../open-questions.md) へ移す。

- `metadata["@id"]` とstanzaディレクトリ名が異なる場合、出力ファイル名、ヘルプページ、custom element名が一貫するか未確認。
- `this.query` の既定methodはdocsでは `GET` と説明されているが、実装とブラウザ観測では `POST`。
- `doc/Inter-stanza-Communication.md` に `togostanza--data-container` という表記があるが、実装と例は `togostanza--container`。
- `doc/Getting-Started.md` の生成例に `stanza.scss` があるが、実装とsnapshotは `style.scss` を使う。
- Codex managed execのsandboxed実行では `sandbox/current-cli-smoke` の `build` が `EMFILE` により終了したが、ユーザーの通常ターミナルとCodexのunsandboxed実行では同じ系統のコマンドが成功した。
