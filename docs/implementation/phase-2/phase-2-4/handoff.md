# Phase 2-4: config / resolution / assets 引き継ぎ

この文書では、Phase 2-4完了後にPhase 2-5以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-4の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- 旧 `togostanza-build.mjs` / `togostanza-build.js` を検出するようにした。
- 旧設定ファイルはimport、eval、spawnせず、存在時は `togostanza.config.ts` への移行warningを出してbuildを続行するようにした。
- `togostanza.config.ts` をViteの `loadConfigFromFile()` 経由で読み込むようにした。
- `defineTogoStanzaConfig()` を追加した。
- `togostanza.config.ts` から `import { defineTogoStanzaConfig } from "togostanza/config"` を使えるように、`package.json` に `./config` subpath exportを追加した。
- `togostanza.config.ts` の `vite.define` と `vite.resolve.alias` をbuildに反映するようにした。
- config読み込み失敗時に、対象pathと原因を含む診断でbuildを失敗させるようにした。
- Stanza entrypointからのstanza外共有ソースimportを、import graph基準でbundleできることを確認した。
- `tsconfig.json` が存在しても、現行版の `TS18003` 失敗条件を再現しないことを確認した。
- `tsconfig.json` の `compilerOptions.paths` だけに依存するimportはPhase 2-4では直接解決しないことを明確にした。
- `compilerOptions.paths` 由来と考えられる未解決importでは、`togostanza.config.ts` の `vite.resolve.alias` へ移す診断を出すようにした。
- Sass `@use "@/common.scss"` は、Sass限定のリポジトリルートaliasとして引き続き解決するようにした。
- Stanza stylesheet内の `url("./assets/...")` と `url("assets/...")` を、生成CSS内で `url("./{id}/assets/...")` 相当に書き換えるようにした。
- CSS URL書き換えはdata URL、外部URL、絶対URLを対象外にした。
- Stanza entrypointからの `./assets/...` asset importをViteのasset処理に乗せるようにした。
- Stanza entrypointからの依存パッケージ内asset importをViteのasset処理に乗せるようにした。
- Viteがemitする非inline assetの出力先を `dist/_assets/` に分離した。
- Viteの `base` を `./` とし、asset importから生成されるURLが `/_assets/...` のようなドメインroot基準にならないようにした。
- root `assets/` は `dist/assets/` へ、stanza別 `assets/` は `dist/{id}/assets/` へコピーする既存契約を維持した。
- CSS URL由来asset、JS asset import由来画像、package asset import由来画像が、document baseと生成物baseがずれたstatic fixtureで実際に読み込まれることをbrowser testで確認した。
- test用HTTP serverのkeep-alive接続が残ってbrowser test suiteを詰まらせないよう、終了時に `closeAllConnections()` を呼ぶようにした。
- 007ケースREADMEに、Phase 2-4で確認したリメイク版の設定、解決、asset観測結果を記録した。

## 意図的に残したこと

- 旧 `togostanza-build.mjs` / `togostanza-build.js` の実行互換。
- 旧Rollup plugin APIのdrop-in互換。
- `togostanza.config.ts` の広範なschema validation。
- Vite plugin API全体の安定契約化。
- alias合成順の広範な固定。
- `tsconfig.json` の `compilerOptions.paths` 自動解決。
- JS/TSの `@/` import alias。
- assetのinline / emit / hash / thresholdの固定。
- CSS source mapの書き換え後column精度。
- `@use "@/common.scss"` 由来のCSS内 `url("./assets/...")` を、呼び出し元stylesheet基準で厳密に扱うこと。
- root assetをStanzaソースから参照する推奨APIまたはhelper。
- `togostanza-utils` API互換。
- `serve` のwatch、差分invalidate、設定変更反映。
- React、Vue、TSX固有のruntime互換。
- GitHub Pages workflowの置き換え。
- `index.html` と `-togostanza/` のヘルププレビュー生成。

## Phase 2-5で使う前提

