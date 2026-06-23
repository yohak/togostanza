# リポジトリメモ: togostanza-utils

確認日: 2026-06-22

`togostanza-utils` の関数APIを、TogoStanza remakeの互換性判断材料として扱うための別調査ログ。

## 調査の位置づけ

- 参照元:
  - `references/metastanza/package.json`
  - `references/metastanza/node_modules/togostanza-utils`
- 追加参照元:
  - `references/togostanza-utils` commit `daaf62cfa254abcecdae3b4a41cbe6121c47db22`
- 目的: 実プロジェクトで使われている `togostanza-utils` APIを一覧化し、既存パッケージをそのまま利用する場合に必要な実行時依存と、ケース入力/観測補助候補を切り分ける。
- この調査ログでは採用判断を確定しない。 `togostanza-utils` をdrop-in互換対象に含めるかどうかの判断は、[リメイク方針](../../spec/remake-policy.md) に記録する。
- 調査上の前提: `togostanza-utils` には手を入れず、既存パッケージがそのまま動くかどうかを先に確認する。
- この調査は `007-config-and-resolution` のpackage asset importとは別に扱う。
  - `import spinner from "togostanza-utils/spinner.png"` はasset resolutionの問題として007の観測要件に含める。
  - `loadData` や `appendCustomCss` などの関数挙動は、この別調査で扱う。

## 実プロジェクト利用箇所

`references/metastanza` で利用を確認した。`references/togomedium-web` での直接利用は確認していない。

| API / import | 利用箇所 | 調査観点 | 判断材料 |
| ---- | ---- | ---- | ---- |
| `loadData` from `togostanza-utils/load-data` | `barchart`, `linechart`, `piechart`, `scorecard`, `scatterplot`, `tree`, `pagination-table`, `scroll-table`, `hash-table` | fetch type、loading UI、キャッシュ、timeout、SPARQL/CSV/TSV/JSON変換、 `__togostanza_id__` 付与 | metastanzaで直接利用 |
| `appendCustomCss` from `togostanza-utils` | `text`, `scorecard`, `scroll-table` など | shadow root内のcustom stylesheet link差し替え | metastanzaで直接利用 |
| download menu helpers from `togostanza-utils` | chart系stanza | SVG/PNG/JSON/CSV/TSVのdownload menu itemと `stanza.root` / CSS参照 | metastanzaで直接利用 |
| `applyFilter` from `togostanza-utils/apply-filter` | `scatterplot` | filter DSLとdata processing | metastanzaで直接利用 |
| `spinner.png` | `text` | package asset import | metastanzaで直接利用、007のasset resolution観測対象 |

`Data` class、 `togostanza-utils/data` 、 `asTree` 、 `asGraph` 、 `asD3Hierarchy` は、 `references/metastanza` のsourceでは直接利用を確認していない。直接利用はないが、パッケージとして提供されているAPIなので、採用判断範囲に含めるかは別途判断する。

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

`togostanza-utils` を無変更で使う案を検討する場合、remake runtimeには以下の実行時依存が発生する。

- `stanza.root` はshadow rootとしてDOM APIを提供する。
- shadow root内に `main` があり、loading/error/custom DOMの挿入先として使える。
- shadow root内にgenerated CSS用の `style` または `link[rel="stylesheet"]` が存在する。
- `stanza.element` はhost custom elementを指す。
- `stanza.root.host.stanzaInstance.element` はhost custom elementを指す。
- `menu()` が返す `{ type, label, handler }` と `{ type: "divider" }` をruntime menuが扱える。

`root.host.stanzaInstance.element` は内部構造依存である。これをremake側で受け入れるかどうかは、`togostanza-utils` のdrop-in互換を採用する場合の判断事項として扱う。

## 次の調査手順

1. `loadData` の最小ケース入力と観測補助を作る。対象はJSON/CSV/TSV/SPARQL results JSON、loading UI、error UI、 `__togostanza_id__` 。
2. `appendCustomCss` の最小ケース入力と観測補助を作る。対象は既存custom CSS linkの削除と新規link追加。
3. download menu helpersの最小ケース入力と観測補助を作る。対象は `menu()` item contract、SVG/PNG/JSON/CSV/TSV handler。
4. `applyFilter` はpure utilityとして小さなunit観測で足りるか判断する。
5. `spinner.png` は007のpackage asset import観測に含め、関数APIとは分離する。

## 未解決事項

- `togostanza-utils` をremake monorepo内の別パッケージとして維持するか、shimとして提供するか。
- download menu helpersのSVG/PNG出力が現行runtime menuとどこまで一致すべきか。
- `Data` class、graph/tree helperを、metastanzaで直接利用がなくても採用判断範囲に含めるか。
