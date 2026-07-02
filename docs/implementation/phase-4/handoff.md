# Phase 4: compatibility 引き継ぎ

この文書では、Phase 4完了後にPhase 5の棚卸し以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 4の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `index.tsx` entrypointを持つReact / TSX Stanzaを、Stanzaリポジトリ側の `react` / `react-dom` dependencyでビルドできるようにした。
- React / React DOMをCLI runtime dependencyにはせず、生成物側へbundleする方針を確認した。
- React Stanzaをdirect embedし、open Shadow DOM内 `main` へReact componentを描画できることを確認した。
- `this.params` をReact component propsへ渡し、属性変更後にReact側表示を再描画できることを確認した。
- React Stanzaで `this.importWebFontCSS()` が使えることを確認した。
- `.vue` importを含むVue SFC Stanzaをビルドできるようにした。
- Vue SFC処理はCLI build runtime dependencyとして `@vitejs/plugin-vue` を使う方針にした。
- `@vitejs/plugin-vue` のpeer dependencyを公開CLI相当でも満たすため、CLI側にも `vue` をbuild runtime dependencyとして置いた。
- Vue Stanzaをdirect embedし、open Shadow DOM内 `main` へVue componentを描画できることを確認した。
- Vue SFC `<style>` を `{id}.css` へ集約し、Shadow DOM内の描画へ適用できることを確認した。
- `references/togostanza-utils` の既存packageを修正せず、`togostanza-utils`、`togostanza-utils/load-data`、`togostanza-utils/apply-filter` のimport pathを解決できることを確認した。
- `loadData()` のJSON、CSV、TSV、SPARQL results JSON、loading / error DOM、cache、`__togostanza_id__` 付与を確認した。
- `appendCustomCss()`、download menu helpers、`dividerMenuItem()`、runtime menu item contractを確認した。
- `this.root.host.stanzaInstance.element` がhost custom elementを指すcompat propertyを追加・確認した。
- subclass field initializerから `this.root` / `this.element` を参照するTogoMedium型の実装に対応するため、Stanza subclassのconstructor / field initializer実行時点でruntime contextを読めるようにした。
- `references/metastanza` の代表対象として、全10 Stanzaのビルド成功を確認した。
- metastanzaの `pagination-table` で必要になった `./@scope/...` 形式のSass package style importをroot `node_modules/` へ解決する互換処理を追加した。
- `references/togomedium-web/@packages/stanza` の代表対象として、全15 Stanzaのビルド成功を確認した。
- TogoMedium Stanzaの `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` aliasは、`togostanza.config.ts` の `vite.resolve.alias` へ移す移行メモとして整理した。
- Emotion / MUIのShadow DOM style到達リスクを、合成browser testと実TogoMedium Stanzaのdirect embed smokeで確認した。
- 実TogoMedium `gmdb-meta-list` をdirect embedし、ローカルJSON fixtureへのAPI通信、本文描画、Shadow DOM内table style適用を確認した。
- `treeshake: false` がMUI関連bundleの実行時例外を引き起こすことを検出し、明示的なtreeshake無効化をやめた。
- 008、009、010、012ケースREADMEに、リメイク版の観測結果と差分を記録した。

## 意図的に残したこと

- React、Vue以外のframework support。
- MUI、Emotion、TanStack Query、Jotai、Redux provider stack全体の完全互換。
- TogoMedium Webアプリ本体のbuild / start / end-to-end検証。
- `togostanza-utils` 全APIの挙動互換。
- `togostanza-utils/data`、`Data` class、tree / graph helperの挙動互換。
- `togostanza-utils/load-data` の `showLoadingIcon()` / `hideLoadingIcon()` の直接import互換。
- SVG / PNG download出力の完全なバイト列一致。
- `togostanza-utils/params/data-chart.json` と `stanza:include` のinclude解決。
- `%stanza/*`、`%api/*`、`%core/*` などのTogoMedium固有aliasの自動吸収。
- `tsconfig.json` の `compilerOptions.paths` 自動解決。
- root assetをStanzaソースから安定して参照する公開API。
- 旧 `togostanza-build.js` / `.mjs` の自動実行。
- npm package公開、tarball install、live deploy確認。

## Phase 5の棚卸し以降で使う前提

