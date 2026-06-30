# Phase 2-2: minimal runtime embedding 設計

Phase 2-2は、Phase 2-1で作ったbuild生成物を、一般Webサイトへ直接埋め込んだときにcustom elementとしてupgradeできる状態へ進めるサブフェーズである。

このサブフェーズでは、ランタイム埋め込みの土台を作る。`{id}.js` の `type="module"` 読み込み、custom element登録、open Shadow DOM、Shadow DOM内 `main`、stylesheet適用、`stanza:style`、最小menu shell、About導線を扱う。一方で、`this.params`、`renderTemplate()`、template描画、`query()`、Stanza source APIの本格挙動はPhase 2-3へ送る。

## 目的

- 生成された `{id}.js` を `type="module"` scriptとして読み込める状態にする。
- `{id}.js` 読み込み時に `togostanza-{id}` をcustom elementとして登録する。
- `<togostanza-{id}>` がブラウザ上でupgradeされることを確認する。
- custom elementがopen Shadow DOMを作る。
- Shadow DOM内に、後続のStanza source APIやframework runtimeが使える `main` を作る。
- `{id}.css` をShadow DOM内へ適用する。
- `stanza:style` からCSS custom propertyの既定値をhostへ反映する。
- metadataを現行版寄せで `{id}.js` へinlineし、ランタイム初期化時に `metadata.json` fetchへ依存しない。
- `dist/{id}/metadata.json` は公開配布物として残し、Download JSON、外部参照、後続ツール、ヘルプ/About導線で参照できる資料として扱う。
- `stanza:menu-placement` と `togostanza-menu-placement` を使う最小menu shellを成立させる。
- `togostanza-menu_placement` をリメイク版の正式属性として扱わないことを確認する。
- ヘルププレビューではない静的HTMLから、生成物を直接読み込むbrowser testを用意する。

## 完了条件

- `build` 後の `{id}.js` に、custom element登録に必要なmetadataがinlineされる。
- `dist/{id}/metadata.json` は引き続き生成される。
- `{id}.js` は、ブラウザ実行時に `dist/{id}/metadata.json` をfetchしなくてもcustom elementを初期化できる。
- build wrapperは、Stanza classと静的なruntime登録情報をruntime登録関数へ渡す。
- runtime登録情報には、少なくともStanza ID、tag name、CSS URL、About URL、inline metadataが含まれる。
- CSS URLとAbout URLは `import.meta.url` を基準にした相対URLとして解決できる。
- `customElements.get("togostanza-{id}")` が定義済みになる。
- `<togostanza-{id}>` がupgradeされる。
- upgraded elementはopen Shadow DOMを持つ。
- Shadow DOM内に `main` が存在する。
- Shadow DOM内に `{id}.css` へのstylesheet link、または同等に外部CSSを適用する仕組みが存在する。
- stylesheetは存在確認だけでなく、`getComputedStyle()` などで `{id}.css` のルールが実際に適用されたことを確認する。
- `stanza:style` の項目がCSS custom propertyの既定値としてhostへ反映される。
- `metadata["stanza:menu-placement"]` が `none` の場合、menu UIは表示されない。
- `togostanza-menu-placement="none"` の場合、menu UIは表示されない。
- `none` 以外のplacementは、Phase 2-2では値をmenu shellへ反映できることまで確認する。
- placementごとの実際の表示位置、見た目、レイアウト差分は後続判断へ送る。
- `togostanza-menu_placement` は正式属性として扱わない。
- `metadata["stanza:menu-placement"]` が `bottom-right` のstanzaに `togostanza-menu_placement="none"` を付けても、menu shellは非表示にならない。
- About導線は `${id}.html` へ到達できるリンクを持つ。
- About導線の `href` は、document baseではなく `import.meta.url` を基準に解決されたURLであることを確認する。
- `this.root` はhost custom elementのopen shadow rootを返す。
- `this.element` はhost custom elementを返す。
- `render()` はPhase 2-2では呼ばない。
- `this.params`、`renderTemplate()`、template描画、本文表示はPhase 2-3へ残る。
- unit test、integration test、browser testで、runtime登録、生成物、DOM、menu、相対URLを確認できる。
- 003ケースREADMEに、Phase 2-2で確認する範囲とPhase 2-3へ送る本文描画範囲を記録する。

## 含めるもの

- build wrapperのruntime登録形式への更新。
- runtime登録関数。
- metadata inline。
- `dist/{id}/metadata.json` の公開配布物としての役割整理。
- custom element登録。
- open Shadow DOM。
- Shadow DOM内 `main`。
- CSS適用。
- `stanza:style` の最小読み取り規則。
- `stanza:style` のCSS custom property既定値反映。
- 最小menu shell。
- `metadata["stanza:menu-placement"]`。
- `togostanza-menu-placement`。
- `none`。
- `none` 以外のplacement値をmenu shellへ反映する最小処理。
- `togostanza-menu_placement` の非採用確認。
- `togostanza-menu_placement="none"` が `togostanza-menu-placement="none"` と同等に扱われないことの確認。
- About導線から `${id}.html` へのリンク。
- `this.root` と `this.element` の配線。
- 静的HTML + ローカルHTTPサーバによるbrowser test。
- 003ケースのリメイク版観測範囲更新。

