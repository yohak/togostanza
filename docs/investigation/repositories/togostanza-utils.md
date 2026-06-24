# リポジトリメモ: togostanza-utils

確認日: 2026-06-22

`togostanza-utils` の関数APIを、TogoStanza remakeの互換性判断材料として扱うための別調査ログ。

## 調査の位置づけ

- 参照元:
  - `references/metastanza/package.json`
  - `references/metastanza/node_modules/togostanza-utils`
- 追加参照元:
  - `references/togostanza-utils` commit `daaf62cfa254abcecdae3b4a41cbe6121c47db22`
- 目的: `togostanza-utils` の公開APIを一覧化し、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIと、package単体で完結する純粋なデータ処理APIを切り分ける。
- この調査ログでは採用判断を確定しない。 `togostanza-utils` をdrop-in互換対象に含めるかどうかの判断は、[リメイク方針](../../spec/remake-policy.md) に記録する。
- 調査上の前提: `togostanza-utils` には手を入れず、既存パッケージがそのまま動くかどうかを先に確認する。
- この調査は `007-config-and-resolution` のpackage asset importとは別に扱う。
  - `import spinner from "togostanza-utils/spinner.png"` はasset resolutionの問題として007の観測要件に含める。
  - `loadData` や `appendCustomCss` などの関数挙動は、この別調査で扱う。

## API inventory

`references/togostanza-utils` で確認した公開対象を記録する。TogoStanza接点があるAPIはリメイク版runtimeの互換検証対象にする。TogoStanza接点がないAPIは、package単体の責務として扱い、リメイク版runtimeの互換検証対象にはしない。

| import path | export / asset | 主な挙動 | TogoStanza接点 |
| ---- | ---- | ---- | ---- |
| `togostanza-utils` | `dividerMenuItem()` | runtime menu用の `{ type: "divider" }` を返す。 | runtime menu contract |
| `togostanza-utils` | `downloadSvgMenuItem()` | SVG download用の `{ type: "item", label, handler }` を返し、handlerが `stanza.root` と生成stylesheet情報を参照する。 | runtime menu contract、`stanza.root` |
| `togostanza-utils` | `downloadPngMenuItem()` | PNG download用の `{ type: "item", label, handler }` を返し、handlerが `stanza.root` と生成stylesheet情報を参照する。 | runtime menu contract、`stanza.root` |
| `togostanza-utils` | `downloadJSONMenuItem()` | JSON download用の `{ type: "item", label, handler }` を返す。 | runtime menu contract |
| `togostanza-utils` | `downloadCSVMenuItem()` | CSV download用の `{ type: "item", label, handler }` を返す。 | runtime menu contract |
| `togostanza-utils` | `downloadTSVMenuItem()` | TSV download用の `{ type: "item", label, handler }` を返す。 | runtime menu contract |
| `togostanza-utils` | `appendCustomCss()` | `stanza.root` 内の既存 `link[data-togostanza-custom-css]` を削除し、指定URLのstylesheet linkを追加する。 | `stanza.root` |
| `togostanza-utils/load-data` | default `loadData()` | JSON、CSV、TSV、SPARQL results JSON、Elasticsearch、textを読み込み、`mainElement` へのloading / error DOM、timeout、limit / offset、cache、`__togostanza_id__` 付与を扱う。 | Shadow DOM内 `main` |
| `togostanza-utils/apply-filter` | default `applyFilter()` | `substring`、`lte`、`gte` のfilterを適用し、未対応filter typeではエラーにする。 | なし |
| `togostanza-utils/data` | `Data` class | `Data.load()`、`.data`、`.asTree()`、`.asGraph()` を提供する。 | なし |
| `togostanza-utils/lib/tree` | `asTree()` | flat dataをtree node配列へ変換する。 | なし |
| `togostanza-utils/lib/tree` | `asD3Hierarchy()` | tree node配列をD3 hierarchyへ変換する。 | なし |
| `togostanza-utils/lib/tree` | `selectSubTree()` | tree node配列から指定root配下のsubtreeを取り出す。 | なし |
| `togostanza-utils/lib/graph` | `asGraph()` | node / edge dataをgraph objectへ変換する。 | なし |
| `togostanza-utils/spinner.png` | image asset | package asset import対象。 | asset解決対象 |

`Data.asTree()` が返す `Tree` objectは `.data` と `.asD3Hierarchy()` を持つ。`Data.asGraph()` が返す `Graph` objectは `.data`、`.nodes`、`.edges` を持つ。

