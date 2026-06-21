# リポジトリメモ: togostanza

現行版リポジトリ。

## リポジトリの役割

- 参照元: `references/togostanza`
- 役割: 現行版の実装、ドキュメント、テスト、CLI挙動の参照元。

## 共通メモ

- リポジトリ状態: `references/togostanza` は commit `2e5982d` を参照中。ローカル調査用の `mise.toml` が未追跡ファイルとして存在する。
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

- `README.md` は `togostanza` を、JavaScript backend 版 Stanza の scaffold generator、builder、development server を含むコマンドとして説明している。
- `doc/Getting-Started.md` は Node.js 14.x、`npx togostanza init`、`npx togostanza serve`、`type="module"` script と `<togostanza-...>` custom element による埋め込みを説明している。
- `doc/Reference.md` は repository structure、metadata、parameter、`Stanza` class、template、style、assets、menu、utility methods を説明している。
- `doc/Inter-stanza-Communication.md` は `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` による stanza 間連携を説明している。
- `doc/Tips.md` は self hosting、custom Rollup plugins、forced update、TypeScript/React/Vue/Svelte の例を説明している。

### テストとsnapshot

- `tests/cli.test.js` と snapshot は、`generate stanza`、`build`、`init`、`upgrade` の代表的な出力を確認している。
- build snapshot では `dist` 配下に `index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/bar`、`assets/foo`、`-togostanza/` が生成されることを確認している。
- `generate stanza helloWorld` の snapshot では、stanza id が `hello-world` に kebab-case 化される。

### CLIコマンド

- entrypoint は `bin/togostanza.mjs`。`package.json` の version を読み、`serve`、`build`、`generate`、`init`、`upgrade` を commander に登録する。
- `--help` で観測した command 一覧:
  - `serve|s [options]`
  - `build|b [options]`
  - `generate|g`
  - `init [options]`
  - `upgrade`
- `serve|s` は `-p, --port <port>` を持ち、既定値は `8080`。
- `build|b` は `-o, --output-path <dir>` を持ち、既定値は `./dist`。
- `generate|g` の子コマンドは `stanza [options] [id]`。`--label`、`--definition`、`--license`、`--author`、`--timestamp` を持つ。
- `init` は `--git-url`、`--name`、`--license`、`--package-manager <npm|yarn>`、`--skip-install`、`--skip-git` を持つ。
- `upgrade` は help 上では追加 option を持たない。

### `build` / `serve` 挙動

- `build` と `serve` はどちらも実行前に `ensureTogoStanzaIsLocallyInstalled` を呼び、cwd の `package.json` に `dependencies.togostanza` があることと、ローカル install 済みであることを確認する。
- `build` は production environment で `BuildStanzas` と `BuildPages` の tree を merge し、既定では `./dist` に出力する。
- `serve` は development environment で preview server を起動し、起動時に `Serving at http://localhost:${port}` を出力する。
- watcher の監視対象は `.`, `README.md`, `package.json`, `stanzas/**`, `lib/**`, `assets/**`。
- stanza 検出は `stanzas/*/metadata.json` による。stanza 入力として `metadata.json`、`README.md`、`index.tsx|index.ts|index.js`、`templates/*`、`style.scss`、`assets/` が使われる。
- root `assets/` は `dist/assets/` にコピーされる。
- stanza ごとの生成物は `${id}.js`、`${id}.js.map`、`${id}.css`、`${id}/metadata.json`、`${id}/assets/*`。`style.scss` がない場合も空の `${id}.css` が生成される。
- page 側は `index.html`、`${stanza.id}.html`、`-togostanza/index-app.js`、`-togostanza/help-app.js` と関連 chunk を生成する。

### generatorとtemplate