## 含めないもの

- `render()` 呼び出し。
- `this.params` の生成。
- `stanza:parameter` の解釈。
- `renderTemplate()`。
- `templates/*.hbs` の読み込み。
- Stanza source由来の本文描画。
- `query()`。
- `importWebFontCSS()`。
- `this.menu()` のitem API。
- menu item handler。
- menu divider。
- `handleAttributeChange()`。
- `handleEvent()`。
- `togostanza--container`。
- incoming event / outgoing event。
- `serve` の実挙動。
- ヘルププレビューUI。
- `index.html` と `-togostanza/` の生成。
- Stanza entrypointからのasset import。
- CSS内 `url(...)` の高度なasset解決。
- `togostanza.config.ts` の読み込み。

## runtime登録方針

Phase 2-1のbuild wrapperは、Stanza classをbundle内に残すための一時的な登録を行っている。Phase 2-2では、このwrapperをruntime登録関数へ静的情報を渡す形へ進める。

概念上は次の形にする。

```js
import { registerStanza } from "togostanza/stanza";
import StanzaClass from "./stanza-entrypoint";

registerStanza({
  id: "hello",
  tagName: "togostanza-hello",
  cssUrl: new URL("./hello.css", import.meta.url),
  aboutUrl: new URL("./hello.html", import.meta.url),
  metadata,
  StanzaClass,
});
```

実際のimport pathや関数名は実装時に決めてよい。ただし、次の性質は守る。

- URL解決は `import.meta.url` を基準にする。
- GitHub Pagesのサブパス配信で壊れない相対URLにする。
- browser runtimeが現在読み込まれたscript pathを推測しなくてよい形にする。
- `metadata.json` fetchに依存しない。
- 1つのページで複数stanzaの `{id}.js` を読み込んでも、それぞれのcustom elementを登録できる。

## metadata方針

現行版では、`dist/{id}/metadata.json` を出力しつつ、ランタイム用のmetadataは `{id}.js` へbundleされる。リメイク版Phase 2-2でも、この方針に寄せる。

Phase 2-2でのruntime初期化は、inline metadataを使う。ブラウザ実行時に `dist/{id}/metadata.json` をfetchしない。

`dist/{id}/metadata.json` は、runtimeの初期化正本ではなく、同じmetadataから生成された公開配布物として扱う。主な役割は次の通り。

- Stanzaの説明、パラメーター、style、event定義を外部から参照できるようにする。
- Aboutやヘルプ系導線からDownload JSONとして到達できるようにする。
- 後続ツールや公開先でのメタデータ利用に備える。
- ビルド生成物として、Stanza開発者が内容を確認できるようにする。

そのため、metadataは `{id}.js` 内のruntime初期化用inline dataと、`dist/{id}/metadata.json` の公開配布物として二重に存在する。この重複はPhase 2-2では意図した生成物構造として扱う。

Phase 2-2でruntimeが解釈するmetadataは、次に限定する。

- `@id`
- `stanza:label`
- `stanza:definition`
- `stanza:style`
- `stanza:menu-placement`

`stanza:parameter`、`stanza:incomingEvent`、`stanza:outgoingEvent`、`stanza:include`、template関連の解釈はPhase 2-3以降で扱う。

browser testでは、request logで `/{id}/metadata.json` へのrequestが発生しないことを確認する。可能であれば、`/{id}/metadata.json` がHTTP 500を返してもcustom elementがupgradeされることも確認し、runtime初期化が公開metadata fetchに依存していないことを固定する。

## DOM方針

custom elementはopen Shadow DOMを作る。Shadow DOM内には `main` を置く。

Phase 2-2では、Stanza source classの `render()` は呼ばない。Phase 1で生成したStanza sourceは `render()` 内で `renderTemplate()` を呼ぶため、`render()` を呼ぶとPhase 2-3の範囲へ踏み込むためである。

Phase 2-2では、`this.root` と `this.element` の配線まで確定する。`this.root` はhost custom elementのopen shadow rootを返し、`this.element` はhost custom elementを返す。Phase 2-3の `render()`、`this.params`、`renderTemplate()` は、このDOM土台の上に実装する。

Stanza instanceはPhase 2-2で生成してよい。ただし、生成する場合でも `render()` は呼ばない。constructorを通す必要がある場合は、`this.root` や `this.element` の土台だけを使い、本文描画はPhase 2-3へ残す。

