# リメイク方針

この文書では、現行版調査をもとに、TogoStanzaリメイク版で何を維持し、何を再設計し、何を破棄するかを記録する。

現行版調査の生メモはここに記録しない。それらは `docs/investigation/` に置く。

リメイク版そのものの仕様入口は [リメイク版仕様](./index.md) に置く。この文書は、最終仕様ではなく、仕様化する前の採用判断と互換性方針を扱う。

## 目的

この文書では、新実装に関する判断を記録する。観測された旧挙動を、維持、再設計、破棄のどれとして扱うかを示す。

互換性方針の基本は [プロジェクト憲章](../project-charter.md) に従う。用語の定義は [用語集](../UBIQUITOUS_LANGUAGE.md) を参照する。

## 現在の状態

この文書は、現行版調査と仕様判断の結果を受けて、リメイク版で採用する方針を記録する。

現行版の観測結果そのものは `docs/investigation/` に置き、この文書ではリメイク版での判断だけを扱う。実装が進み、リメイク版単体の外部契約として確定した内容は、[リメイク版仕様](./index.md) へ移す。

## 互換性判断

互換性判断は、**利用契約**と**開発契約**の契約単位で行う。立ち位置そのものに優先順位は置かない。

同じ現行挙動でも、**利用契約**では `必須`、**開発契約**では `再設計` のように、契約ごとに別の判断を置ける。

### 判断カテゴリ

| カテゴリ | 意味 |
| -------- | ---- |
| `必須` | 対象契約としてリメイク版でも維持する。 |
| `再設計` | 目的は維持するが、形は変更する。理由、影響範囲、移行メモ、Stanza開発者向けの修正手順を記録する。 |
| `破棄` | リメイク版には持ち込まない。根拠、影響範囲、代替がある場合は代替方針を記録する。 |
| `機能改善` | 既存の正しい入力や主要契約を壊さず、開発体験、診断、安全性、品質を改善する。今回の主目的ではないため、必要性が明確なものだけ採用する。 |

### 契約別の方針

**利用契約**では、既存ページのHTML埋め込みに関わる契約を壊さないことを重視する。custom element名、属性、データ連携、Webサイト上での表示や操作に影響する変更は、原則 `必須` として扱うか、変更理由と移行手順を伴う `再設計` として扱う。

**開発契約**では、既存Stanzaソースを中心に維持する。CLI、build環境、依存関係、コマンド体系は再設計できるが、既存Stanzaソースに小規模な手修正が必要になる場合は `再設計` として移行メモを残す。

### 実プロジェクトの扱い

**実プロジェクト群**は、互換性判断の強い根拠として扱う。ただし絶対互換対象とはしない。

**metastanza**は可能な限り固定点として扱うが、必須ではない。外れる判断をする場合は、理由と影響範囲を記録する。

**TogoMedium Stanza**は、検証と発見のための実プロジェクトとして扱う。作者側で調整可能な前提があるため、必要なソース修正や移行手順も判断材料に含める。

## 対象範囲

リメイク版の互換対象は、現行版TogoStanza 3系のStanzaリポジトリとStanzaソースとする。

現行版よりさらに古い構成は対象外とする。現行版の `upgrade` commandが扱っていた旧構成からの自動変換は提供しない。

開発・検証・ドキュメント上の標準Node.jsはNode 24 LTSとする。ライブラリとして広く配布する段階で、必要があればenginesの下限は改めて見直す。

`build` / `serve` の内部基盤はVite 8を基本にする。Broccoli、Rollup、Vueは内部実装上の必須要件にしない。

## Runtime

### 埋め込み形式

`type="module"` scriptと `<togostanza-{id}>` custom elementによる埋め込み形式は、**利用契約**として `必須` とする。

- Stanzaの公開ランタイム生成物は、ブラウザからmodule scriptとして読み込める。
- custom element名は `metadata["@id"]` から `togostanza-{id}` として定義する。
- ヘルププレビューの実装やUIは、ランタイム埋め込み形式とは別物として扱う。

StanzaのWeb Componentは、一般的なWebサイトへ直接埋め込めることを前提にする。埋め込み先Webサイトに、Vite、React、Vue、`npm install`、追加ビルド手順などを要求しない。

Stanza内部でframeworkを使う場合も、必要なランタイムはStanzaの配布物側に含める。bundle sizeが多少増えても、埋め込み容易性を優先する。

1つの `{id}.js` が完全な単一ファイルであることまでは要求しない。`dist/` 配下の `{id}.js` と共有チャンク一式で自己完結し、静的ホスティング上で相対importにより動けばよい。

### Shadow DOM

