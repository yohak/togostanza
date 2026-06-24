# リメイク版仕様

TogoStanzaリメイク版は、Stanzaを作成、開発、ビルドし、Webページへ埋め込める形で配布するためのツールである。

この仕様では、リメイク版が提供するCLI、Stanzaリポジトリの入力構造、ビルド生成物、開発サーバ、ブラウザランタイム、StanzaソースAPIを定義する。

## 基本方針

開発と検証で使う標準Node.jsはNode 24 LTSとする。内部ビルド基盤はVite 8を基本にする。ただし、Stanzaソースや埋め込み先Webサイトから見た外部契約として、Broccoli、Rollup、Vueを必須要件にはしない。

リメイク版で生成されたStanzaは、一般的なWebサイトへ直接埋め込める必要がある。埋め込み先Webサイトには、Vite、React、Vue、`npm install`、追加ビルド手順を要求しない。Stanza内部でframeworkを使う場合も、必要なランタイムはStanzaの配布物側に含める。

## CLI

リメイク版は次のコマンド入口を提供する。

| コマンド | 目的 |
| -------- | ---- |
| `togostanza init` | Stanzaリポジトリを作成する。 |
| `togostanza generate stanza` / `togostanza g stanza` | Stanzaソース一式を追加生成する。 |
| `togostanza build` / `togostanza b` | Stanzaリポジトリを公開用生成物へビルドする。 |
| `togostanza serve` / `togostanza s` | 開発中のStanzaリポジトリをローカル確認用に配信する。 |

`togostanza upgrade` は提供しない。旧構成からの自動変換はリメイク版の対象外とする。

`build` は `--output-path <dir>` を受け付け、指定されたディレクトリへ生成物を出力する。未指定時の出力先は `dist` とする。

`serve` は `--port <port>` を受け付け、指定されたportでローカル確認用サーバーを起動する。未指定時のportは `8080` とする。

Stanza開発者側で公式サポートするパッケージマネージャーは `npm` と `pnpm` とする。`yarn` は公式サポート対象にしない。

初回の `init` は、次の起動方法を公式手順とする。

```sh
npm exec togostanza@latest init
pnpm dlx togostanza@latest init
```

Stanzaリポジトリ内で `build`、`serve`、`generate stanza` を実行する場合は、選択したパッケージマネージャー経由で実行する。たとえば `npm exec togostanza build`、`pnpm exec togostanza build`、または `package.json` のscripts経由で実行する。グローバルインストールされた `togostanza` は前提にしない。

`init` は `--package-manager npm|pnpm` を受け付ける。未指定時は、既存lockfile、`npm_config_user_agent` の順に使用するパッケージマネージャーを推定する。推定できない場合は `npm` を使う。`package.json` の `packageManager` フィールドは、`init` が書き込まない。また、パッケージマネージャー推定の材料にも使わない。

`package-lock.json` がある場合は `npm`、`pnpm-lock.yaml` がある場合は `pnpm` とみなす。`package-lock.json` と `pnpm-lock.yaml` が同時に存在する場合、または `--package-manager` の指定と既存lockfileが矛盾する場合はエラーにする。エラー文言そのものは固定しないが、開発者がlockfileの整理や指定の修正を行える診断を出す。

`init` は既定で依存関係のインストールまで実行する。`--skip-install` が指定された場合はインストールを実行せず、lockfileも生成しない。`pnpm` を使う場合、開発者環境で `pnpm` コマンドが利用できることを前提にする。TogoStanza CLIは `pnpm` 自体を自動導入しない。

CLIは成功時にexit code `0` を返す。失敗時はnon-zeroを返す。細かいerror code分類とstdout/stderrの詳細な文言は互換対象にしない。ただし、入力不備、設定移行、ビルド失敗は、Stanza IDやファイルパスなど修正に必要な情報が分かる診断を出す。

## Stanzaリポジトリ

Stanzaリポジトリは、1つ以上のstanzaと、TogoStanza CLIを実行するためのNode package定義、関連設定、共通assetを含むディレクトリである。リメイク版は、少なくとも次の構成を扱う。

