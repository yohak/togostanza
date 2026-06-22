# リポジトリメモ: togostanza-utils

確認日: 2026-06-22

`togostanza-utils` の関数 API を、TogoStanza remake の互換対象として扱うための別調査ログ。

## 調査の位置づけ

- 参照元:
  - `references/metastanza/package.json`
  - `references/metastanza/node_modules/togostanza-utils`
- 追加参照元:
  - `references/togostanza-utils` commit `daaf62cfa254abcecdae3b4a41cbe6121c47db22`
- 目的: 実プロジェクトで使われている `togostanza-utils` API を inventory 化し、drop-in 互換に必要な runtime contract と fixture 候補を切り分ける。
- 判断: `references/metastanza` が直接利用している `togostanza-utils` API / import path は、少なくとも drop-in 互換必須として扱う。
- 方針: `togostanza-utils` には手を入れず、既存 package がそのまま動くように remake runtime 側で旧構造互換を提供する。
- この調査は `007-config-and-resolution` の package asset import とは別に扱う。
  - `import spinner from "togostanza-utils/spinner.png"` は asset resolution の問題として 007 の観測要件に含める。
  - `loadData` や `appendCustomCss` などの関数挙動は、この別調査で扱う。

## 実プロジェクト利用箇所

`references/metastanza` で利用を確認した。`references/togomedium-web` では直接利用は確認していない。

| API / import | 利用箇所 | 調査観点 | 分類 |
| ---- | ---- | ---- | ---- |
| `loadData` from `togostanza-utils/load-data` | `barchart`, `linechart`, `piechart`, `scorecard`, `scatterplot`, `tree`, `pagination-table`, `scroll-table`, `hash-table` | fetch type、loading UI、cache、timeout、SPARQL/CSV/TSV/JSON 変換、`__togostanza_id__` 付与 | drop-in 互換必須 |
| `appendCustomCss` from `togostanza-utils` | `text`, `scorecard`, `scroll-table` など | Shadow root 内の custom stylesheet link 差し替え | drop-in 互換必須 |
| download menu helpers from `togostanza-utils` | chart 系 stanza | SVG/PNG/JSON/CSV/TSV download menu item と `stanza.root` / CSS 参照 | drop-in 互換必須 |
| `applyFilter` from `togostanza-utils/apply-filter` | `scatterplot` | filter DSL と data processing | drop-in 互換必須 |
| `spinner.png` | `text` | package asset import | drop-in 互換必須 / 007 の asset resolution 観測対象 |

`Data` class / `togostanza-utils/data`、`asTree`、`asGraph`、`asD3Hierarchy` は `references/metastanza` の source では直接利用を確認していない。直接利用はないが、package として提供されている API なので、互換範囲に含めるかは別途判断する。

## 現行版構造への依存

`togostanza-utils` は純粋関数だけの package ではなく、現行 TogoStanza runtime の構造を前提にする companion utility として振る舞う。

- `stanza.root` を shadow root として扱う。
- `stanza.root.querySelector("main")` を loading / error UI の挿入先にする。
- shadow root 内の `style` と `link[rel="stylesheet"]` を SVG / PNG download 用に読む。
- `root.host.stanzaInstance.element` から host element の computed style を取る。
- `menu()` が返す `{ type, label, handler }` item を runtime menu UI が扱う前提を持つ。
- `appendCustomCss()` は shadow root 内の `link[data-togostanza-custom-css]` を差し替える。

## drop-in 互換で維持する import path

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`

## remake 側で維持する compat contract

`togostanza-utils` を無変更で使うため、remake runtime では以下を compat contract として維持する。

- `stanza.root` は shadow root として DOM API を提供する。
- shadow root 内に `main` があり、loading / error / custom DOM の挿入先として使える。
- shadow root 内に generated CSS 用の `style` または `link[rel="stylesheet"]` が存在する。
- `stanza.element` は host custom element を指す。
- `stanza.root.host.stanzaInstance.element` は host custom element を指す。
- `menu()` が返す `{ type, label, handler }` と `{ type: "divider" }` を runtime menu が扱える。

`root.host.stanzaInstance.element` は内部構造依存だが、`togostanza-utils` の drop-in 互換を優先し、remake 側の compat property として受け入れる。

## 次の調査手順

1. `loadData` の最小 fixture 候補を作る。対象は JSON / CSV / TSV / SPARQL results JSON、loading UI、error UI、`__togostanza_id__`。
2. `appendCustomCss` の最小 fixture 候補を作る。対象は既存 custom CSS link の削除と新規 link 追加。
3. download menu helpers の最小 fixture 候補を作る。対象は `menu()` item contract、SVG / PNG / JSON / CSV / TSV handler。
4. `applyFilter` は pure utility として小さい unit fixture で足りるか判断する。
5. `spinner.png` は 007 の package asset import 観測に含め、関数 API とは分離する。

## 未解決事項

- `togostanza-utils` を remake monorepo 内の別 package として維持するか、shim として提供するか。
- download menu helpers の SVG / PNG 出力が現行 runtime menu とどこまで一致すべきか。
- `Data` class / graph / tree helper を、metastanza 直接利用がなくても drop-in 互換範囲に含めるか。