custom elementはshadow rootを使う。shadow rootは現行通り `open` とする。

StanzaごとのCSSはshadow root内に適用する。

外部ページがshadow DOM内部を直接queryして触る使い方は、**利用契約**としては保証しない。

一方で、Stanzaソース内からの `this.root` と `this.root.querySelector("main")` は、実プロジェクトで強く使われているため、**開発契約**として `必須` とする。`main.parentNode` や `togostanza--menu` の詳細DOM形状は必須互換にしないが、実プロジェクトのregression testで重点確認する。

### Parameter

`this.params` は、メタデータの `stanza:parameter` と `stanza:type` に基づき、HTML属性をStanzaソースから扱う値へ変換する。

booleanパラメーターはHTML boolean属性として扱い、属性の有無で判定する。

- 属性あり: `true`
- 属性なし: `false`
- `flag="false"` のような文字列値はfalse扱いしない。

この挙動は **利用契約**として `必須` とする。

boolean以外の `stanza:type` の詳細な変換規則は、この文書では細かく固定しない。現行版の観測結果をもとに、同等の動作を実装する。

### `this.query()`

method未指定の `this.query()` は `POST` を既定methodとする。

旧ドキュメントの `GET` 説明は、現行実装とブラウザ観測に反するため誤記として扱う。

この挙動は、Stanzaソースから利用される**開発契約**として `必須` とする。

### Stanza間連携

`togostanza--container` はStanza間連携の入口として維持する。

`togostanza--event-map` は概念を維持するが、現行の「送信元selectorを持たず、container内の同名送出イベントをすべて拾う」挙動は `再設計` 候補とする。再設計する場合は、現行HTMLからの移行メモを残す。

`togostanza--data-source` は、外部データをStanzaに渡す仕組みとしての目的は維持する。ただし、現行のblob URL経由、`url` / `receiver` / `target-attribute` APIは `再設計` 候補とする。再設計する場合は、現行HTMLからの移行メモを残す。

`togostanza--data-container` は旧ドキュメント内の誤記として扱い、custom elementとしては実装しない。判断カテゴリは `破棄` とする。

### Menu

`stanza:menu-placement` メタデータkeyと `togostanza-menu_placement` 属性は維持する。placementによってmenu表示位置を変える目的も維持する。

`togostanza--menu` から辿れる `About this stanza` 相当の導線は維持する。この導線が参照する `${id}.html` の存在も維持する。

`${id}.html` のUI、DOM、preview機能、snippet生成の詳細は再設計可能とする。

`togostanza--menu` の内部DOM構造や見た目は `再設計` 可能とする。実プロジェクトでstyleが当たっているため、見た目のregression testは重点的に行う。

## Stanza Source

既存のStanzaソースは、可能な限り変更しない方針とする。

`import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` の形式は**開発契約**として `必須` とする。

次のAPIは、既存Stanzaソース互換のため維持する。

- `this.params`
- `this.root`
- `this.element`
- `this.renderTemplate`
- `this.query`
- `this.importWebFontCSS`
- `this.handleAttributeChange`

`this.importWebFontCSS(cssUrl)` は、既存Stanzaソース互換のため維持する。linkの注入先や重複制御などの詳細は、現行版の観測と実プロジェクトのregression testをもとに実装時に判断する。

`this.handleAttributeChange(name, oldValue, newValue)` は、custom element属性変更時のlifecycle hookとして維持する。既定の再描画やdebounceなどの内部スケジューリング詳細は、この文書では固定しない。

### `togostanza-utils`

`references/metastanza` が直接利用している `togostanza-utils` API / import pathは、少なくともdrop-in互換対象として扱う。

理想形は、`togostanza-utils` package自体に手を入れず、既存packageがそのまま動くことである。そのために必要なruntime compatibilityは、実プロジェクト調査と追加workbench検証ケースで観測する。

`root.host.stanzaInstance.element` のような現行runtime内部構造への依存は、通常は公開APIとして望ましくない。ただし、`togostanza-utils` のdrop-in互換のために必要な範囲では、リメイク版runtime側のcompat propertyとして受け入れる。

