# 007 Config and resolution

## 目的

ビルド設定、import解決、asset参照の扱いを確認し、既存Stanzaソースを壊さない範囲を見極める。

## 対応する方針

- 現行の `togostanza-build.mjs/js` によるRollup plugin注入は再設計する。
- 新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。
- 旧設定ファイルは無条件に実行せず、検出して移行メモへ誘導する。
- 既存Stanzaソースからのasset importが壊れないことを見る。
- alias互換は実装時判断とするが、既存Stanzaソースを壊さないことを優先する。
- Sassでは `@/` をリポジトリルートaliasとして扱い、`@use "@/common.scss"` を維持する。
- stanza外の共有ソースはディレクトリ名ではなくimport graph基準で扱う。
- `tsconfig.json` はTypeScript / TSXビルド設定として尊重する。
- ルート `assets/` は `dist/assets/` に出力され、生成物から相対URLで参照できる。

## 入力条件

- `togostanza-build.mjs` を持つケースを用意する。
- `togostanza-build.js` を持つケースを用意する。
- asset importとpublic asset参照を含むStanzaソースを用意する。
- 実プロジェクトで観測されたalias/tsconfig pathsを必要に応じて反映する。
- Sass alias `@use "@/common.scss"` を含む。これはSass限定の固定契約として扱い、JS/TS aliasとは分離する。
- Stanza entrypointからimportされるstanza外共有ソースを含む。
- 依存パッケージ内asset importを含む。これは `togostanza-utils` 関数API互換とは分離し、asset resolutionだけを見る。

## ケース入力と観測補助

```text
current-pnpm/
  mise.toml
  generated-repo/
    package.json
    pnpm-lock.yaml
    common.scss
    togostanza-build.mjs
    togostanza-build.js
    tsconfig.json
    assets/
      root-public-marker.txt
    fixtures/
      config-resolution.html
    lib/
      observation-label.js
    vendor/
      case-007-asset-package/
        package.json
        package-marker.svg
    stanzas/
      config-resolution/
        README.md
        alias-candidates.md
        index.js
        metadata.json
        style.scss
        assets/
          local-marker.svg
        templates/
          stanza.html.hbs
```

`current-pnpm/mise.toml` はNode.jsの18系とpnpmの9系を指定する。検証ケース直下には置かない。

`togostanza-build.mjs` と `togostanza-build.js` は、どちらも無害なmarker pluginを返すだけにしている。現行ビルドが読み込んだ場合は、`case-007: ... was executed` という警告で検出できる。ファイル作成、削除、外部通信などの副作用は持たせない。

`stanzas/config-resolution/index.js` は、次の解決をactive import/active referenceとして含む。

- `../../lib/observation-label.js` への相対import
- `./assets/local-marker.svg` へのJavaScript asset import
- `case-007-asset-package/package-marker.svg` へのJavaScript package asset import
- `style.scss` 内の `url("./assets/local-marker.svg")`
- `style.scss` 内の `@use "@/common.scss"`
- root `assets/root-public-marker.txt` へのpublic path参照

`../../lib/observation-label.js` は、`lib/` という名前そのものではなく、Stanza entrypointからimportされるリポジトリ内共有ソースの代表例として扱う。リメイク版では `components/`、`utils/`、`state/`、`lib/` など任意の共有ソースディレクトリをimport graph基準で扱う。

workspace import aliasはまだactive importにしていない。候補は `%stanza/*`、`%core/*` として `tsconfig.json` と `stanzas/config-resolution/alias-candidates.md` に記録し、移行メモの要否を判断するための入力として扱う。`tsconfig.json` は、JSソースの現行ビルドがTypeScript support有効化後に失敗しないよう `allowJs: true` を指定する。

## 現行版で観測すること

- `.mjs` 設定が現行ビルドに影響するか。
- `.js` 設定が現行ビルドに影響するか。
- asset importの出力path。
- package asset importの出力path。
- root `assets/` とstanza `assets/` の公開path。
- Sass alias `@/common.scss` が現行ビルドで解決されるか。
- `tsconfig.json` がTypeScript / TSXビルド設定として使われるか。
- stanza外共有ソースがimport graph上の依存として扱われるか。
- root `assets/` が `dist/assets/` に出力され、生成物から相対URLで参照できるか。
- 実プロジェクトで使われているalias。

