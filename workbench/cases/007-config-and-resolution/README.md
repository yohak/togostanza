# 007 Config and resolution

## 目的

build 設定、import 解決、asset 参照の扱いを確認し、既存 Stanza source を壊さない範囲を見極める。

## 対応する方針

- 現行の `togostanza-build.mjs/js` による Rollup plugin 注入は再設計する。
- 新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。
- 旧設定ファイルは無条件に実行せず、検出して migration note へ誘導する。
- 既存 Stanza source からの asset import が壊れないことを見る。
- alias 互換は実装時判断とするが、既存 Stanza source を壊さないことを優先する。

## 入力条件

- `togostanza-build.mjs` を持つケースを用意する。
- `togostanza-build.js` を持つケースを用意する。
- asset import と public asset 参照を含む Stanza source を用意する。
- 実プロジェクトで観測された alias / tsconfig paths を必要に応じて反映する。
- Sass alias `@use "@/common.scss"` を含む。
- 依存 package 内 asset import を含む。これは `togostanza-utils` 関数 API 互換とは分離し、asset resolution だけを見る。

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

`current-pnpm/mise.toml` は Node 18 系と pnpm 9 系を指定する。検証ケース直下には置かない。

`togostanza-build.mjs` と `togostanza-build.js` は、どちらも無害な marker plugin を返すだけにしている。現行 build が読み込んだ場合は、`case-007: ... was executed` という warning で検出できる。ファイル作成、削除、外部通信などの副作用は持たせない。

`stanzas/config-resolution/index.js` は、次の解決を active import / active reference として含む。

- `../../lib/observation-label.js` への相対 import
- `./assets/local-marker.svg` への JavaScript asset import
- `case-007-asset-package/package-marker.svg` への JavaScript package asset import
- `style.scss` 内の `url("./assets/local-marker.svg")`
- `style.scss` 内の `@use "@/common.scss"`
- root `assets/root-public-marker.txt` への public path 参照

workspace import alias はまだ active import にしていない。候補は `%stanza/*`、`%core/*` として `tsconfig.json` と `stanzas/config-resolution/alias-candidates.md` に記録し、migration note の要否を判断するための入力として扱う。

`tsconfig.json` は `paths` の候補を記録しつつ、JS source の現行 build が TypeScript support 有効化後に失敗しないよう `allowJs: true` を指定する。

## 現行版で観測すること

- `.mjs` 設定が現行 build に影響するか。
- `.js` 設定が現行 build に影響するか。
- asset import の出力 path。
- package asset import の出力 path。
- root `assets/` と stanza `assets/` の公開 path。
- Sass alias `@/common.scss` が現行 build で解決されるか。
- 実プロジェクトで使われている alias。

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

build 後は観測補助用 package script で `fixtures/config-resolution.html` を配信し、browser で開く。

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

`mise.toml` は `current-pnpm/` に置き、Node 18 と pnpm 9 を固定している。

`mise trust`、`install`、`build`、local HTTP server は、Codex sandbox の権限制約、network 制限、または watcher 制限を避けるため、承認済みの通常コマンド実行で行った。

