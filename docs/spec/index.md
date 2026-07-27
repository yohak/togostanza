# リメイク版仕様

TogoStanzaリメイク版は、Stanzaを作成、開発、ビルドし、Webページへ埋め込める形で配布するためのツールである。

この仕様では、リメイク版が提供するCLI、Stanzaリポジトリの入力構造、ビルド生成物、開発サーバ、ブラウザランタイム、StanzaソースAPIを定義する。

用語の意味は [用語集](../UBIQUITOUS_LANGUAGE.md) に従う。

## 基本方針

開発と検証で使う標準Node.jsはNode 24 LTSとする。内部ビルド基盤はVite 8を基本にする。ただし、Stanzaソースや埋め込み先Webサイトから見た外部契約として、Broccoli、Rollup、Vueを必須要件にはしない。

配布されるTogoStanza CLIはNode 24 LTS以上で動作することを前提にする。生成されたStanzaのブラウザランタイムは、ES modules、custom elements、open Shadow DOMに対応するブラウザを前提にする。

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

短期的なGitHub dependency配布では、初回の `init` はGitHub refからCLIを直接起動できる。開発中の検証や固定点の記録では、不変tagまたはcommit SHAを使ってよい。

```sh
npm exec --package github:yohak/togostanza#<tag-or-sha> -- togostanza init --name <dir> --skip-install
pnpm --package github:yohak/togostanza#<tag-or-sha> dlx togostanza init --name <dir> --skip-install
```

npm registryへ公開する場合は、`npm exec togostanza@latest init --name <dir>`、`pnpm dlx togostanza@latest init --name <dir>` のようなregistry経由の起動方法をあらためて確認する。

Stanzaリポジトリ内で `build`、`serve`、`generate stanza` を実行する場合は、選択したパッケージマネージャー経由で実行する。たとえば `npm exec togostanza build`、`pnpm exec togostanza build`、または `package.json` のscripts経由で実行する。グローバルインストールされた `togostanza` は前提にしない。

`init` は `--package-manager npm|pnpm` を受け付ける。未指定時は、既存lockfile、`npm_config_user_agent` の順に使用するパッケージマネージャーを推定する。推定できない場合は `npm` を使う。`package.json` の `packageManager` フィールドは、`init` が書き込まない。また、パッケージマネージャー推定の材料にも使わない。

`package-lock.json` がある場合は `npm`、`pnpm-lock.yaml` がある場合は `pnpm` とみなす。`package-lock.json` と `pnpm-lock.yaml` が同時に存在する場合、または `--package-manager` の指定と既存lockfileが矛盾する場合はエラーにする。エラー文言そのものは固定しないが、開発者がlockfileの整理や指定の修正を行える診断を出す。

`init` は生成repoの `dependencies.togostanza` にGitHub dependencyを書き込む。正式版の生成repo仕様では、現行版に寄せてタグ無しGitHub dependencyを既定にする。短期の `yohak` 経路では `github:yohak/togostanza`、正式版マージ後は `github:togostanza/togostanza` を既定候補にする。開発中の検証や固定化が必要な場合は、不変tagまたはcommit SHAを `TOGOSTANZA_DEPENDENCY_SPEC` などの検証用入口から注入してよい。

`init` は既定で依存関係のインストールまで実行する。ただし、生成される `dependencies.togostanza` が `<tag-or-sha>` のような未確定placeholderを含む場合は、自動インストールへ進まず、`--skip-install` または具体dependency specの指定を促す診断を返す。`--skip-install` が指定された場合はインストールを実行せず、lockfileも生成しない。`pnpm` を使う場合、開発者環境で `pnpm` コマンドが利用できることを前提にする。TogoStanza CLIは `pnpm` 自体を自動導入しない。

`init` は既定でgit初期化を行う。`--skip-git` が指定された場合はgit初期化を行わない。GitHub Pages workflow生成はgit初期化の有無とは独立して扱う。

`generate stanza` / `g stanza` は、引数 `[id]` と、`--label`、`--definition`、`--license`、`--author`、`--timestamp` を受け付ける。`id` はStanza IDとして使えるkebab-caseへ正規化する。生成されるstanzaは、少なくとも `stanzas/{id}/metadata.json`、`index.js`、`style.scss`、`templates/stanza.html.hbs` を持つ。

CLIは成功時にexit code `0` を返す。失敗時はnon-zeroを返す。細かいerror code分類とstdout/stderrの詳細な文言は互換対象にしない。ただし、入力不備、設定移行、ビルド失敗は、Stanza IDやファイルパスなど修正に必要な情報が分かる診断を出す。

CLIは、Stanza開発者が次に何を確認すればよいか分かる状態メッセージを出す。文言そのものは固定しないが、`build` と `serve` のビルド完了メッセージには更新時刻と所要時間を含める。

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

