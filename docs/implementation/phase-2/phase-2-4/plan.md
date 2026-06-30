# Phase 2-4: config / resolution / assets 設計

Phase 2-4は、Phase 2-3までに成立した `build` とランタイムAPIの上に、設定ファイル、import解決、asset解決を載せるサブフェーズである。

このサブフェーズでは、`togostanza.config.ts`、旧設定ファイル検出、`tsconfig.json`、Sassの高度なmodule解決、共有ソース、Stanzaソースからのasset import、依存パッケージ内asset importを扱う。`serve`、framework固有runtime、Stanza間連携は扱わない。

## 目的

- 007ケースで観測している設定、import解決、asset参照のリメイク版挙動を確認できるようにする。
- 旧 `togostanza-build.mjs` / `togostanza-build.js` を無条件に実行せず、移行先が分かる診断を出す。
- `togostanza.config.ts` を新しい設定入口として扱える最小の土台を作る。
- `tsconfig.json` とStanza entrypointのimport graphを尊重し、stanza外共有ソースをディレクトリ名ではなくimport依存として扱う。
- Sass `@/` aliasの既存契約を維持しつつ、Phase 2-1の最小実装では不足するasset参照を補う。
- Stanza entrypointからのasset import、CSS内 `url(...)`、依存パッケージ内asset importを、生成物としてサブパス安全に扱う。
- 007ケースREADMEに、Phase 2-4で確認したリメイク版の観測結果を記録する。

## 完了条件

- `togostanza build` / `togostanza b` が、007ケース相当のStanzaリポジトリをビルドできる。
- 旧 `togostanza-build.mjs` / `togostanza-build.js` を検出しても実行しない。
- 旧設定ファイルが存在する場合、`togostanza.config.ts` への移行が分かるwarningを出し、旧設定ファイルを実行せずにbuildを続行する。
- `togostanza.config.ts` を検出し、Phase 2-4で固定する最小schemaを読み込める。
- `defineTogoStanzaConfig()` を `import { defineTogoStanzaConfig } from "togostanza/config"` としてimportして使える。
- `tsconfig.json` がVite/TypeScript解決の入力として尊重される。
- Stanza entrypointからimportされるstanza外共有ソースがbundle対象になる。
- Sass `@use "@/common.scss"` がリポジトリルートを指すaliasとして引き続き解決される。
- `style.scss` 内の `url("./assets/...")` が、生成CSSから解決可能なURLになる。
- `style.scss` 内のstanza asset参照は、生成CSS内で `url("./{id}/assets/...")` 相当に解決される。
- Stanza entrypointからの `./assets/...` importが解決され、生成bundleから参照できる。
- Stanza entrypointからの依存パッケージ内asset importが解決され、生成bundleから参照できる。
- Viteがemitするassetは、root `assets/` のコピー先と混ざらない出力先へ分離する。
- リポジトリルートの `assets/` が `dist/assets/` に出力され、生成物から相対URLで参照できる契約を説明できる。
- asset import、CSS URL、共有チャンク、metadata、About HTMLへの参照が、GitHub Pagesのサブパス配信相当で壊れないことをbrowser testまたはintegration testで確認する。
- 007ケースREADMEに、実行したリメイク版コマンド、生成物、asset解決結果、旧設定診断、残した差分を記録する。

## 含めるもの

- 旧設定ファイル検出。
- 旧設定ファイルを実行しないことの確認。
- 旧設定から新設定への移行診断。
- `togostanza.config.ts` の最小読み込み。
- `defineTogoStanzaConfig()` の提供。
- Phase 2-4で使う設定schemaの最小型。
- Vite configへの最小反映。
- `tsconfig.json` の尊重範囲の確認。
- Stanza entrypointからの共有ソースimport。
- Stanza entrypointからのasset import。
- 依存パッケージ内asset import。
- Sass `@/` aliasの維持。
- SassとCSSのasset URL解決。
- root `assets/` のコピー契約確認。
- 007ケースのリメイク版観測更新。

