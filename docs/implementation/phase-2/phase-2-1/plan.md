# Phase 2-1: build artifact spine 設計

Phase 2-1は、Phase 2-0で用意した `build` / `b` のpreflightを、最小の公開用生成物作成へ進めるサブフェーズである。

このサブフェーズでは、Stanzaリポジトリから `dist/` 相当の生成物を作る責任を持つ。Viteを内部ビルド基盤として導入し、Stanza entrypointを実際にbundleする。一方で、custom element登録、Shadow DOM、menu、`this.params`、`renderTemplate()` など、ビルド後のDOMとruntime APIの詳細はPhase 2-2以降へ送る。

## 目的

- `build` / `b` がvalid Stanzaリポジトリで成功する状態にする。
- `--output-path <dir>` と未指定時 `dist` の出力を実装する。
- Stanza検出、最小metadata validation、entrypoint解決を実装する。
- Viteで複数Stanza entrypointを1回のbuildにまとめ、`dist/{id}.js` と共有チャンクを生成する。
- `togostanza/stanza` をbundle時に解決できる最小runtime stubを用意する。
- `style.scss` を `sass` で `dist/{id}.css` へcompileする。
- `{id}.js.map` と `{id}.css.map` を生成する。ただしsource map内容の互換は固定しない。
- `metadata.json`、root asset、stanza別asset、最小 `{id}.html` を出力する。
- GitHub Pagesのサブパス配信で壊れない相対URL生成を、生成物の形として確認する。

## 完了条件

- `build` と `b` が同じ生成処理を実行する。
- `build` は未指定時に `dist/` へ出力する。
- `build --output-path <dir>` は指定ディレクトリへ出力する。
- 出力先はbuild開始時にcleanされ、stale fileが残らない。
- 危険な出力先は拒否される。
- `stanzas/{id}/metadata.json` からStanzaを検出できる。
- no stanza時は分かりやすく失敗する。
- malformed metadata、不足した `@id`、ディレクトリ名と不一致の `@id`、不正な `@id` は失敗する。
- entrypointは `index.tsx`、`index.ts`、`index.js` の順で解決される。
- entrypointがない場合は失敗する。
- Phase 1生成の `index.js` が `import Stanza from "togostanza/stanza"` を含んでいても、Vite buildが成功する。
- `dist/{id}.js`、`dist/{id}.js.map`、`dist/{id}.css`、`dist/{id}.css.map`、`dist/{id}.html`、`dist/{id}/metadata.json` が生成される。
- 共有チャンクがある場合、`dist/` 内の相対importで解決できる。
- root assetは `dist/assets/` へコピーされる。
- stanza別assetは `dist/{id}/assets/` へコピーされる。
- `.keep` は公開生成物へコピーしない。
- `index.html` と `-togostanza/` はPhase 2-1では生成しない。
- unit test / integration testで、生成物配置、診断、出力先clean、source map存在を確認できる。

## 含めるもの

- `build` / `b` の成功経路。
- `--output-path <dir>`。
- 出力先cleanと安全ガード。
- Stanza検出。
- 最小metadata validation。
- entrypoint優先順。
- Viteの内部導入。
- Viteによる複数entrypointの1回build。
- Vite sourcemap。
- `togostanza/stanza` build用runtime stub。
- `sass` の内部導入。
- stanza別 `style.scss` のcompile。
- CSS source map。
- `style.scss` がない場合の空CSS生成。
- root assetとstanza別assetのファイルコピー。
- 最小 `{id}.html` 生成。
- 002ケースのリメイク版観測条件更新。

## 含めないもの

- custom element登録。
- Shadow DOM生成。
- Shadow DOM内 `main`。
- `stanza:style` からCSS custom propertyの既定値への反映。
- menu placement、About導線、`${id}.html` へのruntime側リンク。
- `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()` の本格実装。
- `togostanza/stanza` runtimeの完成。
- `togostanza` dependencyの実利用可能性確認。
- Stanza entrypointからのasset importの完全対応。
- CSS内 `url(...)` の高度なasset解決。
- Sass `@/` alias。
- `togostanza.config.ts` の読み込み。
- 依存パッケージ内asset import。
- `index.html` と `-togostanza/` の生成。
- ヘルププレビューUI。
- GitHub Pages workflow placeholderの実deploy workflow化。

## 生成物

Phase 2-1では、少なくとも次の生成物を出す。

```text
dist/
  {id}.js
  {id}.js.map
  {id}.css
  {id}.css.map
  {id}.html
  {id}/
    metadata.json
    assets/
      *
  assets/
    *
  _chunks/
    *.js
    *.js.map
```