- `build` は、Phase 2-4時点の設定、共有ソース、asset解決を通した生成物を作れる。
- `{id}.js` は、asset import由来の非inline assetを `./_assets/...` 相当のサブパス安全なURLとして参照する。
- `{id}.css` は、stanza stylesheet由来の `./assets/...` を `./{id}/assets/...` として参照する。
- `assetBaseUrl` は引き続き `new URL("./{id}/assets/", import.meta.url)` を基準にruntimeへ渡される。
- `importWebFontCSS("./assets/...")` は、Phase 2-3の前提どおり `./{id}/assets/...` へ解決される。
- runtime初期化は `{id}/metadata.json` fetchに依存しない。
- `togostanza.config.ts` は読み込めるが、Phase 2-4時点の最小schemaは `vite` configを渡す入口である。
- `togostanza/config` subpathは使えるが、npm公開向けの `exports` / `files` 全体整理はPhase 5送りである。
- `tsconfig.json` はVite / esbuildの入力として尊重するが、`compilerOptions.paths` は自動合成しない。
- `compilerOptions.paths` が必要なプロジェクトは、`togostanza.config.ts` の `vite.resolve.alias` へ移す。

## Phase 2-5で注意すること

- Phase 2-5のStanza間連携では、生成物を一般Webサイトへ置いたときのサブパス安全性を壊さないようにする。
- `togostanza--container` やevent関連のruntimeがasset URLを扱う場合は、document baseではなくmodule URLまたはruntimeに渡されたbase URLを使う。
- 共有ソースimportはimport graph基準でbundleされる。特定ディレクトリ名を特別扱いする前提にしない。
- `tsconfig paths` は未解決時に診断するだけで、自動解決はしない。Phase 2-5で新しいaliasを必要にする場合は `togostanza.config.ts` の `vite.resolve.alias` を使う。
- CSS URL書き換えは文字列ベースである。Phase 2-5でCSS pipelineを広げる場合は、source mapやSass module由来URLの扱いを別途判断する。
- Vite emit assetは `_assets/`、root assetは `assets/`、stanza assetは `{id}/assets/` で役割が分かれている。この配置を前提にテストやfixtureを書く。
- `test:browser` のHTTP serverは `closeAllConnections()` で後始末している。新しいbrowser testで別serverを作る場合も、keep-alive接続が残らないようにする。
- `test:browser` を単独実行する場合、bin entryが `dist/` を参照するため、直前のruntime変更を反映するには先に `cd package && mise exec -- pnpm run build` を実行する。通常の完了前確認は `check-all` を使えばbuildが先に走る。

## 後続判断として残すこと

- `serve` での設定変更、共有ソース変更、asset変更のwatchとinvalidate。
- GitHub Pages workflowの実deploy化。
- React / TSX互換の詳細。
- Vue SFC互換の詳細。
- `togostanza-utils` packageのAPI互換。
- 旧Rollup plugin APIの移行ガイド詳細。
- alias合成順の広範な固定。
- `tsconfig paths` を自動解決するかどうか。
- assetのinline / emit / hash / threshold。
- CSS source mapの書き換え後精度。
- root assetをStanzaソースから参照する推奨APIまたはhelper。
- `index.html` と `-togostanza/` のヘルププレビュー生成。
- npm公開向けの `exports`、`files`、`private` 解除、publish metadata整理。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは61件、integration testは17件、browser testは5件が通った。

## 関連commit

- `1993cd2 docs: add phase 2-4 resolution plan`
- `d67d54f docs: refine phase 2-4 asset plan`
- `ea779e6 docs: clarify phase 2-4 config import`
- `747a80e feat: add phase 2-4 config diagnostics`
- `ce455e5 fix: export config helper subpath`
- `5a86ad5 feat: support shared source resolution`
- `240d8e8 fix: apply loaded Vite config`
- `576f026 feat: support phase 2-4 asset resolution`
- `db1af0a fix: make emitted asset urls subpath safe`
- `661ba29 docs: record phase 2-4 verification`
- `a765261 test: cover phase 2-4 asset loading in browser`
- `82e9d9a fix: clarify tsconfig paths migration`
