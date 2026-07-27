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

## 配布と生成repo依存

現行版の `init` は、生成repoの `dependencies.togostanza` に `github:togostanza/togostanza` のタグ無しGitHub dependencyを書き込む。この形は、Stanza開発者が生成直後のリポジトリでrelease tagを手作業で選ばなくても依存をインストールできる開発契約として維持する。

リメイク版でも、正式版の生成repo仕様ではタグ無しGitHub dependencyを既定にする。短期の `yohak` 経路では `github:yohak/togostanza`、正式版マージ後は `github:togostanza/togostanza` を既定候補にする。

一方、開発中の検証、TogoMedium確認、固定点の記録では不変tagまたはcommit SHAを使う。tagは既存refを動かさず、修正版では新しいtagを作る。

タグ無しGitHub dependencyは、lockfileなしの新規installではその時点のdefault branchを解決する。install後はnpm / pnpmのlockfileが解決commitを固定するため、既存Stanzaリポジトリが新しい `main` へ追従するには、依存更新とlockfile再生成が必要になる。この再現性とのトレードオフは受け入れ、現行版と同じ生成repo体験を優先する。

問題のある `main` を公開した場合は、既存tagを動かすのではなく、`main` のforward-fixを基本にする。固定refが必要な検証や一時運用では、新しいtagまたはcommit SHAを案内する。

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

`stanza:menu-placement` メタデータkeyと `togostanza-menu-placement` 属性は維持する。`togostanza-menu_placement` は現行版コード由来の属性名だが、リメイク版では正式属性として受け付けない。placementによってmenu表示位置を変える目的も維持する。

`togostanza--menu` から辿れる `About this stanza` 相当の導線は維持する。この導線が参照する `${id}.html` の存在も維持する。

`${id}.html` のUI、DOM、preview機能、snippet生成の詳細は再設計可能とする。

`togostanza--menu` の外側custom element名は、実プロジェクトでstyleが当たっているため維持する。menuはStanzaのShadow DOM内で `<main>` と同じ相対配置コンテナに置き、`this.menu()` のitem / divider、Copy HTML snippet、About導線を扱う。

`togostanza--menu` の内部DOM構造や見た目は `再設計` 可能とする。内部class名、id、DOM階層の完全一致は必須互換にしない。ただし、実プロジェクトで観測されるstyle適用とmenu itemの操作はregression testで重点確認する。

現行版ではinfo icon再クリックでmenuを開閉する。リメイク版では、Stanza利用者の自然な操作として `Escape` と外側clickでも閉じられるようにする。これは現行版の操作を壊す変更ではなく、追加操作として扱う。

Copy HTML snippetのmodule script URLは、Stanza bundleのregistrationからruntimeへ渡す。About URLから `.js` を逆算する実装にはしない。画面端でのpopup自動flipは初回の互換範囲に含めない。

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
- `this.handleEvent`
- `this.menu`

`this.importWebFontCSS(cssUrl)` は、既存Stanzaソース互換のため維持する。linkの注入先や重複制御などの詳細は、現行版の観測と実プロジェクトのregression testをもとに実装時に判断する。

`this.handleAttributeChange(name, oldValue, newValue)` は、custom element属性変更時のlifecycle hookとして維持する。既定の再描画やdebounceなどの内部スケジューリング詳細は、この文書では固定しない。

### `togostanza-utils`

`togostanza-utils` packageのうち、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIをdrop-in互換対象として扱う。`togostanza-utils` 単体で完結する純粋なデータ処理APIは、TogoStanzaリメイク版の互換対象にしない。

理想形は、`togostanza-utils` package自体に手を入れず、既存packageがそのまま動くことである。そのために必要なruntime compatibilityは、実プロジェクト調査と追加workbench検証ケースで観測する。

`root.host.stanzaInstance.element` のような現行runtime内部構造への依存は、通常は公開APIとして望ましくない。ただし、`togostanza-utils` のdrop-in互換のために必要な範囲では、リメイク版runtime側のcompat propertyとして受け入れる。