タグ無しGitHub dependencyは、lockfileなしの新規installではその時点のdefault branchを解決する。lockfileありのfrozen installでは、lockfileに記録されたcommitを再現する。既存Stanzaリポジトリを新しい `main` へ更新する場合は、依存更新コマンドを実行してlockfileを再生成し、そのlockfileをcommitする。問題のある `main` を公開した場合は、既存tagの置き換えではなくforward-fixを基本とする。

`README.md` はStanzaリポジトリまたは各stanzaの説明として扱う。ヘルプページや一覧で参照してよいが、本文のDOM構造や表示UIは固定しない。

`init` は、標準scaffoldにGitHub Pages公開用のGitHub Actions workflowを含める。workflowは、Stanza開発者が生成直後のリポジトリをGitHub Pagesへ公開できる導線として扱う。workflow生成は `--skip-install` やgit初期化の有無とは独立して扱う。

stanzaは `stanzas/{id}/metadata.json` によって検出する。`metadata.json` の `@id` とstanzaディレクトリ名 `{id}` は一致必須とし、`@id` は `generate stanza` と同じStanza ID規則に従う。不一致や不正なStanza IDは想定外入力として扱い、ビルド時または検出時に分かりやすいエラーにする。

Stanza entrypointは `index.js`、`index.ts`、`index.tsx` を受け付ける。複数存在する場合の優先順は `index.tsx`、`index.ts`、`index.js` とする。

Stanza stylesheetは `style.scss` を正とする。`stanza.scss` は特別な互換処理の対象にしない。

`templates/*.hbs` はHandlebars templateとして扱う。Stanzaソースからは `this.renderTemplate()` と `this.query()` で利用できる。

`common.scss` は、stanza間で共有するSass stylesheetとして扱う。Sassからは `@/` をStanzaリポジトリルートへのaliasとして利用できる。たとえば `style.scss` から `@use "@/common.scss"` を参照できる。

stanza別 `assets/` は `dist/{id}/assets/` へコピーする。リポジトリルートの `assets/` は `dist/assets/` へコピーする。build生成物内では、ルートassetを相対URLで参照できる。`.keep` のような空ディレクトリ維持用ファイルは公開生成物に含めなくてよい。

Stanza entrypointからimportされるリポジトリ内ファイルは、stanza外の共有ソースとしてbuild対象に含める。共有ソースのディレクトリ名は固定しない。`components/`、`utils/`、`state/`、`lib/` など、任意のリポジトリ内ディレクトリを共有ソースとして使える。

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

`{id}/metadata.json` は公開配布物として出力する。ランタイム初期化に必要なmetadataは `{id}.js` へinlineしてよく、ブラウザ実行時に `{id}/metadata.json` をfetchすることは必須にしない。`{id}/metadata.json` は、Download JSON、外部参照、後続ツール、ヘルプやAbout導線で参照できる公開資料として扱う。

`{id}.js.map` などのsource mapは開発支援生成物として扱い、必須互換にはしない。`index.html`、`-togostanza/*` などヘルププレビュー内部生成物の構造も必須互換にはしない。

Stanzaソースからのasset importは壊さない。data URL inline、別ファイルemit、hash名、size thresholdなどの詳細は固定しない。

`build` は、出力先にリメイク版が管理するbuild生成物かどうかを識別するmarkerを置く。出力先が空でなく、かつ現在のリメイク版が安全に上書きできる生成物として識別できない場合、いきなり削除しない。対話可能な端末ではwarningを出したうえで、出力先をclearして上書きするか、終了するかをStanza開発者に確認する。非対話環境では自動clearせず、warningまたはerrorを出して終了する。

## GitHub Pages公開

リメイク版は、`init` 直後のStanzaリポジトリからGitHub Pagesへ公開できる導線を提供する。

`init` が生成する `.github/workflows/publish.yml` は、少なくとも次の流れを持つ。

1. Node.jsをセットアップする。
2. 選択されたパッケージマネージャーで依存関係をインストールする。
3. `togostanza build` を実行し、公開用生成物を `dist/` に出力する。
4. `dist/` をGitHub Pages artifactとしてアップロードする。
5. アップロードしたartifactをGitHub Pagesへdeployする。

workflowは、`init` で選択されたパッケージマネージャーに合わせて生成する。`npm` の場合は `package-lock.json` を使った再現可能なインストール、`pnpm` の場合は `pnpm-lock.yaml` を使った再現可能なインストールを行う。

workflowのjob名、trigger、Actionのバージョン、permissions、concurrency、YAML構造の詳細は固定しない。ただし、Stanza開発者がGitHub側でPagesを有効化すれば、追加の手作業を最小限にして `dist/` を公開できることを維持する。