`_chunks/` は共有チャンクがある場合だけ生成される。チャンク名、hash、source map内部のpathは互換対象にしない。ただし、`{id}.js` から共有チャンクへの参照は相対importで解決できる形にする。

`index.html`、`-togostanza/help-app.js`、`-togostanza/index-app.js` などのヘルププレビュー関連生成物はPhase 2-1では作らない。現行版との差分として002ケースへ記録する。

## Vite build方針

ViteはTogoStanza CLI内部のビルド基盤として導入する。Stanzaリポジトリ側にVite設定ファイルを要求しない。

Phase 2-1では、検出したStanza entrypointを `rollupOptions.input` にまとめ、複数entrypointを1回のVite buildで処理する。`entryFileNames` は `{id}.js` に寄せる。共有チャンクは `_chunks/` に出す。

`togostanza/stanza` は、Phase 2-1ではbuildを通すための最小runtime stubへaliasする。このstubは、Phase 1生成の `index.js` がbundleできることを目的にする。custom element登録、Shadow DOM、`renderTemplate()` の本格挙動はPhase 2-2以降で実装する。

Vite buildでは `{id}.js.map` と共有チャンクのsource mapを生成する。source mapは存在と相対参照を確認するが、内部構造やbyte-level互換は固定しない。

## CSS build方針

Stanza entrypointとstylesheetは別成果物として扱う。ViteにはJS bundleを任せ、`stanzas/{id}/style.scss` は `sass` で独立して `dist/{id}.css` へcompileする。

`style.scss` が存在しない場合は、空の `dist/{id}.css` と軽い `dist/{id}.css.map` を生成する。

Sass compile errorはbuild失敗として扱い、stanza IDと `style.scss` pathが分かる診断を出す。

`common.scss`、Sass `@/` alias、CSS内 `url(...)` の高度な解決はPhase 2-4で扱う。

## metadata validation

Phase 2-1では、生成物作成に必要な最小validationだけを行う。

必須:

- `metadata.json` がvalid JSONであること。
- `metadata.json` がJSON objectであること。
- `@id` がstringであること。
- `@id` がstanzaディレクトリ名と一致すること。
- `@id` がcustom element名に使えるkebab-case相当であること。

任意:

- `stanza:label` は、あればstringとして扱う。なければ `@id` から表示名を作る。
- `stanza:definition` は、あればstringとして扱う。

Phase 2-1では、`stanza:parameter`、`stanza:style`、`stanza:incomingEvent`、`stanza:outgoingEvent`、`stanza:include`、`@context` の厳密validationは扱わない。

## entrypoint解決

entrypoint候補は次の優先順で解決する。

1. `index.tsx`
2. `index.ts`
3. `index.js`

複数存在する場合は、最初に見つかったものを採用する。どれもない場合は、stanza IDと探索pathが分かる診断で失敗する。

Phase 2-1では、`index.js` を主なintegration対象にする。`index.ts` と `index.tsx` は、検出優先順とVite buildに渡せることをunit testまたは小さいfixtureで確認する。ReactやVueの互換は扱わない。

## assetコピー

Phase 2-1では、ファイルコピーとして扱えるassetだけを対象にする。

- root `assets/` は `dist/assets/` へコピーする。
- `stanzas/{id}/assets/` は `dist/{id}/assets/` へコピーする。
- サブディレクトリ構造は維持する。
- `.keep` はコピーしない。
- assetコピー失敗時は、stanza IDまたはpathが分かる診断で失敗する。

Stanza entrypointからのasset import、CSS内 `url(...)`、hash名、inline、size threshold、依存パッケージ内asset importはPhase 2-4で扱う。

## `{id}.html`

Phase 2-1では、About導線の対象として使える最小HTMLを生成する。

- valid HTML documentにする。
- `<title>` は `stanza:label` または `@id` から作る。
- 本文に `stanza:label`、`stanza:definition` があれば表示する。
- `./{id}.css` への相対参照を含める。
- `./{id}.js` への `type="module"` 相対参照を含める。

custom element preview、snippet生成、menuからのAbout導線、ヘルププレビューUIはPhase 2-2以降へ送る。

## 出力先clean

`build` は出力開始前に出力先ディレクトリを削除して作り直す。

拒否する出力先:

- Stanzaリポジトリrootそのもの。
- `.` 相当。
- 空文字。
- Stanzaリポジトリrootより上のディレクトリ。
- Stanzaリポジトリroot外のディレクトリ。

Phase 2-1では、出力先はStanzaリポジトリroot配下に限定する。危険なpathやclean失敗は、pathが分かる診断で失敗する。

## サブパス安全性

生成物内の参照は、GitHub Pagesのサブパス配信で壊れない相対URLにする。