## CSS方針

`{id}.css` はShadow DOMへ適用する。実装はstylesheet linkを基本候補にする。

browser testでは、Shadow DOM内にlinkが存在することだけでは合格にしない。fixture HTMLは生成物ディレクトリと異なる階層へ置き、document base相対の `./{id}.css` へ退行した場合に404や未適用として検出できるようにする。`getComputedStyle()` などで `{id}.css` のルールが実際にhostまたはShadow DOM内要素へ適用されたことを確認する。

`stanza:style` はCSS custom propertyの既定値を定義するために使う。`stanza:style` の項目は `this.params` には入れない。Phase 2-2では、inline metadataの `stanza:style` を読み、hostへ既定値を反映する。

Phase 2-2で扱う `stanza:style` の最小規則は次の通り。

- `stanza:style` は配列として読む。
- 各要素の `stanza:key` をCSS custom property名として扱う。
- 各要素の `stanza:default` を既定値としてhost styleへ反映する。
- 異常形の詳細validationはPhase 2-3以降または後続判断へ送る。

CSS custom propertyの上書き、外部CSSとの詳細な優先順位、CSS内 `url(...)` の高度なasset解決はPhase 2-4以降で扱う。

## menu方針

Phase 2-2では最小menu shellだけを実装する。

扱うもの:

- `metadata["stanza:menu-placement"]`
- `togostanza-menu-placement`
- `none`
- About導線から `${id}.html` へのリンク
- `none` 以外のplacement値をmenu shellへ反映すること
- 通常表示時のmenu shellとAbout link

扱わないもの:

- `this.menu()` が返すitem
- item handler
- divider
- placementごとの実際の表示位置、見た目、レイアウト差分
- menu UIの詳細な見た目
- menu内部DOM構造の互換

`togostanza-menu_placement` は現行版コード由来の属性名だが、リメイク版では正式属性として扱わない。Phase 2-2では、この属性に依存しないことを確認する。

具体的には、`metadata["stanza:menu-placement"]` が `bottom-right` のstanzaに `togostanza-menu_placement="none"` を付けても、menu shellは非表示にならないことを確認する。これにより、`togostanza-menu_placement` が `togostanza-menu-placement` と同等に扱われていないことを固定する。

通常表示の確認として、`metadata["stanza:menu-placement"]` が `bottom-right` など `none` 以外のstanzaではmenu shellが表示され、menu shellが `${id}.html` へ向くAbout linkを持つことを確認する。

menu shellのDOM名を `togostanza--menu` custom elementにするか、Shadow DOM内の内部要素にするかは実装時判断とする。外部仕様として固定するのは、menu placement、`none`、About導線の観測可能な挙動までとする。

## サブパス安全性

Phase 2-2では、生成物を静的HTMLから直接読み込んだときのURL解決をbrowser testで確認する。

確認する参照:

- 静的HTMLから `{id}.js` へのmodule script。
- `{id}.js` から共有チャンクへの相対import。
- `{id}.js` からCSS URLへの相対参照。
- menu shellから `${id}.html` へのAbout URL。
- 公開生成物としての `{id}/metadata.json` への到達性。
- root assetとstanza別assetの配置が、後続runtimeや外部ページから相対URLで参照できる形で残っていること。

Phase 2-2では、runtimeがassetをfetchする挙動や、entrypoint内asset importは扱わない。

## 実装メモ

- `package/src/runtime/stanza.ts` のstubを、runtime登録と最小base classへ拡張する。
- `registerStanza()` 相当の関数をruntime側に置く。
- `formatEntrypointWrapper()` は、metadata inlineとruntime登録情報を出力する形へ更新する。
- metadata inlineには、Phase 2-1でvalidation済みのmetadata objectを使う。
- `dist/{id}/metadata.json` の生成は維持する。
- `Stanza` base classはPhase 2-2時点で、将来の `this.root`、`this.element`、`this.params` に進められる形にする。
- `this.root` と `this.element` はPhase 2-2で配線する。
- ただし、`this.params` の値生成、`renderTemplate()` の本格実装、`render()` 呼び出しは入れない。
- `customElements.define()` は同じtag nameの再定義で例外にならないようにする。
- 1ページで複数stanzaを読み込むケースを考慮する。
- browser test用の静的配信は既存のbrowser test基盤に寄せる。
- `serve` は使わない。

## 検証計画

### unit test