### 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/007-config-and-resolution/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza build --output-path dist
```

ビルド後は観測補助用package scriptで `fixtures/config-resolution.html` を配信し、ブラウザで開く。

```sh
mise exec -- pnpm run serve:fixture
```

設定ファイルの片方だけを一時的に退避して `.mjs` と `.js` の読み込み差分も観測する。その場合も、退避はこの検証ケースの `current-pnpm/generated-repo/` 内だけで行い、観測後にケース入力を元へ戻す。

### 現行版の観測状況

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/007-config-and-resolution/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4177/fixtures/config-resolution.html`

### 実行したコマンド

```sh
cd workbench/cases/007-config-and-resolution/current-pnpm/generated-repo
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
- `tsconfig.json` が存在すると現行ビルドはTypeScript supportを有効化する。
- `allowJs` なしの初回ビルドは `TS18003: No inputs were found in config file ... tsconfig.json` で失敗した。
- JSソースのケース入力として `tsconfig.json` に `allowJs: true` を追加した後、`mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルド時にSass deprecation警告が多数出た。
- `dist/` には `config-resolution.js`、`config-resolution.css`、`config-resolution.html`、`config-resolution/metadata.json`、`config-resolution/assets/local-marker.svg`、`assets/root-public-marker.txt`、`index.html`、`-togostanza/*` が生成された。
- Sass alias `@use "@/common.scss"` を含めたビルドは成功し、`dist/config-resolution.css` に `--case-007-accent: #2f6f73` が出力された。
- package asset importを含めたビルドは成功し、`dist/config-resolution.js` にpackage marker URLの描画経路が含まれた。

### 旧設定ファイルの読み込み

`togostanza-build.mjs` と `togostanza-build.js` は、読み込まれた場合に `case-007: ... was executed` 警告を出すmarker pluginを返す。

| 条件 | ビルド結果 | marker warning |
| ---- | ---------- | -------------- |
| `.mjs` と `.js` の両方あり | 成功 | 出なかった |
| `.mjs` のみ | 成功 | 出なかった |
| `.js` のみ | 成功 | 出なかった |

この検証ケースでは、現行ビルドが `togostanza-build.mjs` / `togostanza-build.js` をRollup pluginとして読み込む挙動は観測されなかった。

### asset解決結果

- `../../lib/observation-label.js` の相対importは解決し、ブラウザ上で `case-007 relative import resolved` と表示された。
- JavaScriptからの `./assets/local-marker.svg` importは `data:image/svg+xml,...` にinlineされた。
- JavaScriptからのpackage asset importはビルド成功し、ブラウザ上では `data:image/svg+xml,...` のinline URLとして描画された。
- shadow root内のlocal asset `img` は `24x24`、package asset `img` は `150x150` として読み込み完了した。
- `style.scss` 内の `url("./assets/local-marker.svg")` は `dist/config-resolution.css` に同じ相対pathのまま出力された。
- `style.scss` 内の `@use "@/common.scss"` はビルド成功し、`--case-007-accent` が `dist/config-resolution.css` に反映された。
- ブラウザ上でも `--case-007-accent: #2f6f73` がhostに入り、`.config-resolution-observation` のleft borderは `rgb(47, 111, 115)` / `4px` になった。
- `style.scss` 内の `url("./assets/local-marker.svg")` はブラウザ上では `http://127.0.0.1:4177/dist/assets/local-marker.svg` として解決された。
- stanza assetは `dist/config-resolution/assets/local-marker.svg` に出力された。
- root assetは `dist/assets/root-public-marker.txt` に出力され、`http://127.0.0.1:4177/dist/assets/root-public-marker.txt` は `200` で `case-007 root public asset marker` を返した。
- Stanzaソースが表示したルートasset pathは `./assets/root-public-marker.txt`。このpathはdirect embed URL `fixtures/config-resolution.html` を基準にすると `fixtures/assets/root-public-marker.txt` へ解決され、HTTP statusは `404` だった。
- ブラウザコンソールのエラー/警告は観測されなかった。

## リメイク版で観測すること