## 実プロジェクト利用箇所

`references/metastanza` で利用を確認した。`references/togomedium-web` での直接利用は確認していない。

| API / import | 利用箇所 | 調査観点 | 判断材料 |
| ---- | ---- | ---- | ---- |
| `loadData` from `togostanza-utils/load-data` | `barchart`, `linechart`, `piechart`, `scorecard`, `scatterplot`, `tree`, `pagination-table`, `scroll-table`, `hash-table` | fetch type、loading UI、キャッシュ、timeout、SPARQL/CSV/TSV/JSON変換、 `__togostanza_id__` 付与 | metastanzaで直接利用 |
| `appendCustomCss` from `togostanza-utils` | `text`, `scorecard`, `scroll-table` など | shadow root内のcustom stylesheet link差し替え | metastanzaで直接利用 |
| download menu helpers from `togostanza-utils` | chart系stanza | SVG/PNG/JSON/CSV/TSVのdownload menu itemと `stanza.root` / CSS参照 | metastanzaで直接利用 |
| `applyFilter` from `togostanza-utils/apply-filter` | `scatterplot` | filter DSLとdata processing | metastanzaで直接利用 |
| `spinner.png` | `text` | package asset import | metastanzaで直接利用、007のasset resolution観測対象 |

`applyFilter`、`Data` class、`togostanza-utils/data`、`asTree`、`asGraph`、`asD3Hierarchy`、`selectSubTree` はTogoStanza接点を持たない。これらはpackage単体で完結するAPIとして扱い、リメイク版runtimeの互換検証対象にはしない。

ただし、`togostanza-utils/apply-filter` は `references/metastanza` の `scatterplot` で直接importされている。無変更移行の範囲では、挙動互換対象にしない場合でもimport pathの解決は維持する。

## 現行版構造への依存

`togostanza-utils` は純粋関数だけのパッケージではなく、現行TogoStanza runtimeの構造を前提にするcompanion utilityとして振る舞う。

- `stanza.root` をshadow rootとして扱う。
- `stanza.root.querySelector("main")` をloading/error UIの挿入先にする。
- shadow root内の `style` と `link[rel="stylesheet"]` をSVG/PNG download用に読む。
- `root.host.stanzaInstance.element` からhost elementのcomputed styleを取る。
- `menu()` が返す `{ type, label, handler }` itemをruntime menu UIが扱う前提を持つ。
- `appendCustomCss()` はshadow root内の `link[data-togostanza-custom-css]` を差し替える。

## 観測されたimportパス

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`

## remake方針に渡す実行時依存

`togostanza-utils` を無変更で使う場合、remake runtimeには以下の実行時依存が発生する。

- `stanza.root` はshadow rootとしてDOM APIを提供する。
- shadow root内に `main` があり、loading/error/custom DOMの挿入先として使える。
- shadow root内にgenerated CSS用の `style` または `link[rel="stylesheet"]` が存在する。
- `stanza.element` はhost custom elementを指す。
- `stanza.root.host.stanzaInstance.element` はhost custom elementを指す。
- `menu()` が返す `{ type, label, handler }` と `{ type: "divider" }` をruntime menuが扱える。

`root.host.stanzaInstance.element` は内部構造依存である。これをremake側で受け入れるかどうかは、`togostanza-utils` のdrop-in互換を採用する場合の判断事項として扱う。

## 次の調査手順

1. `workbench/cases/010-togostanza-utils-compat` で、`loadData` / `appendCustomCss` / download menu helpersの最小ケース入力を現行版で観測する。
2. `loadData` の対象はJSON/CSV/TSV/SPARQL results JSON、loading UI、error UI、 `__togostanza_id__` 、cache同一性とする。
3. `appendCustomCss` の対象は既存custom CSS linkの削除と新規link追加とする。
4. download menu helpersの対象は `menu()` item contract、SVG/PNG/JSON/CSV/TSV handlerとする。
5. `spinner.png` は007のpackage asset import観測に含め、関数APIとは分離する。

## 未解決事項

- `togostanza-utils` をremake monorepo内の別パッケージとして維持するか、shimとして提供するか。
- download menu helpersのSVG/PNG出力が現行runtime menuとどこまで一致すべきか。
- TogoStanza接点があるAPIのedge caseをどこまで受け入れ検証に含めるか。
