# リポジトリメモ: togostanza-utils

確認日: 2026-06-22

`togostanza-utils` の関数 API を、TogoStanza remake の互換対象に含めるか判断するための別調査ログ。

## 調査の位置づけ

- 参照元:
  - `references/metastanza/package.json`
  - `references/metastanza/node_modules/togostanza-utils`
- 目的: 実プロジェクトで使われている `togostanza-utils` API を inventory 化し、migration note で足りるか、別 case が必要かを後段で判断する。
- この調査は `007-config-and-resolution` の package asset import とは別に扱う。
  - `import spinner from "togostanza-utils/spinner.png"` は asset resolution の問題として 007 の観測要件に含める。
  - `loadData` や `appendCustomCss` などの関数挙動は、この別調査で扱う。

## 実プロジェクト利用箇所

`references/metastanza` で利用を確認した。`references/togomedium-web` では直接利用は確認していない。

| API / import | 利用箇所 | 調査観点 | 分類候補 |
| ---- | ---- | ---- | ---- |
| `loadData` from `togostanza-utils/load-data` | `barchart`, `linechart`, `piechart`, `scorecard`, `scatterplot`, `tree`, `pagination-table`, `scroll-table`, `hash-table` | fetch type、loading UI、cache、timeout、SPARQL/CSV/TSV/JSON 変換、`__togostanza_id__` 付与 | 別調査 |
| `appendCustomCss` from `togostanza-utils` | `text`, `scorecard`, `scroll-table` など | Shadow root 内の custom stylesheet link 差し替え | migration note / case 候補 |
| download menu helpers from `togostanza-utils` | chart 系 stanza | SVG/PNG/JSON/CSV/TSV download menu item と `stanza.root` / CSS 参照 | migration note 候補 |
| `getStanzaColors` など graph helpers | chart 系 stanza | metadata style / CSS custom property と D3/Vega 表示の関係 | migration note 候補 |
| `applyFilter` from `togostanza-utils/apply-filter` | `scatterplot` | filter DSL と data processing | migration note 候補 |
| `spinner.png` | `text` | package asset import | 007 の asset resolution 観測対象 |

## 次の調査手順

1. `references/metastanza` の各 stanza で、`togostanza-utils` API が runtime 表示に直接影響する箇所を抽出する。
2. `loadData` について、TogoStanza 本体 API ではなく utility package として維持すべきかを分ける。
3. `appendCustomCss` について、`this.importWebFontCSS()` や通常 stylesheet link と重複する契約か、utility 固有の migration note で足りるかを判断する。
4. download menu helpers について、help/menu 生成物の再設計と切り離せるかを確認する。
5. fixture 化が必要な場合は、実プロジェクト全体ではなく、関数 API ごとに最小 case 候補を作る。

## 未解決事項

- `togostanza-utils` を remake 本体の互換契約に含めるか。
- `togostanza-utils` を別 package として維持または shim する必要があるか。
- `loadData` の data type 対応を TogoStanza remake 側で吸収するか、Stanza source migration note とするか。
- `appendCustomCss` を utility 互換として扱うか、Stanza source 側の通常 DOM 操作として migration note に留めるか。
