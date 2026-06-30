# Phase 2-3: Stanza source API 設計

Phase 2-3は、Phase 2-2で作ったcustom elementとShadow DOMの土台に、既存Stanzaソースが依存するStanza source APIを載せるサブフェーズである。

このサブフェーズでは、`this.params`、`render()`、`renderTemplate()`、属性変更、`query()`、`importWebFontCSS()`、`menu()` を扱う。対象範囲が広いため、Phase 2-3全体のplanは1つにまとめ、その中で実装順を `2-3a core render path`、`2-3b source API extras`、`2-3 deferred` に分ける。handoffはPhase 2-3完了後に1つ作る。

## 目的

- 既存Stanzaソースの `import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` を維持する。
- `metadata["stanza:parameter"]` とHTML属性から `this.params` を生成する。
- `render()` を呼び、Shadow DOM内 `main` へ本文を描画できるようにする。
- `renderTemplate()` と `templates/*.hbs` を使えるようにする。
- 属性変更時に `this.params` を更新し、`handleAttributeChange()` と再描画へつなげる。
- `query()`、`importWebFontCSS()`、`menu()` の最小互換を成立させる。
- 004ケースと005ケースのリメイク版観測を通せる状態にする。

## 完了条件

- `this.params` が `metadata["stanza:parameter"]` に基づいて生成される。
- `stanza:parameter` のkeyは正規化せず、HTML属性名と `this.params` のプロパティ名としてそのまま使われる。
- booleanパラメーターは属性の有無で変換され、`flag="false"` も `true` になる。
- number、json、date、datetime、single-choice、text、string、その他typeの主要変換が仕様どおり動く。
- `metadata["stanza:style"]` は `this.params` に入らず、Phase 2-2のCSS custom property既定値用途を維持する。
- Stanza instanceの `render()` が初期表示時に呼ばれる。
- async `render()` を扱える。
- `renderTemplate({ template, parameters })` が `templates/*.hbs` を描画し、既定ではShadow DOM内 `main` の内容を置換する。
- `renderTemplate({ template, parameters, selector })` が指定selectorへ描画できる。
- `renderTemplate()` は対象要素の内容を置換し、属性変更後の再描画で本文が重複しない。
- 存在しないtemplateを指定した場合、修正対象が分かるエラーになる。
- パラメーター属性変更時に `this.params` が更新される。
- 属性変更時に `handleAttributeChange(name, oldValue, newValue)` が呼ばれる。
- 既定の `handleAttributeChange()` は再描画へつながる。
- `this.query({ template, parameters, endpoint, method })` が使える。
- `query()` のmethod未指定時は `POST` を使う。
- `query()` のrequest bodyは `query` を含む `application/x-www-form-urlencoded` として送られる。
- `importWebFontCSS(cssUrl)` がShadow DOM内にstylesheet linkを追加する。
- `menu()` が返す `{ type: "item", label, handler }` と `{ type: "divider" }` を最小menu shellへ反映できる。
- `menu()` は初期表示時と再描画後に再評価され、`this.params` に依存するmenu itemを反映できる。
- menu itemをクリックすると該当handlerが呼ばれる。
- unit test、integration test、browser testで、004/005相当の挙動を確認できる。
- 004ケースREADMEと005ケースREADMEに、Phase 2-3で確認したリメイク版の観測範囲を記録する。

## 含めるもの

- Phase 2-2で残したruntime内部hookの整理。
- `initializeRuntime()` をpublic APIとして露出し続けるか、内部hookへ寄せるかの実装判断。
- build wrapperからtemplate情報をruntimeへ渡す仕組み。
- `templates/*.hbs` の検出とbundle。
- Handlebarsの導入。browser runtimeで使う場合も生成bundleに含まれるようにする。
- Handlebars template描画。
- `this.params` の初期生成。
- parameter type変換。
- `render()` 呼び出し。
- async `render()` の扱い。
- 属性変更の監視対象をmetadata上のparameter keyへ広げること。
- `observedAttributes` を、runtime登録時のmetadataから得たparameter key群と `togostanza-menu-placement` から生成すること。
- `handleAttributeChange()`。
- 属性変更時の既定再描画。
- `query()`。
- `importWebFontCSS()`。
- `menu()` item API。
- 004ケースと005ケースのリメイク版観測更新。

## 含めないもの