Phase 2-1で確認する参照:

- `{id}.js` から共有チャンクへの相対import。
- `{id}.js` からsource mapへの相対参照。
- `{id}.css` からCSS source mapへの相対参照。
- `{id}.html` から `{id}.js` と `{id}.css` への相対参照。
- `dist/{id}/metadata.json` とasset配置が、後続runtimeから相対参照できる形であること。

Phase 2-1では、runtimeからmetadataやassetを実fetchする挙動までは確認しない。

## 実装メモ

- `package` のdevDependenciesに `vite` と `sass` を追加する。
- `package/src/runtime/stanza.ts` などに、build用の最小runtime stubを置く。
- `package/src/cli/build.ts` の未実装診断を、生成処理へ置き換える。
- Stanza検出、metadata読み込み、entrypoint解決、assetコピーは、build handlerから分離する。
- `resolveStanzaRepoContext()` はPhase 2-0のまま使う。
- `build` はrepo contextのdependency specを宣言確認として扱う。`node_modules/` 内の実解決はPhase 2-1では必須にしない。
- ViteはCLI内部設定で起動し、Stanzaリポジトリ側の設定ファイルを要求しない。
- `togostanza/stanza` aliasはCLI内部のruntime stubへ向ける。
- Viteの出力を一時ディレクトリに出すか、最終出力先へ直接出すかは実装時に決めてよい。ただし最終生成物配置はこの文書に合わせる。

## 検証計画

### unit test

- no stanza時に失敗する。
- malformed metadataで失敗する。
- metadataがobjectでない場合に失敗する。
- `@id` がない場合に失敗する。
- `@id` とディレクトリ名が不一致の場合に失敗する。
- 不正な `@id` で失敗する。
- `stanza:label` がない場合に `@id` から表示名を作る。
- entrypoint優先順が `index.tsx`、`index.ts`、`index.js` であること。
- entrypointがない場合に失敗する。
- 出力先がroot、`.`、root外、rootより上の場合に失敗する。
- assetコピーで `.keep` を除外する。
- `{id}.html` が相対URLだけを使う。

### integration test

- `init .` と `generate stanza` 後に `build` が成功する。
- `b` aliasでも同じ生成物を作る。
- `--output-path public` が `public/` に生成する。
- build前に出力先がcleanされる。
- `dist/{id}.js`、`dist/{id}.js.map`、`dist/{id}.css`、`dist/{id}.css.map`、`dist/{id}.html`、`dist/{id}/metadata.json` が生成される。
- root assetが `dist/assets/` へコピーされる。
- stanza別assetが `dist/{id}/assets/` へコピーされる。
- `.keep` が公開生成物に含まれない。
- 複数stanzaを1回のbuildで処理できる。
- Phase 1生成の `index.js` に含まれる `import Stanza from "togostanza/stanza"` がbundleで解決される。
- 生成された `{id}.js` に、ブラウザで解決できないbare import `togostanza/stanza` が残らない。
- source map fileが存在し、生成物から相対参照される。
- `index.html` と `-togostanza/` が生成されないことを確認する。

### 002ケース更新

- リメイク版観測項目に、Vite bundle、runtime stub、source map、ヘルププレビュー関連生成物の非生成を追加する。
- 合格条件に、source map fileの存在と相対参照を追加する。ただしsource map内容は固定しない。
- 未決定事項に、source map内容、ヘルププレビュー生成物の最終構造、entrypoint asset importの詳細を残す。

### 完了前確認

- `git diff --check`
- `cd package && pnpm check-all`

browser testがsandbox環境で失敗する場合は、既存の運用方針に従い、標準コマンドを承認付き通常実行で確認する。

## 後続へ送る事項

| 項目 | 回収先 |
| ---- | ------ |
| custom element登録 | Phase 2-2 |
| Shadow DOM、Shadow DOM内 `main` | Phase 2-2 |
| CSSのShadow DOM適用 | Phase 2-2 |
| `stanza:style` からCSS custom propertyの既定値への反映 | Phase 2-2 |
| menu placement、About導線、`togostanza-menu-placement` | Phase 2-2 |
| `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()` | Phase 2-3 |
| Sass `@/` alias | Phase 2-4 |
| `togostanza.config.ts` | Phase 2-4 |
| Stanza entrypointからのasset import | Phase 2-4 |
| CSS内 `url(...)` の高度なasset解決 | Phase 2-4 |
| 依存パッケージ内asset import | Phase 2-4 |
| ヘルププレビューUI、`index.html`、`-togostanza/` | Phase 2-2以降またはPhase 3 |
| GitHub Pages workflowの実deploy化 | Phase 2-6 |