対象範囲は次の通り。

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/spinner.png`

`togostanza-utils/apply-filter` は挙動互換対象ではない。ただし、既存Stanzaソースが直接importしているため、無変更移行の範囲ではimport pathを解決できることを維持する。

`applyFilter()`、`Data` class、tree / graph helperのような純粋なデータ処理APIは、既存package側の責務として扱い、リメイク版runtimeのcompat propertyやDOM契約では吸収しない。

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

`index.html`、`-togostanza/help-app.js` などのヘルププレビュー側生成物は `再設計` 可能とする。`${id}.html` はmenuのAbout導線から参照されるため存在を維持し、Stanza開発者がパラメーターとstyleを変更できるリッチなヘルププレビューを提供する。実装にはVue 3とBootstrap 5 CSSを採用し、Bootstrap JSは使わない。query parameterによる初期値上書きは採用しない。具体的なDOM構造、CSS class、内部bundle名は固定しない。

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

CLIの成功・状態メッセージは再設計可能だが、Stanza開発者が日常的に触る開発契約として扱う。`build`、`serve` の初回ビルド、再ビルド完了時には、更新時刻と所要時間が分かるメッセージを出す。`build` の出力先に現在のリメイク版が安全に上書きできると識別できない生成物がある場合は、いきなり削除せず、対話可能な端末ではwarningと確認promptを出してclear / abortを選べるようにする。非対話環境では自動clearしない。

### `serve` の実装方式

リメイク版の `serve` は、`build` と同じビルドパイプラインを一時ディレクトリへ実行し、その生成物を専用のHTTPサーバーで配信する方式を採用する。Vite dev server、`vite build --watch`、`vite preview` の組み合わせは採用しない。

`serve` は公開用出力先を持たないため、`build --output-path` の出力先clear promptは `serve` には適用しない。`serve` で同じpromptを出すには、`serve` が `dist/` などの永続出力先を削除・更新する必要があるが、これは `serve` が `dist/` を書き換えないという開発サーバ方針と衝突する。

Vite dev serverを採用しない理由:

- `serve` が配信するものは、外部ページへ直接埋め込める自己完結のbuild相当生成物である。Vite dev serverが配信する開発用モジュールグラフは、この埋め込み契約を満たさない。

`vite build --watch` を採用しない理由:

- 再ビルドを引き起こすべき入力の多くが、バンドラのモジュールグラフの外にある。`style.scss` はViteの外でSassとしてコンパイルされ、asset、`metadata.json`、templateも同様である。
- watch開始時にエントリーポイントの一覧が固定されるため、`serve` 実行中のStanza追加や削除を検知できない。
- これらをVite pluginで補うことは、独自のwatcherをpluginの内側へ書き直すことと同等になり、簡素化にならない。

`vite preview` を採用しない理由:

- ビルド失敗時にHTTP 500でエラー内容を返す契約と、Stanza単位のエラー隔離は、静的配信では表現できない。再ビルド失敗時に古い生成物を無言で配信し続けることを避ける。
- リメイク版の `serve` は、再ビルドを新しい一時ディレクトリへ行い、完了後に配信対象を切り替える。出力先を直接書き換える方式では、再ビルド中に書きかけの生成物を配信し得る。この原子性は、別のローカルWebアプリが `serve` からStanzaを読み込む利用で意味を持つ。

このトレードオフとして、バンドラのwatch増分キャッシュは使わず、再ビルドは対象Stanza単位のフルビルドになる。再ビルド速度が問題になった場合は、配信側の構造を維持したまま、ビルド呼び出しへwatch設定を渡す改善を後続判断として扱う。

## ScaffoldとGenerator

`togostanza init` はStanza repositoryを作る入口として維持する。

生成内容は再設計可能だが、いたずらに変更しない。生成後に `build`、`serve`、`generate stanza` が自然に動くことを重視する。

現行版の `init` は `.github/workflows/publish.yml` を生成し、GitHub Actions上で `togostanza build` を実行して `dist/` をGitHub Pagesへdeployする導線を持つ。このGitHub Pages公開導線は、Stanza開発者が生成物を静的ホスティングへ配置するための開発契約として維持する。ActionのバージョンやYAMLの細部は再設計可能とする。

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

### ビルド基盤としてのVite

リメイク版は、Rolldownを直接使わず、Viteをビルド基盤として維持する。

`serve` がVite dev serverを使わないことは、Viteを外す理由にしない。リメイク版がViteから使っているものはdev serverではなく、plugin機構とビルドパイプラインである。

- framework対応は、Stanza開発者が `togostanza.config.ts` へVite pluginを追加する方式を開発契約にしている。`@vitejs/plugin-vue` のようにVite専用フックへ依存するpluginがあり、Rolldownの直接利用ではこの契約を維持できない。
- CSS処理（importされたCSSの収集とマージ、`url()` の書き換え）、`.env` と `import.meta.env`、assetのemitは、Vite層の機能として使っている。
- 使用中のVite 8は、内部バンドラとしてRolldownを使う。バンドル性能の利益はVite経由でも得られており、Rolldownの直接利用で追加の性能利益はほぼない。
- Rolldown本体のバージョン追従とAPI変化は、Vite経由で吸収する。

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
- ヘルププレビューの追加改善範囲。
