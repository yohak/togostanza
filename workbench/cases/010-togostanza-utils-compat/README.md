# 010 togostanza-utils compatibility

## 目的

既存 `togostanza-utils` packageをリメイク版runtimeでも無変更で利用できるか確認する。

このケースでは `togostanza-utils` の中身を再実装・修正せず、Stanzaソースから既存packageをimportして、runtime側が満たすべき互換条件を観測する。

## 対応する方針

- `togostanza-utils` packageのうち、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIをdrop-in互換対象として扱う。
- 理想形は、`togostanza-utils` package自体に手を入れず、既存packageがそのまま動くことである。
- `root.host.stanzaInstance.element` のような現行runtime内部構造への依存は、drop-in互換に必要な範囲でcompat propertyとして受け入れる。
- `togostanza-utils` 単体で完結する純粋なデータ処理APIは、このケースの受け入れ対象にしない。

## 入力条件

- `togostanza-utils` をpackage dependencyとして入れる。
- Stanzaソースでは次のimport pathを使う。
  - `togostanza-utils`
  - `togostanza-utils/load-data`
  - `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png` はこのケースでは扱わない。package asset importとして007で扱う。
- `togostanza-utils/params/data-chart.json` はこのケースでは扱わない。`stanza:include` とpackage内JSON解決の扱いは別follow-upで判断する。
- fixture dataは小さなJSON/CSV/TSV/SPARQL results JSONを使う。
- `loadData()` には `this.root.querySelector("main")` を渡し、loading/error DOMも観測する。
- download menu helpers用にshadow root内へSVGを描画する。

## 受け入れ対象と参考観測

受け入れ対象:

- `togostanza-utils`
- `togostanza-utils/load-data`
- download menu helpers、`dividerMenuItem()`、`appendCustomCss()`、`loadData()` が依存するruntime API / menu contract / 生成DOM構造。
- `togostanza-utils/apply-filter` のimport path解決。

参考観測:

- `applyFilter()` の戻り値。既存Stanzaソースが直接importしているため観測するが、純粋データ処理APIとして挙動互換対象にはしない。
- `Data` class、`togostanza-utils/data`、tree / graph helper。実プロジェクトで直接importが見つかっていないため、このケースの受け入れ対象には含めない。

## ケース入力と観測補助

```text
current-pnpm/
  mise.toml
  generated-repo/
    package.json
    common.scss
    fixtures/
      utils-compat.html
      custom-a.css
      custom-b.css
      data/
        records.csv
        records.json
        records.tsv
        sparql-results.json
    stanzas/
      utils-probe/
        index.js
        metadata.json
        style.scss
        templates/
          stanza.html.hbs
```

`current-pnpm/generated-repo/package.json` は `togostanza-utils` をGitHub commitで固定する。package内コードはケース入力側では変更しない。

## 現行版で観測すること

受け入れ対象:

- `togostanza-utils` のimportが現行ビルドで解決されること。
- `loadData()` がJSON/CSV/TSV/SPARQL results JSONを読み込むこと。
- `loadData()` が配列データに `__togostanza_id__` を付与すること。
- `loadData()` が同じURL/type/limit/offsetの連続呼び出しでcacheを返すこと。
- `loadData()` が `mainElement` にloading DOMを出し、完了後に消すこと。
- `loadData()` 失敗時にerror DOMを出すこと。
- `appendCustomCss()` が既存 `link[data-togostanza-custom-css]` を削除し、新しいlinkへ差し替えること。
- download menu helpersが `{ type, label, handler }` のitemを返すこと。
- `dividerMenuItem()` が `{ type: "divider" }` を返すこと。
- SVG/PNG download helperが依存する `stanza.root`、shadow root内 `style`、`root.host.stanzaInstance.element` が存在すること。
- runtime menu UIが表示される環境では、SVG/PNG/JSON/CSV/TSV handlerを呼び出したときにruntime構造依存の例外が出ないこと。

参考観測:

- `applyFilter()` がfixture dataへfilterを適用できること。

## リメイク版で観測すること

- 同じStanzaソースと同じ `togostanza-utils` packageを、package側の修正なしで利用できること。
- TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIのimport pathと挙動が維持されること。
- `togostanza-utils/apply-filter` のimport pathが解決できること。`applyFilter()` の挙動は参考観測に留める。
- `this.root` がshadow rootとしてDOM APIを提供すること。
- shadow root内に `main` があり、loading/error/custom DOMの挿入先として使えること。
- shadow root内にgenerated stylesheet情報があり、download helperが参照できること。
- `this.element` と `this.root.host.stanzaInstance.element` がhost custom elementを指すこと。
- runtime menuが `{ type, label, handler }` と `{ type: "divider" }` を扱えること。