- `serve` の実挙動。
- `togostanza--container`。
- incoming event / outgoing event。
- `handleEvent()`。
- `togostanza--event-map`。
- `togostanza--data-source`。
- Stanza entrypointからのasset import。
- CSS内 `url(...)` の高度なasset解決。
- 依存パッケージ内asset import。
- Sassの高度なmodule解決。
- `togostanza.config.ts` の読み込み。
- React、Vue、TSX固有の互換。
- `togostanza-utils` 互換。
- ヘルププレビューUI。
- `index.html` と `-togostanza/` の生成。
- menu placementごとの実際の表示位置、見た目、レイアウト差分。
- `importWebFontCSS()` の重複挿入抑止。
- debounceや細かい再描画スケジューリング。
- 広範なmetadata schema validation。

## 実装順

### 2-3a core render path

2-3aでは、Stanzaソースの本文描画に必要な主経路を先に通す。

対象:

- runtime内部hookの整理。
- template metadataをbuild wrapperからruntimeへ渡す。
- `templates/*.hbs` を文字列としてbundleする。
- `this.params` を生成する。
- `render()` を初期表示で呼ぶ。
- `renderTemplate()` でtemplateを描画する。
- 属性変更時に `this.params` を更新する。
- `handleAttributeChange()` を呼ぶ。
- 既定の属性変更後再描画を行う。
- `renderTemplate()` が対象要素の内容を置換し、再描画が冪等になることを確認する。

2-3aの完了目安は、004ケースの主要パラメーター変換と、005ケースの `renderTemplate()` / `this.root` / `this.element` / `this.params` がブラウザで確認できることである。

### 2-3b source API extras

2-3bでは、副作用や外部連携を含むStanza source APIを追加する。

対象:

- `query()`。
- `importWebFontCSS()`。
- `menu()` item API。
- menu shellへのitem反映。
- menu item handler呼び出し。

2-3bの完了目安は、005ケースの `query()` のPOST request、web font stylesheet link、menu item handlerをブラウザで確認できることである。

### 2-3 deferred

2-3で実装しないが、後続判断として明示して残す対象をここへ送る。

- parameter不正値の詳細なfallbackとvalidation。
- JSON parse失敗時のUI/console診断の詳細。
- date/datetimeのinvalid valueの扱い。
- `handleAttributeChange()` のdebounce。
- async render中の連続属性変更のキャンセルや順序制御。
- `importWebFontCSS()` の重複挿入抑止。
- menu UIのDOM構造互換。
- menu placementごとの見た目。
- `query()` のGETや追加HTTP optionの詳細。

## runtime内部hook方針

Phase 2-2では、runtimeからStanza instanceへ `initializeRuntime()` をpublic methodとして呼んでいる。Phase 2-3では、`this.params`、template、render lifecycleを増やす前に、このhookを内部実装として扱いやすい形へ寄せる。

推奨は、Stanza開発者向けAPIとは見なさない内部hookとして扱うことである。実装方法は、Symbol、private helper、またはruntime module内の関数など、既存コードに合う形で決めてよい。外部契約として固定するのは、`this.params`、`this.root`、`this.element`、`renderTemplate()` などのStanza source APIであり、内部hook名ではない。

## parameter方針

`metadata["stanza:parameter"]` は配列として読む。Phase 2-3では、各要素の `stanza:key` と `stanza:type` を使う。

keyは変換しない。たとえば `say-to`、`gm_id`、`data-url` は、そのままHTML属性名と `this.params` のkeyとして使う。

typeごとの最小変換は次の通りとする。

| `stanza:type` | 変換 |
| ------------- | ---- |
| `boolean` | 属性が存在すれば `true`、存在しなければ `false`。属性値の文字列は見ない。 |
| `number` | 属性値を `Number()` でnumberへ変換する。 |
| `json` | 属性値をJSONとしてparseする。 |
| `date` | 属性値を `Date` へ変換する。 |
| `datetime` | 属性値を `Date` へ変換する。 |
| `single-choice` | stringとして扱う。 |
| `text` | stringとして扱う。 |
| `string` | stringとして扱う。 |
| その他 | stringとして扱う。 |

boolean以外で属性が存在しない場合は未指定値として扱う。未指定値を `undefined` にするか、key自体を持たないobjectにするかは実装時に既存観測とテスト容易性を見て決める。ただし、正しい既存入力の観測結果を優先する。

`metadata["stanza:style"]` は `this.params` に入れない。CSS custom propertyの既定値用途としてPhase 2-2の挙動を維持する。