- `generate stanza` は Yeoman generator を呼ぶ。id は kebab-case 化され、既定 label は id から生成される。
- `generate stanza` の timestamp 既定値は `fecha.format(new Date(), 'isoDate')`。調査日の help では `2026-06-20` と表示された。
- `generate stanza` は `stanzas/{id}/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成する。
- `init` は repository generator を呼び、npm/yarn、git 初期化、install、GitHub Pages workflow などを template から構成する。

### upgrade挙動

- `upgrade` は stanza root 直下の `*/metadata.json` を `stanzas/{from}/metadata.json` に移動する。
- `upgrade` は `jscodeshift` transformer を `stanzas/*/index.js` に適用する。
- test snapshot では `Stanza(function(stanza, params) { ... })` 形式が `export default function hello(stanza, params) { ... }` 形式へ変換される。

### runtime / custom element

- build entrypoint は stanza module、metadata、precompiled templates、`import.meta.url` を `defineStanzaElement` に渡す。
- custom element 名は `metadata["@id"]` から `togostanza-${id}` として定義される。
- observed attributes は metadata の `stanza:parameter` key と `togostanza-menu_placement`。
- custom element は open shadow root を作り、CSS variable defaults と `${url.replace(/\.js$/, ".css")}` の stylesheet を shadow root に追加する。
- `Stanza` base class は `main` と `togostanza--menu` を shadow root 内に作り、`params`、`renderTemplate`、`root`、`element`、`query` などを提供する。
- `this.params` は attribute 文字列を parameter metadata に従って `boolean`、`number`、`date`、`datetime`、`json` などへ変換する。

### stanza間連携

- built-in custom element として定義されるのは `togostanza--menu`、`togostanza--container`、`togostanza--data-source`。
- `togostanza--event-map` は custom element class としては定義されず、`togostanza--container` が query して設定要素として読む。
- `togostanza--event-map` は `on`、`receiver`、`target-attribute`、`value-path` を読み、event detail から取得した値を receiver の attribute へ反映する。
- event-map で値が `true` の場合は空 attribute、`false` または `undefined` の場合は attribute 削除、string 以外は JSON.stringify で反映される。
- `togostanza--data-source` は `url`、`receiver`、`target-attribute` を使い、fetch した blob を `URL.createObjectURL()` に変換して receiver attribute に渡す。

### 直接依存

直接依存について、観測された役割と仕様への影響を記録する。

## CLI実行メモ

コマンド、作業ディレクトリ、結果、重要なstdout/stderr抜粋、追加確認事項を記録する。

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
  - 生成直後の GitHub 参照のまま install するのが通常経路。
  - `package-lock.json` では `togostanza` が `git+ssh://git@github.com/togostanza/togostanza.git#2e5982d25bdebc604574908c6ebc72d0334cb000` に解決された。
  - `mise exec -- npx togostanza --version` は `3.0.0-beta.57`。
  - `sass@1.101.0`、`chokidar@5.0.0` などから Node engine warning が出た。
- `mise exec -- npx togostanza generate stanza hello --label Hello --definition "Smoke test stanza" --license MIT --author Codex --timestamp 2026-06-20`
  - `stanzas/hello/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成した。
- `mise exec -- npx togostanza generate stanza runtime-check --label "Runtime Check" --definition "Runtime behavior check stanza" --license MIT --author Codex --timestamp 2026-06-20`
  - `stanzas/runtime-check/metadata.json`、`README.md`、`index.js`、`style.scss`、`assets/.keep`、`templates/stanza.html.hbs` を生成した。
  - 生成後、runtime 観測用に `text`、`count`、`flag`、`data`、`data-url` parameter と `query.rq.hbs` を追加した。
- `mise exec -- npx togostanza build --output-path dist`
  - Codex の sandboxed exec では、切り分け中に `Error: EMFILE: too many open files, watch` で終了するケースがあった。
  - ユーザーの通常ターミナルでは同じコマンドが成功した。
  - Codex でも、unsandboxed 実行では同じコマンドが成功した。
  - 今後 AI が現行版の `build` / `serve` を確認する場合は、sandboxed exec ではなく許可済みの unsandboxed 実行として扱う。
  - 成功後の `dist/` には `index.html`、`hello.html`、`hello.js`、`hello.js.map`、`hello.css`、`hello/metadata.json`、`hello/assets/`、`runtime-check.html`、`runtime-check.js`、`runtime-check.js.map`、`runtime-check.css`、`runtime-check/metadata.json`、`assets/`、`-togostanza/` が生成された。
  - `hello.html` は `<script type="module" src="./hello.js" async>` と `-togostanza/help-app.js` の import を含む。
  - `index.html` は `-togostanza/index-app.js` の import を含む。
- `mise exec -- npx togostanza serve --port 8099`
  - 作業ディレクトリ: `sandbox/current-cli-smoke`
  - URL: `http://127.0.0.1:8099/`
  - 停止方法: 起動中の command session へ `Ctrl-C` を送る。
  - 起動ログとして `Serving at http://localhost:8099` を出力した。
  - Sass deprecation warning を多数出力した後、build 完了ログを出した。
  - in-app browser で `/` を開くと `List of Stanzas` ページが表示され、`hello.html` と `runtime-check.html` へのリンクが観測された。
  - `runtime-check.html` は `<script type="module" src="http://127.0.0.1:8099/runtime-check.js" async>` と `-togostanza/help-app.js` の import を含む help page として表示された。
  - help page の preview は metadata の parameter example から `<togostanza-runtime-check>` を生成し、`text`、`count`、`flag`、`data`、`data-url` attribute を設定した。
  - `data-url="./data.json"` は sandbox に存在しないため、preview 内の fetch が JSON parse error になり、serve 停止時に `data.json` の `ENOENT` が出た。
  - browser console には Vue feature flag `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` が明示定義されていない旨の warning が出た。
- runtime 観測用の静的サーバ:
  - 作業ディレクトリ: `sandbox/current-cli-smoke`
  - URL: `http://127.0.0.1:8100/runtime-observe.html`
  - 配信対象: `dist/` と `/sparql` の観測用 JSON response。
  - 停止方法: 起動中の command session へ `Ctrl-C` を送る。
  - `<script type="module" src="./runtime-check.js">` で stanza script を読み込み、custom element は open shadow root と `runtime-check.css` stylesheet link を持った。
  - `count="42"` は `42:number`、空 attribute の `flag` は `true:boolean`、attribute がない `flag` は `false:boolean`、`data='{"value":7}'` は `7:object` として描画された。
  - `this.query()` は method 未指定時に `POST` で `/sparql` へ送信され、query body が描画された。
  - `togostanza--data-source` は receiver の `data-url` attribute に `blob:http://127.0.0.1:8100/...` を設定し、receiver 側で `from-data-source` が描画された。
  - `togostanza--event-map` は container 内で同じ outgoing event を出す stanza すべての event を受け、`receiver` に一致する element の `target-attribute` を更新した。event-map 自体に送信元 selector はないため、複数 stanza が同じ event を出す場合は後続の event で上書きされる。
  - 静的サーバは確認後に `Ctrl-C` で停止した。

## このリポジトリの未解決事項

横断的な未解決事項は [未解決事項](../open-questions.md) へ移す。

- `metadata["@id"]` と stanza directory 名が異なる場合、出力ファイル名、help page、custom element 名が一貫するか未確認。
- `this.query` の既定 method は docs では `GET` と説明されているが、実装とブラウザ観測では `POST`。
- `doc/Inter-stanza-Communication.md` に `togostanza--data-container` という表記があるが、実装と例は `togostanza--container`。
- `doc/Getting-Started.md` の生成例に `stanza.scss` があるが、実装と snapshot は `style.scss` を使う。
- Codex managed exec の sandboxed 実行では `sandbox/current-cli-smoke` の `build` が `EMFILE` により終了したが、ユーザーの通常ターミナルと Codex の unsandboxed 実行では同じ系統のコマンドが成功した。