## 含めないもの

- `serve` の実挙動、watch、差分invalidate。
- GitHub Pages workflowの置き換え。
- Stanza間連携。
- React、Vue、TSX固有のruntime互換。
- `togostanza-utils` API互換。
- 旧 `togostanza-build.mjs` / `togostanza-build.js` の実行互換。
- 旧Rollup plugin APIのdrop-in互換。
- assetのinline/emit/hash/thresholdの完全固定。
- Vite plugin API全体の安定契約化。
- alias合成順の広範な固定。
- ヘルププレビューUI、`index.html`、`-togostanza/` の生成。
- `serve` での共有ソース変更検知。

## 実装順

### 2-4a config diagnostics / config skeleton

2-4aでは、設定ファイルの扱いを先に固定する。

対象:

- 旧 `togostanza-build.mjs` / `togostanza-build.js` の存在検出。
- 旧設定ファイルをimport、eval、spawnしないことの確認。
- 旧設定ファイルがある場合のwarning。
- `togostanza.config.ts` の検出。
- `defineTogoStanzaConfig()` の提供。
- `togostanza.config.ts` から `togostanza/config` をimportできる検証fixture。
- Phase 2-4の最小config型。

2-4aでは、旧設定ファイルの実行互換は持ち込まない。これは安全性と実装基盤の変更を優先する判断である。旧設定ファイルが現行版で実際に有効だった可能性は診断と移行メモで扱う。

`togostanza.config.ts` は、TogoStanza専用設定を中心にする。Phase 2-4で必要な最小shapeは、Viteへ渡す追加configまたはpluginを限定的に受け取れる入口までとする。広範な設定schemaは、実プロジェクト調査と後続サブフェーズの必要に応じて広げる。

### 2-4b tsconfig / shared source resolution

2-4bでは、Stanza entrypointからのimport graphをビルド入力として扱えることを確認する。

対象:

- `index.js`、`index.ts`、`index.tsx` の優先順を維持する。
- `tsconfig.json` をVite/TypeScript解決の入力として尊重する。
- Stanza entrypointからの相対importが、stanza外共有ソースを含んでいてもbundleされる。
- 共有ソースは `lib/`、`components/` などのディレクトリ名ではなく、import graph基準で扱う。
- tsconfig pathsやVite aliasが未対応で失敗する場合、対応可否または移行手順が分かる診断へ寄せる。

Phase 2-4では、alias合成順を広く固定しない。007ケースのactive importで必要になる範囲を優先し、候補aliasは移行メモまたは後続判断として残す。

### 2-4c asset resolution

2-4cでは、Stanzaソースとstylesheetから参照されるassetを生成物として扱う。

対象:

- Stanza entrypointからの `./assets/...` import。
- Stanza entrypointからの依存パッケージ内asset import。
- `style.scss` 内の `url("./assets/...")`。
- root `assets/` から `dist/assets/` へのコピー契約。
- asset importからemitされたファイルやinline URLを、生成bundleから参照できること。
- CSS URLが、`{id}.css` の配置から解決できること。
- Vite emit assetとroot `assets/` コピー先を分けること。
- static fixtureで、document baseとscript/CSS baseがずれてもassetが解決できること。

assetのinline、emit、hash、thresholdは外部互換として固定しない。Phase 2-4で固定するのは、正しい既存入力が壊れず、生成物内の参照がサブパス安全に解決できることである。

CSS `url("./assets/...")` はPhase 2-4で明示的に解決する。Phase 2-1ではSassをViteではなくstandalone sassで処理し、`{id}.css` を `dist/` 直下へ出している。このままではブラウザが `url("./assets/x.svg")` を `dist/assets/x.svg` として解決する一方、stanza別assetは `dist/{id}/assets/x.svg` に置かれる。Phase 2-4では、`style.scss` 由来のstanza asset相対URLを生成CSS内で `url("./{id}/assets/...")` 相当に書き換える方針を採る。

