# リポジトリメモ: togostanza-utils

確認日: 2026-06-22
再確認日: 2026-06-25

`togostanza-utils` の関数APIを、TogoStanza remakeの互換性判断材料として扱うための別調査ログ。

## 調査の位置づけ

- 参照元:
  - `references/metastanza/package.json`
  - `references/metastanza/node_modules/togostanza-utils`
- 追加参照元:
  - `references/togostanza-utils` commit `daaf62cfa254abcecdae3b4a41cbe6121c47db22`
- 再確認した実体:
  - `references/togostanza-utils`
  - `references/metastanza/node_modules/togostanza-utils`
  - 上記2つの `package.json`、`index.js`、`load-data.js` は一致した。
- 目的: `togostanza-utils` の公開APIを一覧化し、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIと、package単体で完結する純粋なデータ処理APIを切り分ける。
- この調査ログでは採用判断を確定しない。 `togostanza-utils` をdrop-in互換対象に含めるかどうかの判断は、[リメイク方針](../../spec/remake-policy.md) に記録する。
- 調査上の前提: `togostanza-utils` には手を入れず、既存パッケージがそのまま動くかどうかを先に確認する。
- この調査は `007-config-and-resolution` のpackage asset importとは別に扱う。
  - `import spinner from "togostanza-utils/spinner.png"` はasset resolutionの問題として007の観測要件に含める。
  - `loadData` や `appendCustomCss` などの関数挙動は、この別調査で扱う。
- `package.json` に `exports` fieldはない。そのため、サブパスはpackage exportsではなく、実ファイルパス解決として棚卸しする。

## API inventory

`references/togostanza-utils` で確認した公開対象を記録する。TogoStanza接点があるAPIはリメイク版runtimeの互換検証対象にする。TogoStanza接点がないAPIは、package単体の責務として扱い、リメイク版runtimeの互換検証対象にはしない。