不正値の扱いは、Phase 2-3では詳細互換として固定しない。JSON parse失敗、invalid number、invalid dateなどは、ページ全体を壊さない診断に寄せたいが、詳細なfallback値や警告文言は後続判断にする。

## render lifecycle方針

Phase 2-3では、custom elementが接続された後にStanza instanceの `render()` を呼ぶ。

`render()` はasyncであってよい。runtimeはPromiseを扱い、致命的な例外が発生した場合でも、どのstanzaのrenderで失敗したか分かる形を目指す。エラー表示UIの詳細はPhase 2-3では固定しない。

属性変更時は次の順を基本にする。

1. `this.params` を最新属性から再生成する。
2. `handleAttributeChange(name, oldValue, newValue)` を呼ぶ。
3. 既定実装では再描画する。
4. 再描画後に `menu()` を再評価し、menu shellを更新する。

Stanza sourceが `handleAttributeChange()` をoverrideし、`super.handleAttributeChange(...)` を呼んだ場合に既定再描画が動く形を目指す。overrideして `super` を呼ばない場合の詳細挙動は、既存ソース互換を見ながら実装時に確認する。

debounce、render中の再入、連続属性変更の順序制御はPhase 2-3では作り込みすぎない。

`observedAttributes` はcustom element定義時に静的に決まる。そのため、Phase 2-3ではruntime登録時のinline metadataから `stanza:parameter` のkey群を取り出し、Phase 2-2で扱った `togostanza-menu-placement` と合わせて監視対象を生成する。

## template方針

`templates/*.hbs` は、build時に検出して `{id}.js` へbundleすることを基本候補にする。runtimeでtemplateファイルをfetchする形にはしない。

Handlebars templateは、build時にprecompileする方針を基本にする。browser bundleには可能な限りHandlebars runtimeだけを含め、全stanza bundleへフルコンパイラを載せないことを目指す。ただし、まずPhase 2-3の観測契約を通すために必要な範囲では、実装方式を段階的にしてよい。

`renderTemplate({ template, parameters })` は、`template` に指定されたファイル名のHandlebars templateを描画する。描画先は、`selector` が指定されている場合は `this.root.querySelector(selector)`、未指定の場合はShadow DOM内 `main` とする。描画時は対象要素の内容を置換し、追記しない。これにより、属性変更後の再描画でも本文が重複しない。

templateが存在しない場合やselectorが見つからない場合は、対象stanzaとtemplate名またはselectorが分かるエラーにする。エラー文言そのものは互換対象にしない。

Handlebarsの高度なhelper互換、partial、precompile出力の細部、escapingの細部はPhase 2-3では必要最小限に留める。既存ケース入力とPhase 1生成templateが動くことを優先する。

Handlebarsを新しく依存に追加する場合は、`build` 実行時に必要な依存として扱う。precompileではなくbrowser runtimeでtemplateをcompile/renderする一時実装にする場合も、Vite bundleへ含め、埋め込み先Webサイトに追加installや追加buildを要求しない。

## query方針

`query()` は `renderTemplate()` と同じtemplate解決を使い、SPARQL query文字列を生成する。

method未指定時は `POST` を使う。request bodyは `query` を含む `application/x-www-form-urlencoded` とし、`Accept` はSPARQL results JSONを期待する。

Phase 2-3では、005ケースの `/sparql` 観測でmethod、content type、bodyを確認する。GET、追加header、認証、timeout、abort、response変換の細部は後続判断とする。

## importWebFontCSS方針

`importWebFontCSS(cssUrl)` は、Shadow DOM内にstylesheet linkを追加する。

相対URLは、生成物の配置で壊れない形に解決する。Phase 2-1ではstanza別assetを `{id}/assets/` へコピーするため、Phase 2-3の `importWebFontCSS("./assets/api-probe-font.css")` は、対象stanzaのassetとして `./{id}/assets/api-probe-font.css` へ解決することを基本にする。

現行版観測では、再renderのたびに同じlinkが追加され、重複抑止は確認されていない。Phase 2-3では、重複抑止を互換必須にはしない。必要なら後続判断で最適化する。

## menu API方針

Phase 2-2のmenu shellは、placement、`none`、About導線だけを扱った。Phase 2-3では、Stanza sourceの `menu()` が返すitemを最小menu shellへ反映する。

扱うitemは次の2種類に絞る。

- `{ type: "item", label, handler }`
- `{ type: "divider" }`

