# Phase 2-2: minimal runtime embedding 引き継ぎ

この文書では、Phase 2-2完了後にPhase 2-3へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-2の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- build wrapperを、Phase 2-1の `globalThis.__togostanzaBuildEntries` 登録から、runtime登録関数 `registerStanza()` を呼ぶ形へ変更した。
- `{id}.js` にStanza class、Stanza ID、tag name、CSS URL、About URL、inline metadataを含めるようにした。
- CSS URLとAbout URLは `import.meta.url` を基準に `new URL()` で解決するようにした。
- `dist/{id}/metadata.json` は公開配布物として引き続き生成するようにした。
- ランタイム初期化は `{id}/metadata.json` fetchに依存せず、inline metadataを使うようにした。
- `togostanza/stanza` runtime stubを、最小ランタイム埋め込みへ拡張した。
- `registerStanza()` を追加し、`customElements.define()` で `togostanza-{id}` を登録するようにした。
- DOMや `customElements` がない環境では `registerStanza()` がno-opになるようにした。
- 同じtag nameの再登録で例外にならないようにした。
- custom elementがopen Shadow DOMを作るようにした。
- Shadow DOM内に `main` を作るようにした。
- Shadow DOM内に `{id}.css` へのstylesheet linkを置くようにした。
- `stanza:style` を配列として読み、各要素の `stanza:key` と `stanza:default` をCSS custom propertyの既定値としてhostへ反映するようにした。
- Stanza instanceを生成し、`this.root` と `this.element` を配線するようにした。
- Phase 2-2では `render()` を呼ばないようにした。
- `renderTemplate()` はPhase 2-3へ残すno-opのまま維持した。
- 最小menu shellをShadow DOM内に作るようにした。
- menu shellに `${id}.html` へ向くAbout linkを持たせた。
- `metadata["stanza:menu-placement"]` と `togostanza-menu-placement` 属性からmenu placementを解決するようにした。
- `togostanza-menu-placement="none"` の場合にmenu shellを非表示にするようにした。
- `metadata["stanza:menu-placement"]` が `none` の場合にmenu shellを非表示にするようにした。
- `none` 以外のplacement値はmenu shellの `data-placement` へ反映するようにした。
- `togostanza-menu_placement` は正式属性として扱わないことをbrowser testで確認した。
- `{id}.js` にbare import `togostanza/stanza` が残らないことを確認した。
- 003ケースに、Phase 2-2で確認する範囲とPhase 2-3で回収する本文描画範囲を記録した。

## 意図的に残したこと

- Stanza source classの `render()` 呼び出し。
- `this.params` の生成。
- `stanza:parameter` の解釈。
- HTML属性から `this.params` への型変換。
- パラメーター属性変更時の `handleAttributeChange()` 呼び出し。
- `renderTemplate()` の本格実装。
- `templates/*.hbs` の読み込み。
- Shadow DOM内 `main` への本文描画。
- `query()`。
- `importWebFontCSS()`。
- `this.menu()` のitem API。
- menu item handler。
- menu divider。
- placementごとの実際の表示位置、見た目、レイアウト差分。
- `togostanza--menu` のDOM構造互換。
- `handleEvent()`。
- `togostanza--container`。
- incoming event / outgoing event。
- `serve` の実挙動。
- ヘルププレビューUI。
- `index.html` と `-togostanza/` の生成。
- Stanza entrypointからのasset import。
- CSS内 `url(...)` の高度なasset解決。
- `togostanza.config.ts` の読み込み。

## Phase 2-3で使う前提

