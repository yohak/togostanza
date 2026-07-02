# Phase 2: build + runtime 引き継ぎ

この文書では、Phase 2完了後にPhase 3以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 2全体のサブフェーズ境界は [index.md](./index.md) を正とする。各サブフェーズの詳細な設計と完了状態は、個別のplan / handoffを参照する。この文書は設計ではなく、Phase 2全体を通した完了後の入口メモである。

## 完了したこと

- `init .`、既存ディレクトリ、lockfile推定、パッケージマネージャー矛盾診断、Stanzaリポジトリroot判定を整えた。
- `build` / `b` を、Stanzaリポジトリrootから `dist/` へ公開用生成物を作る入口として成立させた。
- Viteを使ってStanza entrypointをbundleし、共有チャンク、JS asset import、依存パッケージ内asset importをサブパス安全なURLで出力できるようにした。
- Sassを使ってStanza stylesheetを処理し、Sass `@/` alias、CSS `url("./assets/...")` のstanza別asset解決、source map生成を扱えるようにした。
- `build --output-path <dir>` と未指定時の `dist` 出力、出力先cleanの安全ガード、失敗build後の復帰を実装した。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、stanza別asset、root asset、Vite emit assetを生成できるようにした。
- `metadata.json` を公開配布物として残しつつ、ランタイム初期化に必要なmetadataは `{id}.js` へinlineする方針にした。
- module scriptで読み込まれた `{id}.js` が、`<togostanza-{id}>` をcustom elementとして登録するようにした。
- open Shadow DOM、Shadow DOM内 `main`、stylesheet適用、`stanza:style` 由来のCSS custom property既定値を成立させた。
- `stanza:menu-placement`、`togostanza-menu-placement`、`none`、About導線、`togostanza-menu_placement` を正式属性として扱わないことを確認した。
- `this.root`、`this.element`、`this.params`、`render()`、`renderTemplate()`、`handleAttributeChange()`、`query()`、`importWebFontCSS()`、`menu()`、`handleEvent()` の最小ランタイムAPIを成立させた。
- `renderTemplate()` は対象要素の内容を置換する形にし、再描画で本文が蓄積しないようにした。
- `togostanza.config.ts`、`defineTogoStanzaConfig()`、`togostanza/config`、Vite configの限定merge、旧 `togostanza-build.mjs` / `togostanza-build.js` の検出と警告を実装した。
- `tsconfig.json` は存在を入力として扱いつつ、`compilerOptions.paths` の自動解決はPhase 2では広げず、未解決aliasでは `togostanza.config.ts` の `vite.resolve.alias` へ移す案内を出す方針にした。
- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` を、metadata gate付きのStanza間連携として再設計・実装した。
- event-mapは送信側の非bubbling CustomEventにも対応するため、containerが子custom elementにlistenerを張る方式にした。
- data-sourceはfetchした外部データをblob URLとして受信側parameterへ渡す最小方式にした。
- containerは連携対象のcustom elementが一部upgradeしない場合でも、上限付き待機後に揃っている要素だけで配線するようにした。
- Phase 1のGitHub Pages workflow placeholderを、npm / pnpm別の実deploy flowを持つworkflowへ置き換えた。
- 001から007の検証ケースREADMEに、Phase 2で確認したリメイク版の観測結果と現行版との差分を記録した。

## 意図的に残したこと

- `serve` / `s` の実装、watch、差分invalidate、HTTP 500エラーページ、修正後復帰。
- ヘルププレビューUI、生成物としての `index.html`、`-togostanza/`。
- React、Vue固有のcompatibility。
- `togostanza-utils` compatibility。
- 実プロジェクト群であるmetastanzaとTogoMedium Stanzaの回帰検証。
- npm公開metadata全体、`files`、`private` 解除、ローカルtarball install確認、live deploy確認。
- bare `init` をprompt付き入口として追加するかどうか。
- `package.json` への `scripts.build`、`packageManager` field生成。
- `tsconfig.json` の `compilerOptions.paths` 自動解決。
- root assetをStanzaソースから安定して参照するための公開API。
- source map内部のsources pathや列精度の詳細互換。
- 広範なmetadata schema validation。
- `stanza:include` の扱い。
- data-sourceのblob URL revoke、動的に追加されたcontainer / stanza / event-mapの再配線、複数receiverの選択規則。

## Phase 3へ渡す前提

- `build` は、Stanzaリポジトリroot判定、metadata検証、設定読み込み、共有ソース解決、asset解決、ランタイム埋め込みまでを含む公開用生成物作成として成立している。
- `serve` は `dist/` を書き換えない仕様である。Phase 3では、Phase 2のbuild基盤を再利用しつつ、メモリ上または一時領域のbuild相当生成物をHTTPで配信する設計から始める。
- `serve` でも、Stanzaソース、metadata、template、stylesheet、asset、設定、共通ファイルの変更検知が必要になる。
- Phase 2のbrowser testでは、生成物をfixture HTMLと別階層から読み込み、document baseとscript / CSS baseがずれても動くことを確認している。Phase 3のserve確認でも、URL解決の退行を拾う観点を維持する。
- browser test用のHTTP serverは、keep-alive接続が残らないように `closeAllConnections()` で後始末している。Phase 3でserver testを足す場合も同じ注意が必要である。
- `test:browser` を含む完了前確認は、`cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認する。