```text
.github/
  workflows/
    publish.yml
package.json
package-lock.json | pnpm-lock.yaml
README.md
stanzas/
  {id}/
    metadata.json
    index.js | index.ts | index.tsx
    style.scss
    templates/
      *.hbs
    assets/
      *
assets/
  *
common.scss
togostanza.config.ts
```

`package.json` はStanzaリポジトリのpackage定義として扱う。`build`、`serve`、`generate stanza` はStanzaリポジトリのルートで実行されることを前提にし、`package.json` からリポジトリ名、依存、scripts、実行環境を確認できる。

Stanzaリポジトリは `togostanza` を依存として持つ。依存の置き方は、公開時のnpm package、GitHub参照、workspace / linkなど、実行環境に応じて許容する。リメイク版CLIは、正しいリポジトリでない場合や必要な依存が利用できない場合に分かりやすい診断を出す。

lockfileは、使用するパッケージマネージャーの依存解決結果として扱う。`init` がどのlockfileを生成するか、また既存lockfileをどう更新するかは、選択されたパッケージマネージャーに従う。`--skip-install` で初期化した場合、lockfileは開発者が後から `npm install` または `pnpm install` を実行したときに生成される。

`README.md` はStanzaリポジトリまたは各stanzaの説明として扱う。ヘルプページや一覧で参照してよいが、本文のDOM構造や表示UIは固定しない。

`init` は、標準scaffoldにGitHub Pages公開用のGitHub Actions workflowを含める。workflowは、選択されたパッケージマネージャーで依存関係をインストールし、`togostanza build` を実行し、生成された `dist/` をGitHub Pages artifactとしてアップロードしてdeployする目的を持つ。workflowのjob名、Actionのバージョン、細かなYAML構造は固定しないが、Stanza開発者が生成直後のリポジトリをGitHub Pagesへ公開できる導線は維持する。

stanzaは `stanzas/{id}/metadata.json` によって検出する。`metadata.json` の `@id` とstanzaディレクトリ名 `{id}` は一致必須とする。不一致は想定外入力として扱い、ビルド時または検出時に分かりやすいエラーにする。

Stanza entrypointは `index.js`、`index.ts`、`index.tsx` を受け付ける。複数存在する場合の優先順は `index.tsx`、`index.ts`、`index.js` とする。

Stanza stylesheetは `style.scss` を正とする。`stanza.scss` は特別な互換処理の対象にしない。

`templates/*.hbs` はHandlebars templateとして扱う。Stanzaソースからは `this.renderTemplate()` と `this.query()` で利用できる。

stanza別 `assets/` は `dist/{id}/assets/` へコピーする。リポジトリルートの `assets/` は `dist/assets/` へコピーする。`.keep` のような空ディレクトリ維持用ファイルは公開生成物に含めなくてよい。

`stanza:include` の扱い、詳細なメタデータschema、広範なvalidation規則は、この文書では固定しない。ただし、正しい既存入力を壊さないこと、想定外入力を分かりやすく診断することを優先する。

## 生成物

`togostanza build` は、Stanza利用者が一般Webサイトへ埋め込むためのランタイム生成物と、Stanza開発者が公開時に配置する生成物を出力する。

主要生成物は次の通り。

```text
dist/
  {id}.js
  {id}.css
  {id}.html
  {id}/
    metadata.json
    assets/
      *
  assets/
    *
```

`{id}.js` は、ブラウザから `type="module"` scriptとして読み込める。1つの `{id}.js` が完全な単一ファイルであることは要求しない。`dist/` 配下の `{id}.js` と共有チャンク一式が、静的ホスティング上で相対importにより自己完結して動けばよい。

`{id}.css` は、対象stanzaのShadow DOM内に適用されるstylesheetとして生成する。対応する `style.scss` がない場合でも、空のCSS生成物を出してよい。

`{id}.html` は、menuのAbout導線から参照できるStanza説明ページとして存在させる。ページのUI、DOM構造、プレビュー機能、snippet生成の詳細は再設計可能とする。

`{id}.js.map` などのsource mapは開発支援生成物として扱い、必須互換にはしない。`index.html`、`-togostanza/*` などヘルププレビュー内部生成物の構造も必須互換にはしない。

Stanzaソースからのasset importは壊さない。data URL inline、別ファイルemit、hash名、size thresholdなどの詳細は固定しない。

