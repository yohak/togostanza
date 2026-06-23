# 007 Config and resolution

## 目的

build設定、import解決、asset参照の扱いを確認し、既存Stanza sourceを壊さない範囲を見極める。

## 対応する方針

- 現行の `togostanza-build.mjs/js` によるRollup plugin注入は再設計する。
- 新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。
- 旧設定ファイルは無条件に実行せず、検出してmigration noteへ誘導する。
- 既存Stanza sourceからのasset importが壊れないことを見る。
- alias互換は実装時判断とするが、既存Stanza sourceを壊さないことを優先する。

## 入力条件

- `togostanza-build.mjs` を持つケースを用意する。
- `togostanza-build.js` を持つケースを用意する。
- asset importとpublic asset参照を含むStanza sourceを用意する。
- 実プロジェクトで観測されたalias/tsconfig pathsを必要に応じて反映する。
- Sass alias `@use "@/common.scss"` を含む。
- 依存package内asset importを含む。これは `togostanza-utils` 関数API互換とは分離し、asset resolutionだけを見る。

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

`togostanza-build.mjs` と `togostanza-build.js` は、どちらも無害なmarker pluginを返すだけにしている。現行buildが読み込んだ場合は、`case-007: ... was executed` というwarningで検出できる。ファイル作成、削除、外部通信などの副作用は持たせない。

`stanzas/config-resolution/index.js` は、次の解決をactive import/active referenceとして含む。

- `../../lib/observation-label.js` への相対import
- `./assets/local-marker.svg` へのJavaScript asset import
- `case-007-asset-package/package-marker.svg` へのJavaScript package asset import
- `style.scss` 内の `url("./assets/local-marker.svg")`
- `style.scss` 内の `@use "@/common.scss"`
- root `assets/root-public-marker.txt` へのpublic path参照

workspace import aliasはまだactive importにしていない。候補は `%stanza/*`、`%core/*` として `tsconfig.json` と `stanzas/config-resolution/alias-candidates.md` に記録し、migration noteの要否を判断するための入力として扱う。

`tsconfig.json` は `paths` の候補を記録しつつ、JS sourceの現行buildがTypeScript support有効化後に失敗しないよう `allowJs: true` を指定する。

## 現行版で観測すること

- `.mjs` 設定が現行buildに影響するか。
- `.js` 設定が現行buildに影響するか。
- asset importの出力path。
- package asset importの出力path。
- root `assets/` とstanza `assets/` の公開path。
- Sass alias `@/common.scss` が現行buildで解決されるか。
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

build後は観測補助用package scriptで `fixtures/config-resolution.html` を配信し、browserで開く。

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