この書き換えは、`url("./assets/...")` と `url("assets/...")` のようなstanza stylesheetからの相対asset参照に限定する。絶対URL、data URL、外部URL、root asset参照、package asset参照まで同じ規則で吸収しない。より広いCSS asset pipeline化やVite CSS移行は、必要になった時点の後続判断にする。

root `assets/` の参照記法は注意して扱う。`dist/assets/` への出力は維持するが、Stanzaソース内で `./assets/...` と書いた場合に埋め込みHTML基準へ解決される問題は、007ケースの観測どおり差分になり得る。Phase 2-4では、生成物から相対URLで参照できる契約を確認する一方、Stanzaソースからroot assetを直接参照する推奨APIやhelperは未解決の既知制約として記録する。

### 2-4d verification / case update

2-4dでは、実装結果を007ケースに記録する。

対象:

- リメイク版で実行したコマンド。
- `dist/` tree。
- 旧設定ファイル検出時の診断。
- `togostanza.config.ts` の読み込み結果。
- 共有ソースimportの解決結果。
- Sass `@/` aliasの解決結果。
- JS asset importの出力結果。
- package asset importの出力結果。
- CSS `url("./assets/...")` が `./{id}/assets/...` 相当へ解決された結果。
- root `assets/` の出力と参照結果。
- Stanzaソースからroot assetを `./assets/...` として参照するケースはPhase 2-4では未解決の既知制約であること。
- サブパス配信相当のbrowser観測。
- 現行版との差分と後続へ送る事項。

## config方針

旧 `togostanza-build.mjs` / `togostanza-build.js` は無条件に実行しない。Phase 2-4では、存在を検出し、移行先として `togostanza.config.ts` をwarningで案内する。旧設定ファイルの存在だけではbuildを失敗させない。

`togostanza.config.ts` は新しい設定入口として扱う。設定APIには `defineTogoStanzaConfig()` を提供する。これは型補助と将来のschema拡張のための薄いhelperであり、Phase 2-4では複雑なvalidationやplugin互換を作り込みすぎない。

`defineTogoStanzaConfig()` の利用経路は、`import { defineTogoStanzaConfig } from "togostanza/config"` をPhase 2-4の最小契約にする。このimport pathが検証fixture内で解決できるところまでをPhase 2-4の対象に含める。npm公開向けの最終的な `exports`、`files`、publish metadataの整理はPhase 5で扱う。

007ケース入力には `togostanza.config.ts` が含まれていない。そのため、新設定の検出、読み込み、`defineTogoStanzaConfig()` の確認は、007ケースとは別のunit testまたは専用integration fixtureで扱う。

Phase 2-4の最小schema候補は次の範囲に留める。

- Vite configへ渡す限定的な追加設定。
- Vite pluginを追加するescape hatch。
- build解決に必要なaliasやresolve補助。

ただし、実装時に007ケースを通すために不要な項目は作らない。configが不要でも通る解決は、configではなく標準ビルド設定として扱う。

## tsconfig / alias方針

`tsconfig.json` はTypeScript / TSXビルド設定として尊重する。Viteが既定で読む範囲はViteに任せ、TogoStanza側で独自に再実装しすぎない。

現行版では、`tsconfig.json` があるとTypeScript supportが有効化され、JSソースだけのケースで `allowJs` が無い場合に `TS18003` で失敗することが007ケースで観測されている。リメイク版はVite/esbuildを基本にするため、同じ `tsc` 駆動の `TS18003` を互換挙動として再現することは目指さない。`tsconfig.json` は尊重するが、現行版の失敗条件そのものは固定しない。

Phase 2-4では、`paths` やVite aliasの合成順を外部契約として固定しない。必要な場合は、次の優先で扱う。

1. Vite標準解決で通るもの。
2. TogoStanzaが固定契約として持つalias。
3. `togostanza.config.ts` で明示された解決補助。

Sassの `@/` aliasは、JS/TS aliasとは分離した固定契約として扱う。これは `@use "@/common.scss"` を維持するためのSass限定aliasであり、JS/TSの `@/` importを同時に保証するものではない。