## 開発サーバ

`togostanza serve` は、Stanza開発者がlocalhost上でStanzaを確認するための開発サーバである。外部Webアプリ向けの配信サーバとしては扱わない。

`serve` は、開発中のStanzaリポジトリを監視し、変更に応じてbuild相当の生成物を更新しながらHTTPで配信する。`serve` は `dist/` を書き換えない。ファイルとして公開用生成物を作る場合は `build` を使う。

`serve` はlocalhostのみでlistenする。外部originからのmodule script読み込みは想定せず、CORSは利用契約として保証しない。

`serve` はbuild相当生成物をサーバrootから配信する。少なくとも次のURLを提供する。

| URL | 内容 |
| --- | ---- |
| `/` | Stanza一覧。 |
| `/{id}.html` | 対象stanzaの最小プレビュー。 |
| `/{id}.js` | 対象stanzaのmodule script。 |
| `/{id}.css` | 対象stanzaのstylesheet。 |
| `/{id}/metadata.json` | 対象stanzaのmetadata。 |
| asset URL | ルートassetとstanza別asset。 |

`/` と `/{id}.html` のUI、DOM構造、カスタマイズUI、HTML snippet生成の詳細は固定しない。ただし、Stanza開発者が対象stanzaをブラウザで確認できる最小プレビューを提供する。

`serve` はStanzaソース、`metadata.json`、template、stylesheet、asset、設定、共通ファイルの変更を検知する。変更後のブラウザ反映はページ再読み込みを必須仕様とする。HMRは必須仕様にしない。

`serve` は変更された入力と依存関係に基づき、可能な範囲で影響を受けるstanzaだけを再ビルドする。依存関係を安全に特定できない変更では、全体をinvalidateしてよい。

Stanza entrypoint、stylesheet、template、metadata、stanza別assetの変更は、原則として対象stanzaだけをinvalidateする。stanza追加削除、共通ファイル、設定、依存関係解決に影響する変更は、必要に応じてstanza一覧、関連stanza、または全体をinvalidateする。

`serve` は初回ビルドや再ビルドに失敗しても終了しない。ビルド失敗中の対象URLには、エラー内容が分かるHTMLをHTTP 500で返す。入力が修正された場合は再ビルドし、通常のプレビューとbuild相当URLへ復帰する。

## ランタイム埋め込み

Stanza利用者は、次の形で生成物をWebページへ直接埋め込める。

```html
<script type="module" src="./{id}.js"></script>
<togostanza-{id}></togostanza-{id}>
```

custom element名は `metadata["@id"]` から `togostanza-{id}` として定義する。

custom elementはopen Shadow DOMを作成する。Shadow DOM内には、Stanzaソースやframework runtimeがマウント対象として使える `main` 要素を持つ。`this.root` はhost custom elementのshadow rootを返す。

StanzaごとのCSSはShadow DOM内に適用する。`metadata["stanza:style"]` がある場合は、CSS custom propertyの既定値としてhostへ反映する。

外部ページがShadow DOM内部を直接queryして操作する使い方は、利用契約として保証しない。一方で、Stanzaソース内から `this.root` と `this.root.querySelector("main")` を使うことは開発契約として維持する。

menu placementは、`metadata["stanza:menu-placement"]` と `togostanza-menu_placement` 属性で指定できる。`none` の場合、menu UIは表示されない。`togostanza--menu` の内部DOM構造や見た目は再設計可能だが、About導線と `${id}.html` への参照は維持する。

## パラメーター

`this.params` は、`metadata.json` の `stanza:parameter` に基づいてHTML属性をStanzaソースから扱う値へ変換したobjectである。

booleanパラメーターはHTML boolean属性として扱う。

| HTML属性 | `this.params` の値 |
| -------- | ------------------ |
| 属性あり | `true` |
| 属性なし | `false` |
| `flag="false"` | `true` |

その他の主な `stanza:type` は次のように扱う。

