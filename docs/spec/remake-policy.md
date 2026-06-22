# リメイク方針

この文書では、現行版調査をもとに、TogoStanzaリメイク版で何を維持し、何を再設計し、何を破棄するかを記録する。

現行版調査の生メモはここに記録しない。それらは `docs/investigation/` に置く。

リメイク版そのものの仕様入口は [リメイク版仕様](./index.md) に置く。この文書は、最終仕様ではなく、仕様化する前の採用判断と互換性方針を扱う。

## 目的

この文書には、新実装に関する判断を記録する。観測された旧挙動を維持、再設計、破棄のどれとして扱うかといった判断を扱う。

互換性方針の基本は [プロジェクト憲章](../project-charter.md) に従う。用語の定義は [用語集](../UBIQUITOUS_LANGUAGE.md) を参照する。

## 現在の状態

この文書は、現行版調査と仕様判断の結果を受けて、リメイク版で採用する方針を記録する。

現行版の観測結果そのものは `docs/investigation/` に置き、この文書ではリメイク版での判断だけを扱う。実装が進み、リメイク版単体の外部契約として確定した内容は、[リメイク版仕様](./index.md) へ移す。

## 互換性判断

互換性判断は、**利用契約** と **開発契約** の契約単位で行う。立ち位置そのものに優先順位は置かない。

同じ現行挙動でも、**利用契約** では `必須`、**開発契約** では `再設計` のように、契約ごとに別の判断を置ける。

### 判断カテゴリ

| カテゴリ | 意味 |
| -------- | ---- |
| `必須` | 対象契約としてリメイク版でも維持する。 |
| `再設計` | 目的は維持するが、形は変更する。理由、影響範囲、移行メモ、Stanza開発者向けの修正手順を記録する。 |
| `破棄` | リメイク版には持ち込まない。根拠、影響範囲、代替がある場合は代替方針を記録する。 |
| `機能改善` | 既存の正しい入力や主要契約を壊さず、開発体験、診断、安全性、品質を改善する。今回の主目的ではないため、必要性が明確なものだけ採用する。 |

### 契約別の方針

**利用契約** では、既存ページのHTML埋め込みに関わる契約を壊さないことを重視する。custom element名、属性、データ連携、Webサイト上での表示や操作に影響する変更は、原則 `必須` として扱うか、変更理由と移行手順を伴う `再設計` として扱う。

**開発契約** では、既存Stanzaソースを中心に維持する。CLI、build環境、依存関係、コマンド体系は再設計できるが、既存Stanzaソースに小規模な手修正が必要になる場合は `再設計` として移行メモを残す。

### 実プロジェクトの扱い

**実プロジェクト群** は、互換性判断の強い根拠として扱う。ただし絶対互換対象とはしない。

**metastanza** は可能な限り固定点として扱うが、must ではない。外れる判断をする場合は、理由と影響範囲を記録する。

**TogoMedium Stanza** は、検証と発見のための実プロジェクトとして扱う。作者側で調整可能な前提があるため、必要なソース修正や移行手順も判断材料に含める。

## 対象範囲

リメイク版の互換対象は、現行版 TogoStanza 3 系の Stanza repository と Stanza source とする。

現行版よりさらに古い構成は対象外とする。現行版の `upgrade` command が扱っていた旧構成からの自動変換は提供しない。

開発・検証・ドキュメント上の標準 Node.js は Node 24 LTS とする。ライブラリとして広く配布する段階で、必要があれば engines の下限は改めて見直す。

build / serve の内部基盤は Vite 8 を基本にする。Broccoli、Rollup、Vue は内部実装上の必須要件にしない。

## Runtime

### 埋め込み形式

`type="module"` script と `<togostanza-{id}>` custom element による埋め込み形式は、**利用契約**として `必須` とする。

- Stanza の公開 runtime artifact は、ブラウザから module script として読み込める。
- custom element 名は `metadata["@id"]` から `togostanza-{id}` として定義する。
- help preview の実装や UI は runtime 埋め込み形式とは別物として扱う。

Stanza の Web Component は、一般的な Web サイトへ直接埋め込めることを前提にする。埋め込み先 Web サイトに、Vite、React、Vue、npm install、追加 build step などを要求しない。

Stanza 内部で framework を使う場合も、必要な runtime は Stanza の配布物側に含める。bundle size が多少増えても、埋め込み容易性を優先する。

1つの `{id}.js` が完全な単一ファイルであることまでは要求しない。`dist/` 配下の `{id}.js` と共有 chunk 一式で自己完結し、静的ホスティング上で相対 import により動けばよい。