GitHub Pages上では、リポジトリ名を含むサブパス配信で動くことを前提にする。`build` 生成物内のJavaScript、CSS、metadata、asset、共有チャンクへの参照は、Pagesのサブパスで壊れないように相対URLで解決できる必要がある。

GitHub Pages公開導線は、Stanzaリポジトリそのものを公開するための開発契約である。任意の外部Webアプリへdeployする汎用deploy機能、custom domain、CNAME生成、GitHub repository設定の自動変更は、この文書では固定しない。

## 開発サーバ

`togostanza serve` は、Stanza開発者がlocalhost上でStanzaを確認するための開発サーバである。外部Webアプリ向けの配信サーバとしては扱わない。

`serve` は、開発中のStanzaリポジトリを監視し、変更に応じてbuild相当の生成物を更新しながらHTTPで配信する。`serve` は `dist/` を書き換えない。ファイルとして公開用生成物を作る場合は `build` を使う。

`serve` はStanzaリポジトリ外の一時ディレクトリへbuild相当生成物を作るため、`build --output-path` のような出力先clear promptは発生しない。`serve` 実行時に既存の `dist/` があっても、`serve` はそれを削除、更新、配信対象として利用しない。

`serve` はlocalhostのみでlistenする。TogoMedium Webのような別のlocalhost開発サーバーからmodule scriptを読み込んで確認できるように、loopback originからの開発用CORSは許可する。ただし、外部Webアプリ向けの汎用配信サーバーとしては扱わない。

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

Stanza entrypoint、stylesheet、template、metadata、stanza別assetの変更は、原則として対象stanzaだけをinvalidateする。Stanza entrypointからimportされる共有ソースの変更は、依存グラフ上で影響を受けるstanzaをinvalidateする。stanza追加削除、共通ファイル、設定、依存関係解決に影響する変更は、必要に応じてstanza一覧、関連stanza、または全体をinvalidateする。

`serve` は初回ビルドや再ビルドに失敗しても終了しない。ビルド失敗中の対象URLには、エラー内容が分かるHTMLをHTTP 500で返す。入力が修正された場合は再ビルドし、通常のプレビューとbuild相当URLへ復帰する。

`serve` は、初回ビルドとファイル変更ごとの再ビルドが完了するたびに、更新が完了したこと、更新時刻、ビルド所要時間を標準出力へ表示する。文言は固定しないが、Stanza開発者が「いつ変更が反映されたか」と「どれくらい時間がかかったか」を確認できることを維持する。

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

menu placementは、`metadata["stanza:menu-placement"]` と `togostanza-menu-placement` 属性で指定できる。`none` の場合、menu UIは表示されない。`togostanza-menu_placement` はリメイク版では受け付けない。`togostanza--menu` の内部DOM構造や見た目は再設計可能だが、About導線と `${id}.html` への参照は維持する。

## パラメーター

`this.params` は、`metadata.json` の `stanza:parameter` に基づいてHTML属性をStanzaソースから扱う値へ変換したobjectである。

`stanza:parameter` のkeyは変換せず、HTML属性名と `this.params` のプロパティ名としてそのまま使う。`gm_id`、`data-url` などのkeyをkebab-caseやcamelCaseへ正規化しない。

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
| `this.handleEvent(event)` | `stanza:incomingEvent` に対応するイベントを受け取るlifecycle hook。 |
| `this.menu()` | runtime menuへ渡すmenu item配列を返す。 |

`this.renderTemplate()` は `templates/*.hbs` のファイル名を `template` として指定できる。該当templateがない場合はエラーにする。

`this.query()` は、`method` 未指定時に `POST` を使う。request bodyは `query` を含む `application/x-www-form-urlencoded` とし、`Accept` はSPARQL results JSONを期待する。`GET` 既定にはしない。

`this.importWebFontCSS()` のlink注入先と重複制御の詳細は固定しない。ただし、既存Stanzaソースから同じ名前で呼び出せること、Shadow DOM内の表示に必要なCSSを読み込めることを維持する。

`this.menu()` は、`{ type: "item", label, handler }` と `{ type: "divider" }` を返せる。runtime menuはこれらのitemを扱い、`handler` を呼び出せる。menu UIのDOM構造や見た目は固定しない。

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

`tsconfig.json` はTypeScript / TSXビルド設定として尊重する。`jsxImportSource` や `paths` は入力として扱う。

alias合成順、tsconfig pathsの扱い、asset inline/emit/hash/threshold、Stanzaソース内でルートassetを参照する個別記法はこの文書では固定しない。未対応の解決規則がある場合は、失敗させるだけでなく移行手順または対応可否が分かる診断を出す。

## Framework互換

リメイク版は、Stanzaソースが任意のframeworkをShadow DOM内 `main` へマウントできる構造を維持する。