### build 結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `tsconfig.json` が存在すると現行 build は TypeScript support を有効化する。
- `allowJs` なしの初回 build は `TS18003: No inputs were found in config file ... tsconfig.json` で失敗した。
- JS source のケース入力として `tsconfig.json` に `allowJs: true` を追加した後、`mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build 時に Sass deprecation warning が多数出た。
- `dist/` には `config-resolution.js`、`config-resolution.css`、`config-resolution.html`、`config-resolution/metadata.json`、`config-resolution/assets/local-marker.svg`、`assets/root-public-marker.txt`、`index.html`、`-togostanza/*` が生成された。
- Sass alias `@use "@/common.scss"` を含めた build は成功し、`dist/config-resolution.css` に `--case-007-accent: #2f6f73` が出力された。
- package asset import を含めた build は成功し、`dist/config-resolution.js` に package marker URL の描画経路が含まれた。

### 旧設定ファイルの読み込み

`togostanza-build.mjs` と `togostanza-build.js` は、読み込まれた場合に `case-007: ... was executed` warning を出す marker plugin を返す。

| 条件 | build 結果 | marker warning |
| ---- | ---------- | -------------- |
| `.mjs` と `.js` の両方あり | 成功 | 出なかった |
| `.mjs` のみ | 成功 | 出なかった |
| `.js` のみ | 成功 | 出なかった |

この検証ケースでは、現行 build が `togostanza-build.mjs` / `togostanza-build.js` を Rollup plugin として読み込む挙動は観測されなかった。

### asset 解決結果

- `../../lib/observation-label.js` の相対 import は解決し、browser 上で `case-007 relative import resolved` と表示された。
- JavaScript からの `./assets/local-marker.svg` import は `data:image/svg+xml,...` に inline された。
- JavaScript からの package asset import は build 成功し、browser 上では `data:image/svg+xml,...` の inline URL として描画された。
- shadow root 内の local asset `img` は `24x24`、package asset `img` は `150x150` として読み込み完了した。
- `style.scss` 内の `url("./assets/local-marker.svg")` は `dist/config-resolution.css` に同じ相対 path のまま出力された。
- `style.scss` 内の `@use "@/common.scss"` は build 成功し、`--case-007-accent` が `dist/config-resolution.css` に反映された。
- browser 上でも `--case-007-accent: #2f6f73` が host に入り、`.config-resolution-observation` の left border は `rgb(47, 111, 115)` / `4px` になった。
- `style.scss` 内の `url("./assets/local-marker.svg")` は browser 上では `http://127.0.0.1:4177/dist/assets/local-marker.svg` として解決された。
- stanza asset は `dist/config-resolution/assets/local-marker.svg` に出力された。
- root asset は `dist/assets/root-public-marker.txt` に出力され、`http://127.0.0.1:4177/dist/assets/root-public-marker.txt` は `200` で `case-007 root public asset marker` を返した。
- Stanza source が表示した root public asset path は `./assets/root-public-marker.txt`。この path は direct embed URL `fixtures/config-resolution.html` を基準にすると `fixtures/assets/root-public-marker.txt` へ解決され、HTTP status は `404` だった。
- browser console の error / warning は観測されなかった。

## リメイク版で観測すること

- 旧設定ファイルを検出したときの warning / error。
- `togostanza.config.ts` の読み込み。
- Vite plugin / Vite config の escape hatch。
- asset import と public asset 参照が壊れていないこと。
- Sass alias と package asset import が壊れていないこと、または migration note が出ること。
- alias が必要な既存 source を吸収できること。

### リメイク版の期待観測

- `togostanza-build.mjs` / `togostanza-build.js` は無条件実行しない。
- 旧設定ファイルを検出した場合、`togostanza.config.ts` など移行先が分かる migration note を出す。
- asset import と public asset 参照は、既存 Stanza source を大きく変えずに移行できる。
- alias が未対応の場合は、失敗させるだけでなく、移行手順または対応可否が分かる診断を出す。

## 合格条件

- 旧設定ファイルを無条件に実行しない。
- 移行先が分かる診断が出る。
- 既存 Stanza source の asset 参照が壊れない。
- `@/common.scss` と依存 package 内 asset import の対応可否が説明できる。
- alias 由来の差分がある場合、migration note の要否が判断できる。

## 記録する差分

- 設定ファイル名と読み込み有無。
- warning / error の内容。
- import 解決結果。
- asset 出力 path。
- package asset import の出力 path。
- Sass alias の解決結果。
- alias 設定の有無。

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

- `defineTogoStanzaConfig()` の schema。
- alias 合成順。
- asset の inline / emit / hash / threshold。
- direct embed で root public asset path をどう表現するか。