| `stanza:type` | 変換 |
| ------------- | ---- |
| `number` | 属性値を `Number()` でnumberへ変換する。 |
| `json` | 属性値をJSONとしてparseする。 |
| `date` | 属性値を `Date` へ変換する。 |
| `datetime` | 属性値を `Date` へ変換する。 |
| `single-choice` | stringとして扱う。 |
| `text` | stringとして扱う。 |
| その他 | stringとして扱う。 |

属性が存在しないboolean以外のパラメーターは、未指定値として扱う。詳細なvalidation、fallback、警告条件はこの文書では固定しない。

`metadata["stanza:style"]` はCSS custom propertyの既定値を定義するために使う。`stanza:style` の項目は `this.params` には入れない。

パラメーター属性が変更された場合、Stanza instanceの `handleAttributeChange(name, oldValue, newValue)` を呼び出す。既定では再描画される。debounceなど内部スケジューリングの詳細は固定しない。

## StanzaソースAPI

既存Stanzaソース互換のため、次のimport形状を維持する。

```js
import Stanza from "togostanza/stanza";

export default class Example extends Stanza {
  async render() {
    // ...
  }
}
```

`Stanza` base classは、少なくとも次のAPIを提供する。

| API | 仕様 |
| --- | ---- |
| `this.params` | メタデータとHTML属性から変換したパラメーターobjectを返す。 |
| `this.root` | host custom elementのopen shadow rootを返す。 |
| `this.element` | host custom elementを指す。 |
| `this.renderTemplate({ template, parameters, selector })` | 指定したHandlebars templateを描画し、`selector` または `main` へ挿入する。 |
| `this.query({ template, parameters, endpoint, method })` | Handlebars templateからSPARQL queryを生成し、HTTP requestを送る。 |
| `this.importWebFontCSS(cssUrl)` | CSS URLをstylesheet linkとして読み込む。 |
| `this.handleAttributeChange(name, oldValue, newValue)` | custom element属性変更時に呼ばれるlifecycle hook。 |

`this.renderTemplate()` は `templates/*.hbs` のファイル名を `template` として指定できる。該当templateがない場合はエラーにする。

`this.query()` は、`method` 未指定時に `POST` を使う。request bodyは `query` を含む `application/x-www-form-urlencoded` とし、`Accept` はSPARQL results JSONを期待する。`GET` 既定にはしない。

`this.importWebFontCSS()` のlink注入先と重複制御の詳細は固定しない。ただし、既存Stanzaソースから同じ名前で呼び出せること、Shadow DOM内の表示に必要なCSSを読み込めることを維持する。

## Stanza間連携

`togostanza--container` は、複数stanzaを同じHTML内で連携させる入口として維持する。

Stanzaソースは、host custom elementから `CustomEvent` を送出できる。イベント名は `metadata["stanza:outgoingEvent"]` と対応させる。受信側は `metadata["stanza:incomingEvent"]` と対応するイベントを受け取り、必要に応じて `handleEvent(event)` で処理できる。

`togostanza--event-map` は、送出イベントの値を受信側stanzaの属性へ渡す目的を維持する。ただし、送信元指定、selector、`value-path`、属性更新規則などの具体APIは再設計対象とし、この文書では固定しない。

`togostanza--data-source` は、外部データを受信側stanzaへ渡す目的を維持する。ただし、`url` / `receiver` / `target-attribute`、blob URL経由のhandoffなどの具体APIは再設計対象とし、この文書では固定しない。

`togostanza--data-container` は実装しない。旧ドキュメント上の誤記として扱う。

Stanza間連携を再設計する場合は、目的、影響範囲、既存HTMLからの移行方法を別途記録する。

## 設定と解決

リメイク版の設定ファイル名は `togostanza.config.ts` を第一候補とする。

設定APIとして `defineTogoStanzaConfig()` を提供する。設定はTogoStanza専用の項目を中心にし、必要な範囲でVite pluginやVite configを渡せるescape hatchを持つ。

旧 `togostanza-build.mjs` / `togostanza-build.js` は無条件に実行しない。検出した場合は、旧設定ファイルがあることと、移行先の `togostanza.config.ts` が分かるwarningまたはerrorを出す。

Stanzaソースの相対import、stanza内asset import、package内asset import、Sassからの共通stylesheet参照は、既存Stanzaソースを大きく変えずに移行できることを重視する。