### Shadow DOM

custom element は shadow root を使う。shadow root は現行通り `open` とする。

Stanza ごとの CSS は shadow root 内に適用する。

外部ページが shadow DOM 内部を直接 query して触る使い方は、**利用契約**としては保証しない。

一方で、Stanza source 内からの `this.root` と `this.root.querySelector("main")` は、実プロジェクトで強く使われているため、**開発契約**として `必須` とする。`main.parentNode` や `togostanza--menu` の詳細 DOM 形状は必須互換にしないが、実プロジェクトの regression test で重点確認する。

### Parameter

`this.params` は、metadata の `stanza:parameter` と `stanza:type` に基づき、HTML attributes を Stanza source から扱う値へ変換する。

boolean parameter は HTML boolean attribute として扱い、属性の有無で判定する。

- 属性あり: `true`
- 属性なし: `false`
- `flag="false"` のような文字列値は false 扱いしない。

この挙動は **利用契約**として `必須` とする。

boolean 以外の `stanza:type` の詳細な変換規則は、この文書では細かく固定しない。現行版の観測結果をもとに、同等の動作を実装する。

### `this.query()`

method 未指定の `this.query()` は `POST` を既定 method とする。

旧ドキュメントの `GET` 説明は、現行実装とブラウザ観測に反するため誤記として扱う。

この挙動は、Stanza source から利用される **開発契約**として `必須` とする。

### Stanza 間連携

`togostanza--container` は Stanza 間連携の入口として維持する。

`togostanza--event-map` は概念を維持するが、現行の「送信元 selector を持たず、container 内の同名 outgoing event をすべて拾う」挙動は `再設計` 候補とする。再設計する場合は、現行 HTML からの移行メモを残す。

`togostanza--data-source` は、外部データを Stanza に渡す仕組みとしての目的は維持する。ただし、現行の blob URL 経由、`url` / `receiver` / `target-attribute` API は `再設計` 候補とする。再設計する場合は、現行 HTML からの移行メモを残す。

`togostanza--data-container` は旧ドキュメント内の誤記として扱い、custom element としては実装しない。判断カテゴリは `破棄` とする。

### Menu

`stanza:menu-placement` metadata key と `togostanza-menu_placement` attribute は維持する。placement によって menu 表示位置を変える目的も維持する。

`togostanza--menu` から辿れる `About this stanza` 相当の導線は維持する。この導線が参照する `${id}.html` の存在も維持する。

`${id}.html` の UI、DOM、preview 機能、snippet 生成の詳細は再設計可能とする。

`togostanza--menu` の内部 DOM 構造や見た目は `再設計` 可能とする。実プロジェクトで style が当たっているため、見た目の regression test は重点的に行う。

## Stanza Source

既存 Stanza source は、可能な限り変更しない方針とする。

`import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` の形式は **開発契約**として `必須` とする。

次の API は既存 Stanza source 互換のため維持する。

- `this.params`
- `this.root`
- `this.element`
- `this.renderTemplate`
- `this.query`
- `this.importWebFontCSS`
- `this.handleAttributeChange`

`this.importWebFontCSS(cssUrl)` は、既存 Stanza source 互換のため維持する。link の注入先や重複制御などの詳細は、現行版の観測と実プロジェクトの regression test をもとに実装時に判断する。

`this.handleAttributeChange(name, oldValue, newValue)` は、custom element attribute 変更時の lifecycle hook として維持する。既定の再描画や debounce などの内部スケジューリング詳細は、この文書では固定しない。

### `togostanza-utils`

`references/metastanza` が直接利用している `togostanza-utils` API / import path は、少なくとも drop-in 互換対象として扱う。

理想形は、`togostanza-utils` package 自体に手を入れず、既存 package がそのまま動くことである。そのために必要な runtime compatibility は、実プロジェクト調査と追加 workbench 検証ケースで観測する。

`root.host.stanzaInstance.element` のような現行 runtime 内部構造への依存は、通常は公開 API として望ましくない。ただし、`togostanza-utils` の drop-in 互換のために必要な範囲では、remake runtime 側の compat property として受け入れる。