React / TSXは、既存Stanzaソース互換の重点対象とする。`index.tsx` をStanza entrypointとして扱い、React componentへ `this.params` を渡し、属性変更後に再描画できることを確認対象にする。

Vue SFCは、既存Stanzaソース互換の重点対象とする。Stanzaソース内でVue componentをimportし、Shadow DOM内 `main` へマウントできることを確認対象にする。

React、Vue以外のframework supportは、この文書では必須仕様にしない。必要になった時点で追加の採用判断と検証ケースを作る。

## `togostanza-utils` 互換

`togostanza-utils` packageのうち、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPIを挙動互換対象として扱う。`togostanza-utils` 単体で完結する純粋なデータ処理APIは、TogoStanzaリメイク版の互換契約には含めない。

少なくとも次のimport pathを対象にする。

- `togostanza-utils`
- `togostanza-utils/load-data`
- `togostanza-utils/spinner.png`

`togostanza-utils/apply-filter` は挙動互換対象ではない。ただし、既存Stanzaソースが直接importしているため、無変更移行の範囲ではimport pathを解決できることを維持する。

理想形は、`togostanza-utils` package自体に手を入れず、既存packageをStanzaソースからそのままimportして動かせることである。

`togostanza-utils` の対象APIには、download menu helpers、`appendCustomCss()`、`loadData()` を含める。`applyFilter()`、`Data` class、tree / graph helperのようにTogoStanza runtime API、runtime menu contract、生成DOM構造に触れないAPIは、この互換契約では挙動を固定しない。

`togostanza-utils` が依存する範囲で、次のruntime構造を維持またはcompat propertyとして提供する。

- `this.root` がShadowRootとしてDOM APIを提供する。
- Shadow DOM内に `main` がある。
- Shadow DOM内に生成stylesheet情報がある。
- `this.element` がhost custom elementを指す。
- `this.root.host.stanzaInstance.element` がhost custom elementを指す。
- runtime menuが `this.menu()` の返す `{ type: "item", label, handler }` と `{ type: "divider" }` を扱える。

APIごとの細かいedge caseや出力バイト列の完全一致は、`togostanza-utils` の追加調査と検証ケースで扱う。

## 検証

リメイク版の受け入れ確認は、次の検証ケースに対応させる。

| ケース | 仕様領域 |
| ------ | -------- |
| [001 CLIの雛形生成とgenerate](../../workbench/cases/001-cli-scaffold-and-generate/) | `init` / `generate stanza` / GitHub Pages workflow |
| [002 ビルド生成物](../../workbench/cases/002-build-artifacts/) | `build` / 生成物 |
| [003 ランタイム埋め込み](../../workbench/cases/003-runtime-embedding/) | direct embed / Shadow DOM |
| [004 Runtimeパラメーター](../../workbench/cases/004-runtime-parameters/) | `this.params` / 属性変換 |
| [005 StanzaソースAPI](../../workbench/cases/005-stanza-source-api/) | `Stanza` base API |
| [006 Inter stanza coordination](../../workbench/cases/006-inter-stanza-coordination/) | Stanza間連携 |
| [007 Config and resolution](../../workbench/cases/007-config-and-resolution/) | 設定 / import解決 / asset |
| [008 Reactランタイム](../../workbench/cases/008-react-runtime/) | React / TSX |
| [009 Vueランタイム](../../workbench/cases/009-vue-runtime/) | Vue SFC |
| [010 togostanza-utils compatibility](../../workbench/cases/010-togostanza-utils-compat/) | `togostanza-utils` |
| [011 Serve development server](../../workbench/cases/011-serve-development-server/) | `serve` / watch / 差分invalidate |
| [012 Real project regression](../../workbench/cases/012-real-project-regression/) | 実プロジェクト回帰 |

`serve` の初回ビルド失敗からの復帰、差分再ビルド、全体invalidate、ページ再読み込み、HTTP 500エラーページと復帰は、専用のserve検証ケースで確認する。

検証ケースのREADMEには観測ログと差分を記録してよい。この仕様本文には、長い観測ログ、過去経緯、採用判断の詳細を入れない。

## 未固定事項

次の項目は、この文書では固定しない。

- `stanza:include` の最終仕様。
- 詳細なメタデータschemaとvalidation規則。
- assetのinline、emit、hash、threshold。
- `togostanza--event-map` と `togostanza--data-source` の具体API。
- alias合成順とtsconfig pathsの詳細。
- Stanzaソース内でルートassetを参照する個別記法。
- 細かいCLI error code分類。
- React、Vue以外のframework support。
- ヘルププレビューのUI、DOM構造、内部生成物。
- GitHub Pages workflowのjob名、trigger、Actionバージョン、YAML構造の詳細。
- custom domain、CNAME生成、GitHub repository設定の自動変更。
- HMR。