- `build` 後の `{id}.js` は、静的HTMLから `type="module"` scriptとして読み込める。
- `{id}.js` を読み込むと `togostanza-{id}` がcustom elementとして登録される。
- `<togostanza-{id}>` はopen Shadow DOMを持つ。
- Shadow DOM内にはStanza source APIやframework runtimeが使う `main` が存在する。
- `{id}.css` はShadow DOM内へ適用される。
- CSS URLはdocument baseではなく、module scriptの `import.meta.url` を基準に解決される。
- `stanza:style` 由来のCSS custom property既定値はhostで参照できる。
- Stanza instanceは作成され、`this.root` はhostのshadow root、`this.element` はhost custom elementを指す。
- `this.params` は空objectのままで、Phase 2-3でmetadataとHTML属性から生成する。
- `renderTemplate()` は存在するが、Phase 2-3で実装する。
- runtime初期化に必要なmetadataは `{id}.js` にinlineされている。
- `{id}/metadata.json` は公開配布物として存在するが、runtime初期化のfetch先ではない。
- About linkは `${id}.html` へ向く。
- `togostanza-menu-placement` が正式属性であり、`togostanza-menu_placement` は正式属性ではない。

## Phase 2-3で回収すること

- `metadata["stanza:parameter"]` を読み、HTML属性から `this.params` を生成する。
- boolean、number、json、date、datetime、single-choice、textなどのパラメーター変換を実装する。
- `stanza:style` は `this.params` に入れない契約を維持する。
- `render()` を呼ぶタイミングを決める。
- `renderTemplate()` を実装し、`templates/*.hbs` をbundleまたはruntimeから利用できる形にする。
- Shadow DOM内 `main` へ本文を描画する。
- 属性変更時に `this.params` を更新し、`handleAttributeChange()` または再描画へつなぐ。
- `query()`、`importWebFontCSS()`、`this.menu()` item APIの最小互換を扱う。
- menu shellと `this.menu()` item APIをどう接続するか決める。
- Phase 2-2でpublic名として置いた `initializeRuntime()` を、そのまま維持するか、内部hookとして名前や形を見直すか決める。
- build wrapper末尾の `export default StanzaClass` を維持するか削除するか決める。

## Phase 2-3で注意すること

- Phase 2-2ではStanza instanceを作るが、`render()` は呼んでいない。Phase 2-3で `render()` を呼び始めると、constructor、async render、エラー処理、再描画の境界が実挙動として見えるようになる。
- `initializeRuntime()` は現時点ではbase classのpublic methodである。Stanza開発者が同名methodを定義した場合の衝突を避けたいなら、Phase 2-3で内部hook化を検討する。
- `this.params` の初期化は、custom elementのconstructorではなく、connected後または属性が読める時点の挙動と合わせて設計する。
- `observedAttributes` はPhase 2-2では `togostanza-menu-placement` のみである。Phase 2-3ではmetadata上のparameter keyを反映する必要がある。
- menu shellは内部要素として実装しており、`togostanza--menu` custom elementではない。外部仕様として固定したのはmenu placement、`none`、About導線までである。
- menu非表示は `hidden` propertyで行っている。必要なら後続で `getComputedStyle(menu).display === "none"` まで検証してもよい。
- runtime metadataは `{id}.js` と `{id}/metadata.json` に二重に存在する。この重複は、現行版寄せの意図した構造として扱う。
- `{id}/metadata.json` をfetchしないことは、Phase 2-2のbrowser testでrequest logとHTTP 500応答により確認済みである。

## 後続判断として残すこと

- `initializeRuntime()` をpublic methodとして維持するか、Symbolやprivate関数などの内部hookへ寄せるか。
- build wrapper末尾の `export default StanzaClass` を残すか削るか。
- menu shellのDOM名を `togostanza--menu` custom elementにするか、内部要素のままにするか。
- placementごとの実際の表示位置、見た目、レイアウト差分をどのサブフェーズで詰めるか。
- `.togostanza-build-output` markerを公開生成物から除外するか。
- `metadata.json` のDownload JSON導線をヘルプ/About UIでどこまで扱うか。
- `index.html` と `-togostanza/` のヘルププレビュー生成をPhase 2内で扱うか、Phase 3へ送るか。
- asset import、CSS内 `url(...)`、依存パッケージ内asset importはPhase 2-4で扱う。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは50件、integration testは17件、browser testは2件が通った。

## 関連commit

- `36529df docs: add phase 2-2 runtime plan`
- `e341c10 feat: implement phase 2-2 runtime embedding`