- React / React DOM / Vue runtimeは、Stanzaリポジトリ側dependencyとして扱う。CLIは埋め込み先Webサイトへframework runtimeを要求しない。
- `@vitejs/plugin-vue` と `vue` は、Vue SFC処理のためのCLI build runtime dependencyである。Phase 5で棚卸しし、Phase 12またはPhase 6以降で `dependencies` / `files` / `exports` を整理する際、この分類を崩さない。
- `togostanza-utils` のdrop-in互換は、Phase 4で受け入れ対象にしたAPIに限る。純粋データ処理API全体を保証したわけではない。
- `togostanza-utils/apply-filter` はimport path解決と参考観測までを確認した。戻り値の詳細はPhase 4の互換契約にしていない。
- 実プロジェクト回帰では、`references/` を直接変更せず、一時ディレクトリへsymlinkまたはコピーしたStanzaリポジトリroot相当で確認した。
- metastanzaは、Phase 4時点では10 Stanzaすべてのビルド成功を確認済みである。ただし全Stanzaのブラウザ表示を網羅したわけではない。
- TogoMedium Stanzaは、Phase 4時点では15 Stanzaすべてのビルド成功と、`gmdb-meta-list` のdirect embed smokeを確認済みである。TogoMedium Webアプリ全体のE2Eは確認していない。
- Emotion / MUI関連で未検証または動かない構成が見つかった場合は、TogoMediumへの直接影響、他用途への波及可能性、対応コストを整理し、人間判断を受けてから扱う。
- Phase 4以降も、packageの品質確認やbrowser testは `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認する。

## Phase 5の棚卸し以降で注意すること

- Phase 5では、`@vitejs/plugin-vue`、`vue`、`vite`、`sass`、`handlebars` などbuild実行時に必要なdependencyを棚卸しし、公開CLI相当で欠けないようにする確認をPhase 12またはPhase 6以降へ分類する。
- `togostanza/config` はPhase 2-4で最小 `exports` を追加済みである。Phase 5では `exports`、`main`、`bin`、`files`、型定義の整合を棚卸しし、Phase 12またはPhase 6以降のどちらで扱うか分類する。
- 実プロジェクト回帰で使ったTogoMedium aliasは、自動解決ではなく `togostanza.config.ts` への移行設定として扱っている。公開CLIの互換機能として広げる場合は、別途仕様判断が必要である。
- `treeshake: false` はMUI関連bundleを壊したため、再導入しない。tree-shakingを明示変更する場合は、TogoMedium direct embed smokeを必ず確認する。
- Sass `@import` の非推奨警告は現行ソース由来としてPhase 4では許容した。将来のSass version変更でwarningからerrorへ変わる可能性は残る。
- Phase 4のbrowser testは実ブラウザで13件に増えている。実行時間やfixture dependencyが増えているため、CIや配布前検証での実行環境をPhase 5で棚卸しする。

## 後続判断として残すこと

- npm公開に向けた `package.json` metadata、`private`、`files`、`exports`、型定義、dependency分類をPhase 5で棚卸しし、Phase 12またはPhase 6以降へ分類すること。
- tarball install、`npm exec togostanza@...`、`pnpm dlx togostanza@...` の実解決確認をPhase 5で棚卸しし、Phase 12で扱うか判断すること。
- GitHub Actions上のlive deploy確認。
- TogoMedium Webアプリ本体のbuild / start / end-to-end検証をどのフェーズまたは配布前検証で扱うか。
- 実プロジェクト回帰を自動testへさらに寄せる範囲。
- React / Vue version差分をどこまで互換対象に含めるか。
- `togostanza-utils` の未対象APIを追加で扱うかどうか。
- `tsconfig paths` 自動解決やTogoMedium固有alias自動吸収を追加するかどうか。
- root asset参照API、`stanza:include`、package内JSON include解決をどう扱うか。

## 確認結果

- Phase 4完了時点で `git diff --check` を実行し、問題なし。
- Phase 4完了時点で `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは69件、integration testは19件、browser testは13件が通った。

## 関連文書

- [Phase 4設計](./plan.md)
- [008 Reactランタイム](../../../workbench/cases/008-react-runtime/)
- [009 Vueランタイム](../../../workbench/cases/009-vue-runtime/)
- [010 togostanza-utils compatibility](../../../workbench/cases/010-togostanza-utils-compat/)
- [012 Real project regression](../../../workbench/cases/012-real-project-regression/)