## Phase 4以降へ渡す前提

- Phase 2のランタイムは、素のcustom elementと既存Stanza source APIの最小契約を成立させた状態である。
- React、Vue、`togostanza-utils` 由来の互換propertyやframework固有のmount / unmount契約は、Phase 4で実プロジェクト回帰と合わせて扱う。
- `handleEvent()` はbase API名として存在し、Phase 2-5のcontainer連携から呼ばれる。複雑なイベント連携互換はPhase 4の実利用確認で必要に応じて広げる。
- GitHub Pages workflowは構造として実deploy flowを持つが、公開npm packageとしてのdependency解決とGitHub Actions上のlive deployはPhase 5で棚卸しし、配布前検証としてはPhase 12の責務である。

## 後続判断として残すこと

- Phase 3を単一計画にするか、`serve` の最小配信、watch、失敗復帰をサブフェーズ化するか。
- `serve` がbuild相当生成物をどこに保持するか。
- watchの依存グラフをViteに寄せるか、独自に入力ファイルを追跡するか。
- `serve` のプレビュー一覧を、ヘルププレビューUI復活として扱うか、Phase 3専用の最小一覧として扱うか。
- `serve` の初回ビルド失敗と再ビルド失敗を、どのURL単位でHTTP 500にするか。
- Phase 4に入る前に、Phase 2で残したランタイム内部API名やcompat propertyを整理するか。
- Phase 5で `exports`、`files`、`private`、dependency分類、Action version運用を棚卸しし、Phase 6以降またはPhase 12のどちらで固定するか。

## 確認結果

- Phase 2-6完了時点で `git diff --check` を実行し、問題なし。
- Phase 2-6完了時点で `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは62件、integration testは18件、browser testは6件が通った。

## 関連文書

- [Phase 2サブフェーズ計画](./index.md)
- [Phase 2-0引き継ぎ](./phase-2-0/handoff.md)
- [Phase 2-1引き継ぎ](./phase-2-1/handoff.md)
- [Phase 2-2引き継ぎ](./phase-2-2/handoff.md)
- [Phase 2-3引き継ぎ](./phase-2-3/handoff.md)
- [Phase 2-4引き継ぎ](./phase-2-4/handoff.md)
- [Phase 2-5引き継ぎ](./phase-2-5/handoff.md)
- [Phase 2-6引き継ぎ](./phase-2-6/handoff.md)