- 旧設定ファイルを検出したときの警告/エラー。
- `togostanza.config.ts` の読み込み。
- Vite plugin/Vite configのescape hatch。
- `tsconfig.json` がTypeScript / TSXビルド設定として尊重されること。
- asset importとpublic asset参照が壊れていないこと。
- Sass alias `@/` がリポジトリルートを指し、`@use "@/common.scss"` が解決されること。
- package asset importが壊れていないこと、または移行メモが出ること。
- stanza外共有ソースの変更がbuild / serveの依存グラフに含まれること。
- root `assets/` が `dist/assets/` に出力され、生成物から相対URLで参照できること。
- aliasが必要な既存ソースを吸収できること。

### リメイク版の期待観測

- `togostanza-build.mjs` / `togostanza-build.js` は無条件実行しない。
- 旧設定ファイルを検出した場合、`togostanza.config.ts` など移行先が分かる移行メモを出す。
- asset importとpublic asset参照は、既存Stanzaソースを大きく変えずに移行できる。
- Sass `@/` aliasはSass限定の契約として維持する。
- `tsconfig.json` は尊重するが、paths合成順やVite aliasとの優先順位は固定しない。
- 共有ソースは特定のディレクトリ名ではなくimport graph基準で扱う。
- aliasが未対応の場合は、失敗させるだけでなく、移行手順または対応可否が分かる診断を出す。

### リメイク版の観測状況

確認済み。

- 確認日: 2026-06-30
- 作業ディレクトリ: `package/`
- Node.js / pnpm: `package/mise.toml` に従う
- 確認方法: 007相当のfixtureを `package/src/cli/router.spec.ts` と `package/test/browser/custom-element.smoke.spec.ts` で確認

この時点では、`workbench/cases/007-config-and-resolution/current-pnpm/generated-repo/` をリメイク版用に直接再利用していない。これは同ディレクトリの `package.json` が現行版 `togostanza` 依存として作られているためである。リメイク版の観測は、同じ観測契約を切り出したpackage test上のfixtureで記録する。

### リメイク版で実行したコマンド

```sh
cd package
mise exec -- pnpm run test:unit
mise exec -- pnpm run build
mise exec -- pnpm run check-all
```

`check-all` は承認付き通常実行で確認した。これはbrowser testがローカルのChromium起動を必要とし、Codex sandbox内ではmacOSのMach port権限制約で失敗するためである。

### リメイク版のビルド結果

- `togostanza build` / `togostanza b` は、Phase 2-4相当のStanzaリポジトリをビルドできる。
- 生成物には `{id}.js`、`{id}.js.map`、`{id}.css`、`{id}.css.map`、`{id}.html`、`{id}/metadata.json` が含まれる。
- Phase 2-4時点では、現行版が生成する `index.html` と `-togostanza/` は生成しない。この差分はPhase 2の別サブフェーズまたは後続判断で扱う。
- Viteがemitする非inline assetは `dist/_assets/` に出力される。root `assets/` のコピー先である `dist/assets/` とは分離される。
- Viteの `base` は `./` とし、JavaScript asset importから生成されるURLは `/_assets/...` のようなドメインroot基準にならない。
- stanza別assetは `dist/{id}/assets/` にコピーされる。
- root `assets/` は `dist/assets/` にコピーされる。

代表的な生成物は次の形になる。

```text
dist/
  _assets/
    local-marker-*.svg
    package-marker-*.svg
  assets/
    root-asset.txt
  asset-import-probe.js
  asset-import-probe.js.map
  asset-import-probe.css
  asset-import-probe.css.map
  asset-import-probe.html
  asset-import-probe/
    metadata.json
    assets/
      local-marker.svg
```

### リメイク版の設定ファイル結果

- `togostanza-build.mjs` / `togostanza-build.js` は検出するが、import、eval、spawnしない。
- 旧設定ファイルが存在してもbuildは続行し、`togostanza.config.ts` への移行を促すwarningを出す。
- `togostanza.config.ts` はViteの `loadConfigFromFile()` 経由で読み込む。
- `defineTogoStanzaConfig()` は `import { defineTogoStanzaConfig } from "togostanza/config"` でimportできる。
- `togostanza.config.ts` の `vite.define` と `vite.resolve.alias` はbuildへ反映される。
- `togostanza.config.ts` の読み込みに失敗した場合は、対象pathと原因を含む診断でbuildを失敗させる。