| import path | export / asset | 主な挙動 | 分類 |
| ---- | ---- | ---- | ---- |
| `togostanza-utils` | `dividerMenuItem()` | runtime menu用の `{ type: "divider" }` を返す。 | runtime menu contract接点あり |
| `togostanza-utils` | `downloadSvgMenuItem()` | SVG download用の `{ type: "item", label, handler }` を返し、handlerが `stanza.root`、shadow root内 `style` / `link[rel="stylesheet"]`、`root.host.stanzaInstance.element` を参照する。 | runtime menu contract接点あり、TogoStanza runtime/API接点あり、生成DOM構造接点あり |
| `togostanza-utils` | `downloadPngMenuItem()` | PNG download用の `{ type: "item", label, handler }` を返し、handlerが `stanza.root`、shadow root内 `style` / `link[rel="stylesheet"]`、`root.host.stanzaInstance.element` を参照する。 | runtime menu contract接点あり、TogoStanza runtime/API接点あり、生成DOM構造接点あり |
| `togostanza-utils` | `downloadJSONMenuItem()` | JSON download用の `{ type: "item", label, handler }` を返す。handlerはdocument bodyへdownload linkを一時追加する。 | runtime menu contract接点あり |
| `togostanza-utils` | `downloadCSVMenuItem()` | CSV download用の `{ type: "item", label, handler }` を返す。handlerはdocument bodyへdownload linkを一時追加する。 | runtime menu contract接点あり |
| `togostanza-utils` | `downloadTSVMenuItem()` | TSV download用の `{ type: "item", label, handler }` を返す。handlerはdocument bodyへdownload linkを一時追加する。 | runtime menu contract接点あり |
| `togostanza-utils` | `appendCustomCss()` | `stanza.root` 内の既存 `link[data-togostanza-custom-css]` を削除し、指定URLのstylesheet linkを追加する。 | TogoStanza runtime/API接点あり、生成DOM構造接点あり |
| `togostanza-utils/load-data` | default `loadData()` | JSON、CSV、TSV、SPARQL results JSON、Elasticsearch、textを読み込み、`mainElement` へのloading / error DOM、timeout、limit / offset、cache、`__togostanza_id__` 付与を扱う。 | 生成DOM構造接点あり |
| `togostanza-utils/load-data` | `showLoadingIcon()` | 渡されたelementへloading DOMを追加し、elementのrootへ `style#spinner-css` を追加する。 | 生成DOM構造接点あり |
| `togostanza-utils/load-data` | `hideLoadingIcon()` | `style#spinner-css` と `#metastanza-loading-icon-div` を削除する。 | 生成DOM構造接点あり |
| `togostanza-utils/apply-filter` | default `applyFilter()` | `substring`、`lte`、`gte` のfilterを適用し、未対応filter typeではエラーにする。 | 純粋データ処理でTogoStanza接点なし |
| `togostanza-utils/data` | `Data` class | `Data.load()`、`.data`、`.asTree()`、`.asGraph()` を提供する。`Data.load()` は内部で `loadData()` を呼ぶため、`mainElement` を渡す使い方ではloading / error DOMに波及する。 | `Data.load()` は生成DOM構造接点を持ち得る。`Data` import path自体は実プロジェクト直接利用なし。tree / graph変換は純粋データ処理 |
| `togostanza-utils/lib/tree` | `asTree()` | flat dataをtree node配列へ変換する。 | 純粋データ処理でTogoStanza接点なし |
| `togostanza-utils/lib/tree` | `asD3Hierarchy()` | tree node配列をD3 hierarchyへ変換する。 | 純粋データ処理でTogoStanza接点なし |
| `togostanza-utils/lib/tree` | `selectSubTree()` | tree node配列から指定root配下のsubtreeを取り出す。 | 純粋データ処理でTogoStanza接点なし |
| `togostanza-utils/lib/graph` | `asGraph()` | node / edge dataをgraph objectへ変換する。 | 純粋データ処理でTogoStanza接点なし |
| `togostanza-utils/spinner.png` | image asset | package asset import対象。 | package asset解決対象 |
| `togostanza-utils/params/data-chart.json` | JSON asset | `stanza:include` で参照できる共通パラメーター定義の例。現行 `togostanza` docsに例がある。 | package asset解決対象。ただし `stanza:include` の採用判断は別follow-up |

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
| `togostanza-utils/params/data-chart.json` | 直接利用なし。現行 `togostanza` docsの `stanza:include` 例で確認 | package内JSON asset / include解決 | 実プロジェクトでの利用は未確認。`stanza:include` follow-upで扱う |

`references/metastanza` と `references/togomedium-web` では、`togostanza-utils/data`、`togostanza-utils/lib/tree`、`togostanza-utils/lib/graph` の直接importは確認していない。

`applyFilter`、`Data.asTree()`、`Data.asGraph()`、`asTree`、`asGraph`、`asD3Hierarchy`、`selectSubTree` はTogoStanza接点を持たない。これらはpackage単体で完結するAPIとして扱い、リメイク版runtimeの互換検証対象にはしない。

`Data.load()` は内部で `loadData()` を呼び、`mainElement` が渡される場合はloading / error DOMへ波及する。ただし実プロジェクトで `togostanza-utils/data` の直接importは見つかっていないため、runtime互換契約としては `togostanza-utils/load-data` の直接利用を対象にする。

ただし、`togostanza-utils/apply-filter` は `references/metastanza` の `scatterplot` で直接importされている。無変更移行の範囲では、挙動互換対象にしない場合でもimport pathの解決は維持する。

## 現行版構造への依存

`togostanza-utils` は純粋関数だけのパッケージではなく、現行TogoStanza runtimeの構造を前提にするcompanion utilityとして振る舞う。