対象範囲の初期候補は次の通り。

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`

Handlebars templateは維持する。

- `templates/*.hbs` はbuild入力として扱う。
- `this.renderTemplate({ template, parameters })` を維持する。
- 内部compilerやbundlerは変更してよい。

Stanza entrypointは `index.js`、`index.ts`、`index.tsx` を受ける。TypeScript / JSX / TSXのbuildは**開発契約**として維持する。

Stanza stylesheetは `style.scss` を正とする。`stanza.scss` は旧ドキュメントの誤記として扱い、特別な互換処理はしない。必要なら移行メモで `style.scss` へのrenameを案内する。

`metadata["@id"]` とStanzaディレクトリ名は一致必須とする。不一致の現行挙動は想定外として扱い、リメイク版では検出時またはビルド時に分かりやすいエラーにしてよい。

## 生成物

ランタイム用の主要生成物配置は**利用契約**として維持する。

- `${id}.js`
- `${id}.css`
- `${id}.html`
- `${id}/metadata.json`
- `${id}/assets/*`
- リポジトリルートの `assets/` から `dist/assets/` へのコピー

`${id}.js.map` は開発支援寄りの生成物として扱い、必須互換には置かない。

`index.html`、`-togostanza/help-app.js` などのヘルププレビュー側生成物は `再設計` 可能とする。`${id}.html` はmenuのAbout導線から参照されるため存在は維持するが、内容は再設計可能とする。

既存Stanzaソースからのasset importが壊れないことも開発契約として見る。ただし、data URL inline、別ファイルemit、hash名、size thresholdなどのasset処理詳細は実装時に判断する。

## CLI

主要command名と短縮aliasは入口として維持する。ただし内部挙動、出力文言、ヘルプUI、generatorの詳細は再設計可能とする。

- `togostanza build` / `togostanza b`
- `togostanza serve` / `togostanza s`
- `togostanza init`
- `togostanza generate stanza` / `togostanza g stanza`

`build --output-path` と `serve --port` は維持候補として扱う。

`togostanza upgrade` は `破棄` とする。旧構成からの自動変換は提供しない。

CLI exit codeは、成功時 `0`、失敗時non-zeroを維持する。細かいerror code分類は今回の仕様スコープでは扱わない。

## ScaffoldとGenerator

`togostanza init` はStanza repositoryを作る入口として維持する。

生成内容は再設計可能だが、いたずらに変更しない。生成後に `build`、`serve`、`generate stanza` が自然に動くことを重視する。

`generate stanza` の生成物は、既存Stanzaソース互換を優先し、必要最小限の再設計に留める。

- `stanzas/{id}/metadata.json` は維持する。
- `index.js` は維持する。必要なら将来 `index.ts` / `index.tsx` 生成optionを追加する。
- `style.scss` は維持する。
- `templates/stanza.html.hbs` は維持する。
- `README.md` は維持候補とする。
- idのkebab-case化は維持する。

## Configuration

現行の `togostanza-build.mjs/js` によるRollup plugin注入は `再設計` とする。

現行版の有効な拡張点は基本的に `togostanza-build.mjs` として扱う。`togostanza-build.js` のような近い名前のファイルが存在しても、現行版で有効だったとは限らない。

実プロジェクトでは `metastanza` の `togostanza-build.mjs` が確認されている。`TogoMedium Stanza` の `togostanza-build.js` は存在するが、現行版で実際に有効だったかは区別して扱う。

新しい設定ファイル名は `togostanza.config.ts` を第一候補とする。

`defineTogoStanzaConfig()` を提供し、TogoStanza専用設定を中心にする。必要な範囲でVite pluginやVite configを渡せるescape hatchを用意する。

旧 `togostanza-build.mjs/js` を無条件に実行しない。検出した場合は、現行版で有効だった可能性を踏まえて、分かりやすいwarningまたはerrorを出し、移行メモで移行先を案内する。

## Framework

React / TSXは `TogoMedium Stanza` 互換のため重点対応する。

Vueは `metastanza` 互換のため重点対応する。

Svelteなど、旧ドキュメントに例はあるが実プロジェクトで未確認のframework supportは、今回の必須仕様にしない。必要なら改善案またはfollow-upとして扱う。

## 機能改善の扱い

今回の主スコープは、互換維持と基盤更新であり、強い機能改善ではない。

維持がシンプルで不具合がないものは維持する。改善目的だけの変更は主スコープにしない。

`機能改善` として採用するのは、必要性が明確なものに限る。

- Vite 8 / Node 24化に伴って自然に必要になるもの。
- 既存挙動が明確に壊れやすいもの。
- エラーが分かりにくく、調査や移行を阻害するもの。
- `metadata["@id"]` とディレクトリ名不一致のように、想定外扱いが確定したものを明示エラーにするもの。

非採用になる可能性が高い改善案も、判断材料として `docs/investigation/follow-ups.md` に残す。

## 今後扱う項目

- 移行メモの具体化。
- Vite 8実装設計。
- `togostanza.config.ts` の具体schema。
- 実プロジェクトregression testの設計。
- ヘルププレビューの再設計範囲。