### リメイク版の観測状況

- 確認日: 2026-07-01
- 確認範囲: package test内の `utils-probe` fixture。
- `references/togostanza-utils` の実packageを、変更せずに一時Stanzaリポジトリの `node_modules/togostanza-utils` へコピーして確認した。手書きshimや再実装fixtureでは代替していない。
- `togostanza-utils` の実依存である `d3`、`csv-stringify`、`date-fns` は、package test用devDependencyの実packageを一時Stanzaリポジトリ側の `node_modules/` へsymlinkして確認した。
- `src/cli/router.spec.ts` で、`togostanza-utils`、`togostanza-utils/load-data`、`togostanza-utils/apply-filter` をimportするStanzaが `togostanza build` で生成物を作れることを確認した。
- `src/test/browser/custom-element.smoke.spec.ts` で、direct embedから `<togostanza-utils-probe>` がupgradeされ、010の受け入れ対象チェックがすべて `ok` になることを確認した。
- `loadData()` はJSON、CSV、TSV、SPARQL results JSONを読み込み、配列データへ `__togostanza_id__` を付与した。
- 同一URL / type / limit / offsetの連続 `loadData()` はcacheを返した。
- missing JSON fetchではerror DOMが出て、loading DOMは完了後に削除された。ブラウザの404 resource console errorは、意図したerror URL由来として扱った。
- `appendCustomCss()` は `link[data-togostanza-custom-css]` を差し替え、最後の `custom-b.css` だけが残った。
- `this.root.host.stanzaInstance.element` はhost custom elementを指し、download helpersが参照するshadow root内 `style` と `link[rel="stylesheet"]` も存在した。
- runtime menuにはDownload SVG / PNG / JSON / CSV / TSV itemとdividerが表示され、各itemのhandlerを呼び出してもruntime構造依存の `pageerror` は出なかった。SVG / PNG / JSON / CSV / TSVの出力内容は比較していない。
- `applyFilter()` の戻り値は参考観測として確認した。挙動互換契約には含めない。

確認コマンド:

- `mise exec -- pnpm exec vitest run --config vitest.config.ts src/cli/router.spec.ts -t togostanza-utils`
- `mise exec -- pnpm exec playwright test --config playwright.config.ts -g togostanza-utils`

## 合格条件

- `togostanza-utils` packageを変更せずにbuildできる。
- fixtureをブラウザで開いたとき、受け入れ対象の観測値がすべて `ok` になる。
- ブラウザコンソールにruntime errorが出ない。
- download menu itemが表示され、SVG/PNG/JSON/CSV/TSV handlerを呼び出してもruntime構造依存の例外が出ない。
- `togostanza-utils/apply-filter` のimport pathが解決できる。
- 差分がある場合は、package変更ではなくruntime compat、移行メモ、または採用範囲の見直しとして説明できる。

## 記録する差分

- import解決結果。
- `loadData()` のdata type別の戻り値。
- loading/error DOMのclass/id。
- `__togostanza_id__` の付与有無。
- cache同一性。
- custom CSS linkの差し替え結果。
- menu item contract。
- download handler実行時の例外有無。
- `root.host.stanzaInstance.element` compat propertyの有無。

## 現行版の観測状況

確認済み。

- 確認日: 2026-06-23
- 作業ディレクトリ: `workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- `togostanza-utils`: `0.0.0`
- 確認URL: `http://127.0.0.1:4178/fixtures/utils-compat.html`

### 実行したコマンド

```sh
cd workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm run serve:fixture
```

`mise.toml` は `current-pnpm/` に置き、Node.jsの18系とpnpmの9系を固定している。

`mise trust` は、ユーザーから明示承認を受けて実行した。

`install`、`build`、ローカルHTTPサーバーは、Codex sandboxの権限制約、network制限、またはwatcher制限を避けるため、承認済みの通常コマンド実行で行った。

### ビルド結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza --version` は `3.0.0-beta.57` を返した。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- ビルド時にSass deprecation警告が多数出た。
- `dist/` には `utils-probe.js`、`utils-probe.js.map`、`utils-probe.css`、`utils-probe.html`、`utils-probe/metadata.json`、`index.html`、`-togostanza/*` が生成された。