- wrapperがinline metadataを含むruntime登録コードを生成する。
- wrapperが `metadata.json` fetchに依存しない。
- runtime登録が `togostanza-{id}` をcustom elementとして定義する。
- 同じtag nameを再登録しようとしても安全に扱う。
- `stanza:style` からCSS custom propertyの既定値を生成する。
- `stanza:style` 配列の `stanza:key` と `stanza:default` だけをPhase 2-2の最小規則として読む。
- `metadata["stanza:menu-placement"]` が `none` の場合にmenu shellを表示しない。
- `togostanza-menu-placement="none"` がmetadataより優先される。
- `none` 以外のplacement値をmenu shellへ反映する。
- `togostanza-menu_placement` を正式属性として扱わない。
- `metadata["stanza:menu-placement"]` が `bottom-right` のstanzaに `togostanza-menu_placement="none"` を付けても、menu shellは非表示にならない。
- 通常表示のmenu shellがAbout linkを持つ。
- About URLが `${id}.html` へ向く。
- `this.root` がhost custom elementのopen shadow rootを返す。
- `this.element` がhost custom elementを返す。

### integration test

- `init .`、`generate stanza`、`build --output-path public` 後に、runtime登録情報を含む `{id}.js` が生成される。
- `dist/{id}/metadata.json` 相当の公開metadataが引き続き生成される。
- `{id}.js` にinline metadataが含まれる。
- metadataが `{id}.js` と `dist/{id}/metadata.json` の両方に存在する。
- `{id}.html`、`{id}.css`、`{id}/metadata.json`、root asset、stanza assetの配置がPhase 2-1から維持される。

### browser test

- 一時ディレクトリに直接埋め込みHTMLを作る。
- ローカルHTTPサーバで静的HTMLとbuild生成物を配信する。
- HTMLから `<script type="module" src="./public/{id}.js">` を読み込む。
- HTMLに `<togostanza-{id}>` を置く。
- `customElements.get("togostanza-{id}")` が定義済みになる。
- `<togostanza-{id}>` がupgradeされる。
- hostがopen Shadow DOMを持つ。
- Shadow DOM内に `main` がある。
- Shadow DOM内にstylesheet link、または同等のCSS適用要素がある。
- `getComputedStyle()` などで `{id}.css` のルールが実際に適用される。
- hostに `stanza:style` 由来のCSS custom property既定値が反映される。
- `togostanza-menu-placement="none"` でmenu UIが表示されない。
- metadataの `stanza:menu-placement` が `none` のstanzaでmenu UIが表示されない。
- `none` 以外のplacement値がmenu shellへ反映される。
- metadataの `stanza:menu-placement` が `bottom-right` のstanzaではmenu shellが表示される。
- 通常表示のmenu shellが `${id}.html` へ向くAbout linkを持つ。
- `togostanza-menu_placement="none"` に依存せず、正式属性として扱われない。
- metadataの `stanza:menu-placement` が `bottom-right` のstanzaに `togostanza-menu_placement="none"` を付けても、menu shellは非表示にならない。
- About導線のリンク先が `import.meta.url` 基準で解決された `${id}.html` になる。
- `this.root` と `this.element` がDOM土台に配線される。
- request logで `/{id}/metadata.json` へのrequestが発生しない。
- 可能であれば、`/{id}/metadata.json` がHTTP 500を返してもcustom elementがupgradeされる。
- コンソールに致命的なmodule loadエラーが出ない。

## 003ケース更新方針

003ケースでは、現行版の観測結果として本文描画まで記録済みである。リメイク版Phase 2-2では、本文描画は合格条件にしない。

003ケースREADMEでは、次を分けて記録する。

- Phase 2-2で確認する範囲: module script、custom element、open Shadow DOM、`main`、CSS、`stanza:style`、menu placement、About導線。
- Phase 2-3で回収する範囲: `say-to` 属性から `this.params["say-to"]` への変換、`renderTemplate()`、template描画、`Hello, runtime!` の本文表示。

`serve` は現行版観測では使っているが、リメイク版Phase 2-2の検証入口にはしない。Phase 2-2では静的HTMLとローカルHTTPサーバで直接埋め込みを確認する。

## 後続判断として残すこと

- menu shellのDOM名を `togostanza--menu` custom elementにするか、内部要素にするか。
- placementごとの実際の表示位置、見た目、レイアウト差分をどのサブフェーズで詰めるか。
- `treeshake: false` を実runtime登録後も維持するか。
- `.togostanza-build-output` markerを公開生成物から除外するか。
- `metadata.json` のDownload JSON導線をヘルプ/About UIでどこまで扱うか。
- `index.html` と `-togostanza/` のヘルププレビュー生成をPhase 2内で扱うか、Phase 3へ送るか。
- `this.params`、`renderTemplate()`、template bundle、`query()`、`importWebFontCSS()`、`this.menu()` item APIはPhase 2-3で扱う。
- asset import、CSS内 `url(...)`、依存パッケージ内asset importはPhase 2-4で扱う。

## 確認コマンド

- `git diff --check`
- `cd package && pnpm run check-all`

browser testがsandbox環境で権限制約に当たる場合は、既存の運用方針に従い、標準コマンドを承認付き通常実行で確認する。