itemのDOM構造や見た目は固定しない。browser testでは、item labelが表示され、クリック時にhandlerが呼ばれることを確認する。

`menu()` は初期render後に呼ぶ。属性変更後の既定再描画でも再評価し、`this.params` に依存するmenu itemが更新されるようにする。再評価時は既存のsource由来menu itemを置換し、重複追加しない。

`metadata["stanza:menu-placement"]` または `togostanza-menu-placement` が `none` の場合は、menu itemがあってもmenu shellは表示しない。

## 004ケース更新方針

004ケースでは、リメイク版で次を確認する。

- booleanの属性有無。
- `flag="false"` が `true` になること。
- number、json、single-choice、textの変換。
- `stanza:style` が `this.params` に入らないこと。
- 属性変更時に `this.params` が更新されること。
- `handleAttributeChange()` が呼ばれること。
- 既定再描画が行われること。

Phase 2-3では、004ケースの現行版観測を踏まえつつ、リメイク版の仕様として確定している範囲を記録する。不正値や細かいfallbackは、未決定事項として残してよい。

## 005ケース更新方針

005ケースでは、リメイク版で次を確認する。

- `this.root.querySelector("main")` が使えること。
- `this.element` がcustom elementを指すこと。
- `this.params` がtemplateへ渡せること。
- `renderTemplate({ template, parameters })` が本文を描画すること。
- `handleAttributeChange()` と再描画が動くこと。
- `query()` のmethod未指定が `POST` になること。
- `importWebFontCSS()` がstylesheet linkを追加すること。
- `menu()` item APIが最小menu shellへ反映されること。

005ケースの現行版観測では `importWebFontCSS()` の重複挿入が確認されているが、リメイク版Phase 2-3では重複挿入まで互換必須にしない。

## 検証計画

### unit test

- parameter metadataから `this.params` を生成する。
- boolean属性の有無と `flag="false"` を確認する。
- number、json、date、datetime、single-choice、text、string、その他typeの変換を確認する。
- `stanza:style` が `this.params` に入らないことを確認する。
- template mapから `renderTemplate()` がHTMLを生成する。
- `renderTemplate()` が対象要素の内容を置換し、追記しないことを確認する。
- 存在しないtemplateで失敗する。
- selector指定時に描画先が変わる。
- 属性変更時にparams更新と `handleAttributeChange()` 呼び出しが起きる。
- metadataのparameter key群と `togostanza-menu-placement` から監視属性を生成する。
- `query()` がmethod未指定でPOST requestを組み立てる。
- `importWebFontCSS()` がlinkを追加する。
- `menu()` item APIがmenu shellへ反映される。

### integration test

- `init .`、`generate stanza`、templateを含むStanza source編集、`build --output-path public` 後に、template情報を含む `{id}.js` が生成される。
- `{id}.js` にtemplate文字列またはtemplate mapがbundleされる。
- `{id}.js` にruntime登録情報、metadata、template情報が含まれ、bare importは残らない。
- `{id}.html`、`{id}.css`、`{id}/metadata.json`、asset配置はPhase 2-2から維持される。

### browser test

- 004相当のfixtureで `this.params` の値と型をDOMから確認する。
- boolean、number、json、single-choice、textを確認する。
- `stanza:style` が `this.params` に入らないことを確認する。
- 属性変更ボタンまたはDOM操作で `handleAttributeChange()` と再描画を確認する。
- 005相当のfixtureで `this.root`、`this.element`、`renderTemplate()` を確認する。
- `/sparql` fixture endpointで `query()` のPOST、content type、bodyを確認する。
- `importWebFontCSS()` のlink追加を確認する。
- `menu()` item labelとhandler呼び出しを確認する。
- 属性変更後に `menu()` itemが重複せず更新されることを確認する。
- コンソールに致命的なmodule loadエラーが出ないことを確認する。

## 後続判断として残すこと

- parameter不正値のfallbackと診断。
- `stanza:parameter` の広範なschema validation。
- `stanza:include`。
- async render中の連続属性変更制御。
- `handleAttributeChange()` のdebounce。
- `importWebFontCSS()` の重複挿入抑止。
- menu item DOM構造と見た目。
- menu placementごとのレイアウト。
- `query()` のGET、追加header、timeout、abort、response変換。
- `handleEvent()` とStanza間連携。
- React、Vue、TSX固有の互換。
- `togostanza-utils` 互換。

## 確認コマンド

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