- `stanza.root` をshadow rootとして扱う。
- `stanza.root.querySelector("main")` をloading/error UIの挿入先にする。
- shadow root内の `style` と `link[rel="stylesheet"]` をSVG/PNG download用に読む。
- `root.host.stanzaInstance.element` からhost elementのcomputed styleを取る。
- `menu()` が返す `{ type, label, handler }` itemをruntime menu UIが扱う前提を持つ。
- `appendCustomCss()` はshadow root内の `link[data-togostanza-custom-css]` を差し替える。
- `showLoadingIcon()` / `hideLoadingIcon()` と `loadData()` は、渡された `mainElement` にloading / error DOMを出し、`mainElement.getRootNode()` へ `style#spinner-css` を追加する。

## 観測されたimport / package path

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`
- `togostanza-utils/params/data-chart.json`（実プロジェクト直接利用ではなく、現行docsの `stanza:include` 例）

`references/metastanza` / `references/togomedium-web` の実プロジェクト直接利用としては、`togostanza-utils/apply-filter` 以外に「挙動互換対象外だがimport path解決は維持すべき」サブパスは見つかっていない。

`togostanza-utils/params/data-chart.json` は直接importではないが、package内JSONをmetadata includeで解決する例として確認した。`stanza:include` の扱いは別follow-upで未確定なので、この調査では `togostanza-utils` 関数API互換とは分ける。

## remake方針に渡す実行時依存

`togostanza-utils` を無変更で使う場合、remake runtimeには以下の実行時依存が発生する。

- `stanza.root` はshadow rootとしてDOM APIを提供する。
- shadow root内に `main` があり、loading/error/custom DOMの挿入先として使える。
- shadow root内にgenerated CSS用の `style` または `link[rel="stylesheet"]` が存在する。
- `stanza.element` はhost custom elementを指す。
- `stanza.root.host.stanzaInstance.element` はhost custom elementを指す。
- `menu()` が返す `{ type, label, handler }` と `{ type: "divider" }` をruntime menuが扱える。

`root.host.stanzaInstance.element` は内部構造依存である。これをremake側で受け入れるかどうかは、`togostanza-utils` のdrop-in互換を採用する場合の判断事項として扱う。

## 再確認結果

2026-06-25の再確認では、現在の互換対象分類は概ね妥当だった。修正が必要な点は、棚卸し精度の補足であり、`togostanza-utils` 全API互換へ戻す根拠は見つかっていない。

- `togostanza-utils/load-data` にはdefault exportの `loadData()` だけでなく、named exportの `showLoadingIcon()` / `hideLoadingIcon()` がある。
- `Data.load()` は内部で `loadData()` を呼ぶため、`mainElement` を渡す場合はloading / error DOMに波及する。ただし、実プロジェクトで `togostanza-utils/data` の直接importは確認していない。
- `togostanza-utils/params/data-chart.json` は現行 `togostanza` docsに `stanza:include` のpackage解決例として出てくる。これは関数API互換ではなく、`stanza:include` とpackage JSON asset解決の追加調査対象として扱う。
- `references/metastanza` / `references/togomedium-web` で直接importされる挙動互換対象外サブパスは、`togostanza-utils/apply-filter` だけだった。

仕様変更候補:

- [リメイク版仕様](../../spec/index.md) と [リメイク方針](../../spec/remake-policy.md) の `togostanza-utils` 節は、現時点では意味変更不要。
- 表現精度を上げるなら、`Data` class全体を純粋データ処理APIと呼ぶのではなく、実プロジェクト直接利用がないため `togostanza-utils/data` import pathをruntime互換対象から外す、と書き分ける候補がある。
- `stanza:include` を維持する判断になった場合は、`togostanza-utils/params/data-chart.json` のようなpackage内JSON解決を `stanza:include` の仕様または移行メモで扱う。
- `togostanza-utils/data` をshimで提供する判断になった場合でも、tree / graph helperの挙動互換ではなく、最低限のimport path提供と `Data.load()` が `loadData()` を呼べることを分けて扱う。

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