対象範囲の初期候補は次の通り。

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`

Handlebars template は維持する。

- `templates/*.hbs` は build 入力として扱う。
- `this.renderTemplate({ template, parameters })` を維持する。
- 内部 compiler や bundler は変更してよい。

Stanza entrypoint は `index.js`、`index.ts`、`index.tsx` を受ける。TypeScript / JSX / TSX の build は **開発契約**として維持する。

Stanza stylesheet は `style.scss` を正とする。`stanza.scss` は旧ドキュメントの誤記として扱い、特別な互換処理はしない。必要なら migration note で `style.scss` への rename を案内する。

`metadata["@id"]` と Stanza directory 名は一致必須とする。不一致の現行挙動は想定外として扱い、リメイク版では検出時または build 時に分かりやすい error にしてよい。

## 生成物

runtime 用の主要 artifact 配置は **利用契約**として維持する。

- `${id}.js`
- `${id}.css`
- `${id}.html`
- `${id}/metadata.json`
- `${id}/assets/*`
- repository root の `assets/` から `dist/assets/` へのコピー

`${id}.js.map` は開発支援寄りの生成物として扱い、必須互換までは置かない。

`index.html`、`-togostanza/help-app.js` などの help preview 側生成物は `再設計` 可能とする。`${id}.html` は menu の About 導線から参照されるため存在は維持するが、内容は再設計可能とする。

既存 Stanza source からの asset import が壊れないことも開発契約として見る。ただし、data URL inline、別ファイル emit、hash 名、size threshold などの asset 処理詳細は実装時に判断する。

## CLI

主要 command 名と短縮 alias は入口として維持する。ただし内部挙動、出力文言、help UI、generator の詳細は再設計可能とする。

- `togostanza build` / `togostanza b`
- `togostanza serve` / `togostanza s`
- `togostanza init`
- `togostanza generate stanza` / `togostanza g stanza`

`build --output-path` と `serve --port` は維持候補として扱う。

`togostanza upgrade` は `破棄` とする。旧構成からの自動変換は提供しない。

CLI exit code は、成功時 `0`、失敗時 non-zero を維持する。細かい error code 分類は今回の仕様スコープでは扱わない。

## Scaffold と Generator

`togostanza init` は Stanza repository を作る入口として維持する。

生成内容は再設計可能だが、いたずらに変更しない。生成後に `build`、`serve`、`generate stanza` が自然に動くことを重視する。

`generate stanza` の生成物は、既存 Stanza source 互換を優先し、必要最小限の再設計に留める。

- `stanzas/{id}/metadata.json` は維持する。
- `index.js` は維持する。必要なら将来 `index.ts` / `index.tsx` 生成 option を追加する。
- `style.scss` は維持する。
- `templates/stanza.html.hbs` は維持する。
- `README.md` は維持候補とする。
- id の kebab-case 化は維持する。

## Configuration

現行の `togostanza-build.mjs/js` による Rollup plugin 注入は `再設計` とする。

現行版の有効な拡張点は基本的に `togostanza-build.mjs` として扱う。`togostanza-build.js` のような近い名前のファイルが存在しても、現行版で有効だったとは限らない。

実プロジェクトでは `metastanza` の `togostanza-build.mjs` が確認されている。`TogoMedium Stanza` の `togostanza-build.js` は存在するが、現行版で実際に有効だったかは区別して扱う。

新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。

`defineTogoStanzaConfig()` を提供し、TogoStanza 専用設定を中心にする。必要な範囲で Vite plugin や Vite config を渡せる escape hatch を用意する。

旧 `togostanza-build.mjs/js` を無条件に実行しない。検出した場合は、現行版で有効だった可能性を踏まえて、分かりやすい warning または error を出し、migration note で移行先を案内する。

## Framework

React / TSX は `TogoMedium Stanza` 互換のため重点対応する。

Vue は `metastanza` 互換のため重点対応する。

Svelte など、旧ドキュメントに例はあるが実プロジェクトで未確認の framework support は、今回の必須仕様にしない。必要なら改善案または follow-up として扱う。

## 機能改善の扱い

今回の主スコープは、互換維持と基盤更新であり、強い機能改善ではない。

維持がシンプルで不具合がないものは維持する。改善目的だけの変更は主スコープにしない。

`機能改善` として採用するのは、必要性が明確なものに限る。

- Vite 8 / Node 24 化に伴って自然に必要になるもの。
- 既存挙動が明確に壊れやすいもの。
- エラーが分かりにくく、調査や移行を阻害するもの。
- `metadata["@id"]` と directory 名不一致のように、想定外扱いが確定したものを明示 error にするもの。

非採用になる可能性が高い改善案も、判断材料として `docs/investigation/follow-ups.md` に残す。

## 今後扱う項目

- migration note の具体化。
- Vite 8 実装設計。
- `togostanza.config.ts` の具体 schema。
- 実プロジェクト regression test の設計。
- help preview の再設計範囲。