### ブラウザ観測

`http://127.0.0.1:4178/fixtures/utils-compat.html` をin-app browserで開き、shadow root内の観測値を確認した。

- host custom elementは存在した。
- open shadow rootは存在した。
- overall statusは `ok` だった。
- ブラウザコンソールのerror/warnは観測されなかった。

観測値:

| check | status | detail |
| ---- | ---- | ---- |
| `loadData json` | `ok` | `3 rows` |
| `__togostanza_id__` | `ok` | `0,1,2` |
| `loadData cache` | `ok` | `same object returned` |
| `loadData csv` | `ok` | `alpha,beta,alphabet` |
| `loadData tsv` | `ok` | `alpha,beta,alphabet` |
| `loadData sparql-results-json` | `ok` | SPARQL results JSONから2行に変換された |
| `loadData error ui` | `ok` | missing JSON fetchでerror UIが出た |
| `loadData loading cleanup` | `ok` | loading elementは完了後に削除された |
| `applyFilter` | `ok` | `alpha,alphabet` |
| `appendCustomCss replacement` | `ok` | `custom-b.css` のlinkだけが残った |
| `download root compat` | `ok` | `root.host.stanzaInstance.element` は `TOGOSTANZA-UTILS-PROBE` を指した |
| `download style compat` | `ok` | shadow root内のgenerated `style` を確認 |
| `menu item contract` | `ok` | `Download SVG,Download PNG,divider,Download JSON,Download CSV,Download TSV` |
| `divider menu item` | `ok` | divider itemを確認 |

direct embedでは現行runtimeのmenu UIはlight DOMに表示されなかった。そのため、runtime menu UI経由のdownload handlerクリックは未確認。Stanza instanceの `menu()` 戻り値と、download helperが必要とするruntime構造依存はStanza内観測で確認する。

`applyFilter` はTogoStanza接点を持たない純粋データ処理APIなので、上の観測値は参考観測として扱う。ただし、既存Stanzaソースが直接importしているため、`togostanza-utils/apply-filter` のimport解決は確認対象に含める。`Data` class、`togostanza-utils/data`、graph/tree helperは、このケースの受け入れ対象には含めない。

## Phase 14 menu UI確認: 2026-07-27

`test:compat:local` の `utils-probe` は、`references/togostanza-utils` の実packageを変更せずにcopyして使う。`downloadSvgMenuItem()`、`downloadPngMenuItem()`、`downloadJSONMenuItem()`、`downloadCSVMenuItem()`、`downloadTSVMenuItem()` が返すitemを `<togostanza--menu>` のpopupへ表示し、各itemのhandlerをclickした。

Download SVG / PNG / JSON / CSV / TSVの5 itemとdividerが表示され、handler呼び出し後にruntime構造依存の `pageerror` は出なかった。browser testはdownload eventをcancelしており、保存されたファイルの内容までは確認していない。

## 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm run serve:fixture
```

確認URLは `http://127.0.0.1:4178/fixtures/utils-compat.html` とする。

`install`、`build`、ローカルHTTPサーバーは、Codex sandboxの権限制約、network制限、またはwatcher制限を避けるため、必要に応じて承認済みの通常コマンド実行で行う。

## 未決定事項

- SVG/PNG downloadの出力内容まで厳密比較するか、handler実行時のruntime互換確認に留めるか。
- TogoStanza接点があるAPIのedge caseをどこまで受け入れ検証に含めるか。

## Phase 6 リメイク版workbench入力

`remake/generated-repo/` は、010の `togostanza-utils` 互換観測をリメイク版CLIで再実行するための入力である。

基本手順:

```sh
cd package
mise exec -- pnpm run build
cd ../workbench/cases/010-togostanza-utils-compat/remake/generated-repo
pnpm install
pnpm run build:local
pnpm run serve:fixture
```

確認URLは `http://127.0.0.1:4180/fixtures/utils-compat.html` とする。Phase 6のworkbench入力では、`togostanza-utils` を `references/togostanza-utils` へのlocal linkとして扱う。`togostanza-utils` 内部依存の `d3`、`date-fns`、`csv-stringify` は `togostanza.config.ts` のVite aliasで `node_modules` へ向けている。これはローカルworkbench確認用であり、pack install確認ではない。