## asset方針

stanza別 `assets/` は `dist/{id}/assets/` へコピーする。root `assets/` は `dist/assets/` へコピーする。この既存契約はPhase 2-4でも維持する。

Stanza entrypointからimportしたassetは、Viteのasset処理に乗せる。出力がdata URL inlineになるか、別ファイルemitになるか、hash名になるかは固定しない。ただし、生成bundleから参照でき、static hosting上で壊れないことを確認する。

Viteが非inline assetをemitする場合、root `assets/` のコピー先である `dist/assets/` とは分ける。Phase 2-4では、Vite emit assetの出力先を `_assets/` などの内部生成物ディレクトリへ寄せ、Stanza開発者が置いたroot assetとビルドemit assetが同じ `assets/` に混在しないようにする。

依存パッケージ内asset importは、`togostanza-utils` API互換とは分離して扱う。Phase 2-4では、依存パッケージからassetをimportできるか、未対応なら移行手順が分かる診断が出ることを確認する。

CSS `url(...)` は、生成された `{id}.css` から解決できる必要がある。Phase 2-1のようにSass単体でCSSを書き出すだけでは、URLの基準がずれて壊れるため、Phase 2-4ではstanza asset相対URLを書き換えたうえで、実ブラウザで「読み込まれた」ことまで確認する。

## 検証計画

Unit test:

- 旧設定ファイル検出が旧設定を実行しないこと。
- 旧設定ファイル診断が移行先を含むこと。
- `togostanza.config.ts` の最小shapeを読み込めること。
- `togostanza.config.ts` から `togostanza/config` を解決できること。
- `togostanza.config.ts` の読み込みは、007ケースとは別の専用fixtureで確認すること。
- config読み込み失敗時に対象pathが分かる診断を返すこと。
- Sass `@/` aliasが維持されること。
- CSS `url("./assets/...")` の書き換え対象と対象外を確認すること。

Integration test:

- 007ケース相当のリポジトリで `build` が成功すること。
- `build` / `b` の両方で同じ解決設定が使われること。
- 共有ソースimportを含むentrypointがbundleされること。
- Stanza entrypoint asset importとpackage asset importを含むbundleが生成されること。
- Vite emit assetがroot `assets/` と別の出力先へ分離されること。
- root `assets/` とstanza別 `assets/` が期待位置へ出力されること。
- unsafe output pathやpreflightの既存テストが退行しないこと。

Browser test:

- static fixtureで `{id}.js` をmodule scriptとして読み込む。
- custom elementがupgradeされる。
- 共有ソース由来の表示がDOMへ出る。
- JS asset import由来の画像が読み込まれる。
- package asset import由来の画像が読み込まれる。
- CSS `url(...)` 由来の画像またはstyleが実際に適用される。
- root `assets/` が `dist/assets/` から取得できる。
- Stanzaソースからroot assetを `./assets/...` として参照するケースは、Phase 2-4では既知制約として007ケースREADMEに記録される。
- `{id}/metadata.json` fetchにruntime初期化が依存しない既存契約が維持される。

Documentation:

- 007ケースREADMEにリメイク版観測結果を追記する。
- 必要ならPhase 2-4完了後にhandoffを作る。

完了前確認:

```sh
git diff --check
cd package && mise exec -- pnpm run check-all
```

packageの品質確認やbrowser testは、sandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。

## 後続へ送る事項

- `serve` での設定変更、共有ソース変更、asset変更のwatchとinvalidate。
- GitHub Pages workflowの実deploy化。
- React / TSX互換の詳細。
- Vue SFC互換の詳細。
- `togostanza-utils` packageのAPI互換。
- 旧Rollup plugin APIの移行ガイド詳細。
- alias合成順の広範な固定。
- assetのinline/emit/hash/threshold。
- root assetをStanzaソースから参照する推奨APIまたはhelper。
- `index.html` と `-togostanza/` のヘルププレビュー生成。
