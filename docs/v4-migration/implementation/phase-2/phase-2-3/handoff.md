# Phase 2-3: Stanza source API 引き継ぎ

この文書では、Phase 2-3完了後にPhase 2-4以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-3の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- Stanza source APIの主経路を実装した。
- `initializeRuntime()` をpublic methodではなく、runtime module内のSymbol hookへ寄せた。
- build時に `templates/*.hbs` を検出し、Handlebarsでprecompileして `{id}.js` へbundleするようにした。
- `handlebars` を `build` 実行時に必要な依存として追加した。
- build wrapperからruntimeへ、inline metadata、template map、CSS URL、About URL、asset base URLを渡すようにした。
- `this.params` を `metadata["stanza:parameter"]` とHTML属性から生成するようにした。
- `stanza:parameter` のkeyは正規化せず、HTML属性名と `this.params` のkeyとしてそのまま扱うようにした。
- booleanパラメーターは属性の有無で変換し、`flag="false"` も `true` になるようにした。
- number、json、date、datetime、single-choice、text、string、その他typeの最小変換を実装した。
- `metadata["stanza:style"]` は `this.params` に入れず、CSS custom property既定値用途として維持した。
- custom element接続後にStanza instanceの `render()` を呼ぶようにした。
- async `render()` を扱うようにした。
- `renderTemplate({ template, parameters })` を実装し、既定ではShadow DOM内 `main` の内容を置換するようにした。
- `renderTemplate({ template, parameters, selector })` で指定selectorへ描画できるようにした。
- `renderTemplate()` の描画は追記ではなく置換にし、属性変更後の再描画で本文が重複しないようにした。
- metadata上のparameter key群と `togostanza-menu-placement` から `observedAttributes` を生成するようにした。
- パラメーター属性変更時に `this.params` を再生成するようにした。
- パラメーター属性変更時に `handleAttributeChange(name, oldValue, newValue)` を呼ぶようにした。
- 既定の `handleAttributeChange()` は再描画へつながるようにした。
- `handleEvent()` は呼び出し可能なno-op methodとして置いた。
- `query()` を実装した。
- `query()` は `this.query({ endpoint, method: "POST", template, parameters })` の形を受けるようにした。
- `query()` のmethod未指定時は `POST` を使うようにした。
- Phase 2-3では `query()` のmethodは `POST` のみ対応とし、GETなどは後続判断へ送った。
- `query()` のrequest bodyは `query` を含む `application/x-www-form-urlencoded` として送るようにした。
- `query()` はJSON responseをparseし、それ以外はtextとして返すようにした。
- `importWebFontCSS(cssUrl)` を実装した。
- `importWebFontCSS("./assets/...")` と `importWebFontCSS("assets/...")` は、対象stanzaの `./{id}/assets/...` へ解決するようにした。
- `menu()` item APIを実装した。
- `menu()` が返す `{ type: "item", label, handler }` を最小menu shellへ反映するようにした。
- `menu()` が返す `{ type: "divider" }` をdividerとして反映するようにした。
- `menu()` は初期表示時と再描画後に再評価し、既存itemを置換するようにした。
- menu item clickでhandlerが呼ばれることを確認した。
- `togostanza-menu-placement="none"` またはmetadataの `stanza:menu-placement` が `none` の場合は、menu itemがあってもmenu shellを非表示にする既存挙動を維持した。
- 004ケースREADMEに、Phase 2-3で確認したリメイク版のruntimeパラメーター観測結果を記録した。
- 005ケースREADMEに、Phase 2-3で確認したリメイク版のStanza source API観測結果を記録した。

## 意図的に残したこと

- parameter不正値の詳細なfallbackとvalidation。
- JSON parse失敗時のUI/console診断の詳細。
- invalid number、invalid date、invalid datetimeの扱い。
- `handleAttributeChange()` のdebounce。
- async render中の連続属性変更のキャンセルや順序制御。
- `query()` のGET、追加header、認証、timeout、abort、response変換の詳細。
- `importWebFontCSS()` の重複挿入抑止。
- `menu()` のDOM構造互換。
- menu placementごとの実際の表示位置、見た目、レイアウト差分。
- `togostanza--menu` custom element互換。
- `handleEvent()` のincoming event連携。
- `togostanza--container`、incoming event、outgoing event、`event-map`、`data-source`。
- Stanza entrypointからのasset import。
- CSS内 `url(...)` の高度なasset解決。
- 依存パッケージ内asset import。
- Sassの高度なmodule解決。
- `togostanza.config.ts` の読み込み。
- React、Vue、TSX固有の互換。
- `togostanza-utils` 互換。
- ヘルププレビューUI。
- `index.html` と `-togostanza/` の生成。