alias合成順、tsconfig pathsの扱い、asset inline/emit/hash/threshold、root public asset pathの詳細はこの文書では固定しない。未対応の解決規則がある場合は、失敗させるだけでなく移行手順または対応可否が分かる診断を出す。

## Framework互換

リメイク版は、Stanzaソースが任意のframeworkをShadow DOM内 `main` へマウントできる構造を維持する。

React / TSXは、既存Stanzaソース互換の重点対象とする。`index.tsx` をStanza entrypointとして扱い、React componentへ `this.params` を渡し、属性変更後に再描画できることを確認対象にする。

Vue SFCは、既存Stanzaソース互換の重点対象とする。Stanzaソース内でVue componentをimportし、Shadow DOM内 `main` へマウントできることを確認対象にする。

React、Vue以外のframework supportは、この文書では必須仕様にしない。必要になった時点で追加の採用判断と検証ケースを作る。

## `togostanza-utils` 互換

`metastanza` が利用している `togostanza-utils` の主要APIとimport pathは、drop-in互換対象として扱う。

少なくとも次のimport pathを対象にする。

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/apply-filter`
- `togostanza-utils/spinner.png`

理想形は、`togostanza-utils` package自体に手を入れず、既存packageをStanzaソースからそのままimportして動かせることである。

`togostanza-utils` が依存する範囲で、次のruntime構造を維持またはcompat propertyとして提供する。

- `this.root` がShadowRootとしてDOM APIを提供する。
- Shadow DOM内に `main` がある。
- Shadow DOM内に生成stylesheet情報がある。
- `this.element` がhost custom elementを指す。
- `this.root.host.stanzaInstance.element` がhost custom elementを指す。
- runtime menuが `{ type: "item", label, handler }` と `{ type: "divider" }` を扱える。

`togostanza-utils` の全API再実装はこの文書の対象にしない。追加対象は実プロジェクトでの使用有無と検証ケースに基づいて判断する。

## 検証

リメイク版の受け入れ確認は、次の検証ケースに対応させる。

| ケース | 仕様領域 |
| ------ | -------- |
| [001 CLIの雛形生成とgenerate](../../workbench/cases/001-cli-scaffold-and-generate/) | `init` / `generate stanza` |
| [002 ビルド生成物](../../workbench/cases/002-build-artifacts/) | `build` / 生成物 |
| [003 ランタイム埋め込み](../../workbench/cases/003-runtime-embedding/) | direct embed / `serve` / Shadow DOM |
| [004 Runtimeパラメーター](../../workbench/cases/004-runtime-parameters/) | `this.params` / 属性変換 |
| [005 StanzaソースAPI](../../workbench/cases/005-stanza-source-api/) | `Stanza` base API |
| [006 Inter stanza coordination](../../workbench/cases/006-inter-stanza-coordination/) | Stanza間連携 |
| [007 Config and resolution](../../workbench/cases/007-config-and-resolution/) | 設定 / import解決 / asset |
| [008 Reactランタイム](../../workbench/cases/008-react-runtime/) | React / TSX |
| [009 Vueランタイム](../../workbench/cases/009-vue-runtime/) | Vue SFC |
| [010 togostanza-utils compatibility](../../workbench/cases/010-togostanza-utils-compat/) | `togostanza-utils` |

`serve` の初回ビルド失敗からの復帰、差分再ビルド、全体invalidate、ページ再読み込み、HTTP 500エラーページと復帰は、実装時に [003 ランタイム埋め込み](../../workbench/cases/003-runtime-embedding/) へ追加するか、専用のserve検証ケースとして切り出す。

検証ケースのREADMEには観測ログと差分を記録してよい。この仕様本文には、長い観測ログ、過去経緯、採用判断の詳細を入れない。

## 未固定事項

次の項目は、この文書では固定しない。

- `stanza:include` の最終仕様。
- 詳細なメタデータschemaとvalidation規則。
- assetのinline、emit、hash、threshold。
- `togostanza--event-map` と `togostanza--data-source` の具体API。
- alias合成順とtsconfig pathsの詳細。
- 細かいCLI error code分類。
- React、Vue以外のframework support。
- ヘルププレビューのUI、DOM構造、内部生成物。
- HMR。
