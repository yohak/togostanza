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

## fixture 構造

```text
current/
  mise.toml
  package.json
  common.scss
  togostanza-build.mjs
  togostanza-build.js
  tsconfig.json
  assets/
    root-public-marker.txt
  lib/
    fixture-label.js
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

`current/mise.toml` は Node 18 系を指定する。case 直下には置かない。

`togostanza-build.mjs` と `togostanza-build.js` は、どちらも無害な marker plugin を返すだけにしている。現行 build が読み込んだ場合は、`case-007: ... was executed` という warning で検出できる。ファイル作成、削除、外部通信などの副作用は持たせない。

`stanzas/config-resolution/index.js` は、次の解決を active import / active reference として含む。

- `../../lib/fixture-label.js` への相対 import
- `./assets/local-marker.svg` への JavaScript asset import
- `style.scss` 内の `url("./assets/local-marker.svg")`
- root `assets/root-public-marker.txt` への public path 参照

alias はまだ active import にしていない。候補は `tsconfig.json` と `stanzas/config-resolution/alias-candidates.md` に記録し、migration note の要否を判断するための入力として扱う。

## 現行版で観測すること

- `.mjs` 設定が現行 build に影響するか。
- `.js` 設定が現行 build に影響するか。
- asset import の出力 path。
- root `assets/` と stanza `assets/` の公開 path。
- 実プロジェクトで使われている alias。

### 実行コマンド

未実行。現行版を観測するときは `current/` で次を実行する。

```sh
mise trust
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

必要に応じて、設定ファイルの片方だけを一時的に退避して `.mjs` と `.js` の読み込み差分を分けて観測する。その場合も、退避はこの case の `current/` 内だけで行い、観測後に fixture を元へ戻す。

### 現行版の期待観測

- `.mjs` が読み込まれる場合は `case-007: togostanza-build.mjs was executed` が出る。
- `.js` が読み込まれる場合は `case-007: togostanza-build.js was executed` が出る。
- どちらも出ない場合は、旧設定ファイルが現行 build に影響していない可能性として記録する。
- JavaScript asset import、SCSS `url()`、root public asset 参照が成功するか、失敗する場合は error と対象 path を記録する。
- `tsconfig.json` の paths は active import で使っていないため、この fixture の初回 build 成否とは切り分ける。

## リメイク版で観測すること

- 旧設定ファイルを検出したときの warning / error。
- `togostanza.config.ts` の読み込み。
- Vite plugin / Vite config の escape hatch。
- asset import と public asset 参照が壊れていないこと。
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
- alias 由来の差分がある場合、migration note の要否が判断できる。

## 記録する差分

- 設定ファイル名と読み込み有無。
- warning / error の内容。
- import 解決結果。
- asset 出力 path。
- alias 設定の有無。

## コマンド記録

この fixture 作成時点では、install / build は実行していない。

実行済み:

- `git diff --check -- workbench/cases/007-config-and-resolution`
- `rg -n "[ \t]+$" workbench/cases/007-config-and-resolution`

未実行:

- `mise trust`
- `mise exec -- npm install`
- `mise exec -- npx togostanza build --output-path dist`
- `.mjs` / `.js` を片方ずつにした読み込み差分確認

## 未決定事項

- `defineTogoStanzaConfig()` の schema。
- alias 合成順。
- asset の inline / emit / hash / threshold。