## Phase 2-4で使う前提

- `build` はStanza別assetを `{id}/assets/` へコピーしている。
- build wrapperはruntimeへ `assetBaseUrl: new URL("./{id}/assets/", import.meta.url)` を渡している。
- `importWebFontCSS("./assets/foo.css")` は `./{id}/assets/foo.css` として解決される。
- これはStanza別assetを参照するための最小実装であり、entrypointからのasset importや依存パッケージ内asset importはまだ扱っていない。
- `renderTemplate()` と `query()` は、build時にprecompileされたtemplate mapを参照する。
- runtimeはtemplateファイルをfetchしない。
- runtime初期化は `{id}/metadata.json` fetchに依存しない。
- `{id}/metadata.json` は公開配布物として残るが、runtime初期化の正本ではない。
- `this.params` はcustom element接続後とパラメーター属性変更時に再生成される。
- `stanza:style` 由来のCSS custom propertyはhostへ既定値として入るが、`this.params` には入らない。
- `menu()` は再描画後に再評価される。
- `query()` は再描画時にも再実行され得る。debounceや重複request抑止は未実装である。

## Phase 2-4で注意すること

- Phase 2-4でasset importや依存パッケージ内asset importを扱う場合、`importWebFontCSS()` の `assetBaseUrl` 前提と衝突しないようにする。
- `importWebFontCSS()` はShadow DOMにlinkを追加するだけで、重複抑止はしていない。Phase 2-4でasset URLを増やす場合も、重複抑止を同時に仕様化するかは別判断にする。
- `query()` は今のところ `POST` のみ対応である。GETや追加HTTP optionを実装する場合は、Phase 2-3の最小契約を壊さず拡張する。
- `render()` の例外はruntime側でconsole errorへ寄せている。エラー表示UIやStanza単位の失敗表示は未固定である。
- `createStanzaParams()` はJSON parse失敗時に元の文字列を返す。これは詳細互換として固定した判断ではなく、Phase 2-3の最小fallbackである。
- `renderTemplate()` は対象要素の `innerHTML` を置換する。後続でframework runtimeを扱う場合、この置換セマンティクスを前提にする。
- browser test fixtureが大きくなっている。Phase 2-4以降でさらに増える場合は、fixture helperやspec分割を検討してよい。
- `test:browser` を単独実行する場合、bin entryが `dist/` を参照するため、直前のruntime変更を反映するには先に `cd package && mise exec -- pnpm run build` を実行する。通常の完了前確認は `check-all` を使えばbuildが先に走る。

## 後続判断として残すこと

- parameter不正値の診断方針。
- JSON parse失敗、invalid number、invalid date/datetimeのfallback値。
- async renderの再入制御。
- `query()` のGETと追加HTTP option。
- `query()` のresponse変換をどこまで互換対象にするか。
- `importWebFontCSS()` の重複挿入抑止。
- `importWebFontCSS()` のlink注入先やDOM構造を互換対象にするか。
- `menu()` のDOM構造、見た目、keyboard interaction。
- placementごとの実際の表示位置。
- `togostanza--menu` custom element互換を持ち込むか。
- `handleEvent()` のincoming event連携。
- `togostanza--container`、`event-map`、`data-source` の再設計。
- asset import、CSS内 `url(...)`、依存パッケージ内asset import。
- `togostanza.config.ts` と旧設定ファイル検出。
- `index.html` と `-togostanza/` のヘルププレビュー生成。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは52件、integration testは17件、browser testは4件が通った。

## 関連commit

- `b3d0d3d docs: add phase 2-3 source api plan`
- `ad57bd9 docs: refine phase 2-3 source api plan`
- `740f5f9 docs: clarify phase 2-3 api ownership`
- `fe0df3d feat: implement phase 2-3a render path`
- `71eb425 test: cover phase 2-3a browser cases`
- `7bb192c feat: implement phase 2-3b source api extras`
- `8d38ec1 fix: complete phase 2-3 review followups`