Phase 2-4では、npm公開向けの `exports` / `files` 全体整理は扱わない。ただし `togostanza/config` subpathは設定ファイルの最小契約として有効にした。

### リメイク版の解決結果

- Stanza entrypointからのstanza外共有ソースimportは、import graph基準でbundleされる。
- `tsconfig.json` はVite / esbuildの解決入力として尊重する。
- リメイク版は現行版の `tsc` 駆動ではないため、JSソースだけのケースで `allowJs` が無いと `TS18003` になる現行版の失敗条件は再現しない。
- Sass `@use "@/common.scss"` は、Sass限定のリポジトリルートaliasとして解決される。
- JavaScriptからの `./assets/...` importはViteのasset処理に乗る。
- JavaScriptからの依存パッケージ内asset importもViteのasset処理に乗る。
- asset importが非inline emitになる場合、生成bundle内の参照はサブパス安全な相対URLになる。
- `style.scss` 内の `url("./assets/...")` と `url("assets/...")` は、生成CSS内で `url("./{id}/assets/...")` 相当に書き換える。
- `style.scss` 内のdata URL、外部URL、絶対URLは、この書き換え対象にしない。
- `{id}/metadata.json` fetchへランタイム初期化が依存しない既存契約は維持している。

### リメイク版のbrowser観測

- static fixtureで `{id}.js` をmodule scriptとして読み込める。
- custom elementはupgradeされ、Shadow DOMを作る。
- CSSはdocument baseではなく、生成JS / 生成CSS側の相対URLで解決される。
- CSS由来のstyleは実際に適用される。
- JavaScript asset import由来の画像とpackage asset import由来の画像は、生成bundleから参照できる。
- menuのAbout導線は `{id}.html` へ解決される。
- `metadata.json` をHTTP 500にしても、runtime初期化時にfetchされない。

### リメイク版に残る差分

- 現行版は `index.html` と `-togostanza/` を生成するが、リメイク版Phase 2-4では生成しない。
- 現行版ではJavaScript asset importが小さいSVGをdata URL inlineにした。リメイク版はassetのinline / emit / hash / thresholdを外部契約として固定しない。
- 現行版では `style.scss` 内の `url("./assets/local-marker.svg")` がそのまま出力され、CSS基準で `dist/assets/local-marker.svg` を見に行く。リメイク版ではstanza別assetの位置に合わせて `./{id}/assets/local-marker.svg` 相当へ書き換える。
- Stanzaソース内でroot assetを `./assets/...` と書く場合の推奨APIまたはhelperは、Phase 2-4では未解決の既知制約として残す。
- JS/TSの `@/` import aliasは、Sass `@/` aliasとは別扱いである。必要な場合は `togostanza.config.ts` のVite aliasで明示する。

## 合格条件

- 旧設定ファイルを無条件に実行しない。
- 移行先が分かる診断が出る。
- 既存Stanzaソースのasset参照が壊れない。
- `@/common.scss` と依存package内asset importの対応可否が説明できる。
- `tsconfig.json` の尊重範囲が説明できる。
- 共有ソースimportが解決される。
- root `assets/` の出力URL契約が説明できる。
- alias由来の差分がある場合、移行メモの要否が判断できる。

## 記録する差分

- 設定ファイル名と読み込み有無。
- 警告/エラーの内容。
- import解決結果。
- asset出力path。
- package asset importの出力path。
- Sass aliasの解決結果。
- `tsconfig.json` の読み込みと反映範囲。
- 共有ソースimport graphの扱い。
- root `assets/` の出力URL。
- alias設定の有無。

## コマンド記録

実行済み:

- `mise trust ../mise.toml`
- `mise exec -- pnpm install`
- `mise exec -- pnpm exec togostanza --version`
- `mise exec -- pnpm exec togostanza build --output-path dist`
- `.mjs` / `.js` を片方ずつにした読み込み差分確認
- `mise exec -- pnpm run serve:fixture`
- ブラウザ観測
- `git diff --check`
- inline command implementation pattern search
- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm run check-all`

## 未決定事項

- alias合成順。
- assetのinline/emit/hash/threshold。
- Stanzaソース内でルートasset pathをどう表現するか。