### build結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `tsconfig.json` が存在すると現行buildはTypeScript supportを有効化する。
- `allowJs` なしの初回buildは `TS18003: No inputs were found in config file ... tsconfig.json` で失敗した。
- JS sourceのケース入力として `tsconfig.json` に `allowJs: true` を追加した後、`mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build時にSass deprecation warningが多数出た。
- `dist/` には `config-resolution.js`、`config-resolution.css`、`config-resolution.html`、`config-resolution/metadata.json`、`config-resolution/assets/local-marker.svg`、`assets/root-public-marker.txt`、`index.html`、`-togostanza/*` が生成された。
- Sass alias `@use "@/common.scss"` を含めたbuildは成功し、`dist/config-resolution.css` に `--case-007-accent: #2f6f73` が出力された。
- package asset importを含めたbuildは成功し、`dist/config-resolution.js` にpackage marker URLの描画経路が含まれた。

### 旧設定ファイルの読み込み

`togostanza-build.mjs` と `togostanza-build.js` は、読み込まれた場合に `case-007: ... was executed` warningを出すmarker pluginを返す。

| 条件 | build結果 | marker warning |
| ---- | ---------- | -------------- |
| `.mjs` と `.js` の両方あり | 成功 | 出なかった |
| `.mjs` のみ | 成功 | 出なかった |
| `.js` のみ | 成功 | 出なかった |

この検証ケースでは、現行buildが `togostanza-build.mjs` / `togostanza-build.js` をRollup pluginとして読み込む挙動は観測されなかった。

### asset解決結果

- `../../lib/observation-label.js` の相対importは解決し、browser上で `case-007 relative import resolved` と表示された。
- JavaScriptからの `./assets/local-marker.svg` importは `data:image/svg+xml,...` にinlineされた。
- JavaScriptからのpackage asset importはbuild成功し、browser上では `data:image/svg+xml,...` のinline URLとして描画された。
- shadow root内のlocal asset `img` は `24x24`、package asset `img` は `150x150` として読み込み完了した。
- `style.scss` 内の `url("./assets/local-marker.svg")` は `dist/config-resolution.css` に同じ相対pathのまま出力された。
- `style.scss` 内の `@use "@/common.scss"` はbuild成功し、`--case-007-accent` が `dist/config-resolution.css` に反映された。
- browser上でも `--case-007-accent: #2f6f73` がhostに入り、`.config-resolution-observation` のleft borderは `rgb(47, 111, 115)` / `4px` になった。
- `style.scss` 内の `url("./assets/local-marker.svg")` はbrowser上では `http://127.0.0.1:4177/dist/assets/local-marker.svg` として解決された。
- stanza assetは `dist/config-resolution/assets/local-marker.svg` に出力された。
- root assetは `dist/assets/root-public-marker.txt` に出力され、`http://127.0.0.1:4177/dist/assets/root-public-marker.txt` は `200` で `case-007 root public asset marker` を返した。
- Stanza sourceが表示したroot public asset pathは `./assets/root-public-marker.txt`。このpathはdirect embed URL `fixtures/config-resolution.html` を基準にすると `fixtures/assets/root-public-marker.txt` へ解決され、HTTP statusは `404` だった。
- browser consoleのerror/warningは観測されなかった。

## リメイク版で観測すること

- 旧設定ファイルを検出したときのwarning/error。
- `togostanza.config.ts` の読み込み。
- Vite plugin/Vite configのescape hatch。
- asset importとpublic asset参照が壊れていないこと。
- Sass aliasとpackage asset importが壊れていないこと、またはmigration noteが出ること。
- aliasが必要な既存sourceを吸収できること。

### リメイク版の期待観測

- `togostanza-build.mjs` / `togostanza-build.js` は無条件実行しない。
- 旧設定ファイルを検出した場合、`togostanza.config.ts` など移行先が分かるmigration noteを出す。
- asset importとpublic asset参照は、既存Stanza sourceを大きく変えずに移行できる。
- aliasが未対応の場合は、失敗させるだけでなく、移行手順または対応可否が分かる診断を出す。

## 合格条件

- 旧設定ファイルを無条件に実行しない。
- 移行先が分かる診断が出る。
- 既存Stanza sourceのasset参照が壊れない。
- `@/common.scss` と依存package内asset importの対応可否が説明できる。
- alias由来の差分がある場合、migration noteの要否が判断できる。

## 記録する差分

- 設定ファイル名と読み込み有無。
- warning/errorの内容。
- import解決結果。
- asset出力path。
- package asset importの出力path。
- Sass aliasの解決結果。
- alias設定の有無。

## コマンド記録

実行済み:

- `mise trust ../mise.toml`
- `mise exec -- pnpm install`
- `mise exec -- pnpm exec togostanza --version`
- `mise exec -- pnpm exec togostanza build --output-path dist`
- `.mjs` / `.js` を片方ずつにした読み込み差分確認
- `mise exec -- pnpm run serve:fixture`
- browser observation
- `git diff --check`
- inline command implementation pattern search

## 未決定事項

- `defineTogoStanzaConfig()` のschema。
- alias合成順。
- assetのinline/emit/hash/threshold。
- direct embedでroot public asset pathをどう表現するか。
