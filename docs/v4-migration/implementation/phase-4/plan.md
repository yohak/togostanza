# Phase 4: compatibility 設計

Phase 4は、Phase 2とPhase 3で成立したbuild、ランタイム、`serve` を、既存Stanzaソースに近い入力へ当て、React、Vue、`togostanza-utils`、実プロジェクト回帰の互換性を確認するフェーズである。

このフェーズでは、新しい機能を広げることよりも、既存Stanzaソースが依存している開発契約と利用契約を観測可能な形で閉じることを優先する。

## 目的

- TSX / Reactで書かれたStanzaソースをビルドし、direct embedで動かせるようにする。
- Vue SFCをimportするStanzaソースをビルドし、direct embedで動かせるようにする。
- `togostanza-utils` のうち、TogoStanzaランタイムAPI、runtime menu contract、生成DOM構造に触れるAPIを、既存packageに手を入れずに使えるか確認する。
- `togostanza-utils/apply-filter` は挙動互換対象にしないが、既存Stanzaソースの無変更移行のためimport path解決は確認する。
- **実プロジェクト群**であるmetastanzaとTogoMedium Stanzaを使い、合成ケースだけでは拾い切れない互換性回帰を確認する。
- 008、009、010、012ケースREADMEに、リメイク版の観測結果、差分、移行メモ、未固定事項を記録する。

## 完了条件

- 008ケース相当のReact / TSX Stanzaソースが、リメイク版 `build` で生成物を作れる。
- React / TSX生成物をdirect embedで読み込み、open Shadow DOM内 `main` へReact componentをマウントできる。
- React componentへ `this.params` をpropsとして渡せる。
- 属性変更後にReact側の表示を再描画できる。
- React runtimeや共有チャンクが、静的配信とGitHub Pages相当のサブパス配信で壊れない相対URLとして解決できる。
- 009ケース相当のVue SFC Stanzaソースが、リメイク版 `build` で生成物を作れる。
- Vue生成物をdirect embedで読み込み、open Shadow DOM内 `main` へVue componentをマウントできる。
- Vue runtimeや共有チャンクが、静的配信とGitHub Pages相当のサブパス配信で壊れない相対URLとして解決できる。
- 010ケース相当の `togostanza-utils` 受け入れ対象APIが、既存packageを修正せずにビルド・実行できる。
- `loadData()`、loading / error DOM、`appendCustomCss()`、download menu helpers、`dividerMenuItem()`、runtime menu item contract、`root.host.stanzaInstance.element` compat propertyを確認する。
- `togostanza-utils/apply-filter` のimport pathが解決できる。戻り値は参考観測として記録するが、Phase 4の挙動互換対象にはしない。
- 012ケースに、metastanzaとTogoMedium Stanzaの対象範囲、実行コマンド、観測結果、差分、残った分類を記録する。
- 実プロジェクト上の失敗が残る場合は、仕様違反、未実装、実プロジェクト側の移行対象、未固定事項のどれかに分類する。
- Emotion / MUI関連で動かない構成や未検証の構成が見つかった場合は、実装者判断だけでPhase 4対象外にしない。TogoMediumへの直接影響、他Stanzaへの波及可能性、対応コスト、後続フェーズへ送る場合のリスクを整理し、人間判断を受けてから扱いを決める。
- 008、009、010、012ケースREADMEにリメイク版観測を追記する。
- Phase 4完了後にhandoffを作る。

## 含めるもの

- `index.tsx` entrypointのReact / TSXビルド確認。
- React runtime、React DOM、共有チャンク、属性変更後の再描画。
- `this.root.querySelector("main")` をReactマウント対象にする経路。
- Vue SFC importとVue runtime bundling。
- Vue SFC用のVite plugin導入方針の確定。
- `this.root.querySelector("main")` をVueマウント対象にする経路。
- `togostanza-utils` の対象import path解決。
- `togostanza-utils` が依存するruntime compat propertyとDOM構造。
- `root.host.stanzaInstance.element` のcompat property。
- runtime menu item / divider contract。
- download helperのhandler実行時にruntime構造依存の例外が出ないこと。
- metastanzaとTogoMedium Stanzaの代表的な実プロジェクト回帰。
- 旧設定やaliasなど、実プロジェクトで必要になる移行メモ。

## 含めないもの

- React、Vue以外のframework support。
- MUI、Emotion、TanStack Query、Jotai、Redux provider stack全体の完全互換。
- TogoMedium Webアプリ本体のbuild / start / end-to-end検証。
- `togostanza-utils` 全APIの挙動互換。
- `Data` class、tree / graph helperの挙動互換。
- SVG / PNG download出力の完全なバイト列一致。
- `stanza:include` の最終仕様。
- `togostanza-utils/params/data-chart.json` のinclude解決。
- HMR、自動reload、`serve` のwatch性能最適化。
- npm package公開、tarball install、live deploy確認。

## サブフェーズ

Phase 4は、1つの詳細計画の中でサブフェーズを切って進める。実装中に範囲が膨らんだ場合は、必要に応じて `docs/v4-migration/implementation/phase-4/phase-4-x/` へ分割する。

### 4-0 inventory / fixture strategy

4-0では、実装前に入力と検証方法を固める。

対象:

- 008、009、010、012ケースの既存入力を確認する。
- package testで使う最小fixtureと、workbenchケースで記録する観測を分ける。
- `references/` は読み取り対象とし、直接変更しない。
- 実プロジェクト回帰は、必要なら一時ディレクトリへコピーして確認する。
- 実プロジェクト回帰のdependencyは、`references/` 内に既存の `node_modules/` がある場合は読み取り利用を優先する。足りない場合は、一時コピー側で対象プロジェクトの通常手順に従ってinstallする。
- package automated testではnetwork installを前提にしない。実プロジェクト由来の回帰をpackage testへ切り出す場合は、必要最小のdependencyに分離したfixtureにする。
- 実プロジェクト全体を最初から完全自動化しない。代表stanzaと観測範囲を先に固定する。
- 008、009、010は、既存の `current-pnpm/generated-repo/` と同じ入力意図をリメイク版で確認する。
- 012は、metastanzaとTogoMedium Stanzaから代表対象を選ぶ。

代表対象の初期候補:

- metastanza: Vue SFCを使う `pagination-table` または `scroll-table`。
- metastanza: `togostanza-utils` とpackage assetを使う `text` または `scorecard`。
- TogoMedium Stanza: `TogoMediumReactStanza` 標準形のReact / TSX stanzaを1つ以上。
- TogoMedium Stanza: `%stanza/*`、`%core/*`、`%api/*` などのalias移行が必要な入力。

### 4-1 React / TSX runtime

4-1では、008ケースをリメイク版で通す。

対象:

- `index.tsx` をStanza entrypointとして検出する。
- Vite / esbuildでTSXをビルドする。
- ReactとReact DOMはStanzaリポジトリ側のdependenciesとして解決し、CLIのランタイム依存にはしない。
- `tsconfig.json` の `jsx`、`jsxImportSource`、`compilerOptions` を、Viteが解決できる範囲で尊重する。
- `this.root.querySelector("main")` をReact `createRoot()` のマウント対象にする。
- `this.params` をReact component propsへ渡す。
- 属性変更後に `handleAttributeChange()` から再描画できることを確認する。
- `this.importWebFontCSS()` がReact stanzaでも使えることを確認する。
- React runtimeチャンクが相対importで解決できることを確認する。
- React側の再描画は、StanzaソースがReact rootを再利用する前提で確認する。`createRoot()` を毎回呼ぶ実装のwarningやleakは、CLI側では吸収しない。

判断:

- React / React DOMは、埋め込み先Webサイトへ要求しない。必要なruntimeは生成物側へbundleする。
- MUI / Emotionなどのprovider stackは、4-1では持ち込まない。TogoMedium Stanza回帰で必要になった範囲を4-4で扱う。ただし、未検証または不成立の構成を「TogoMediumに関係しない」と実装者だけで判断して落とさない。
- CSS-in-JSがdocument headへstyleを注入し、Shadow DOM内の描画へ効かない問題は、Phase 4の高リスク項目として扱う。4-1では最小React表示に集中し、4-4でEmotion cacheやprovider設定を含めて分類する。
- React versionの細かな互換範囲は固定しない。008ケースと実プロジェクトで使うversionが動くことを確認対象にする。

### 4-2 Vue SFC runtime

4-2では、009ケースをリメイク版で通す。

対象:

- `.vue` importをVite buildで処理できるようにする。
- Vue runtimeはStanzaリポジトリ側のdependenciesとして解決し、埋め込み先Webサイトへ要求しない。
- Vue SFC処理に必要なVite pluginは、Phase 4で実装方針を固定する。
- 推奨方針は、リメイク版CLI側のbuild runtime依存としてVue SFC用pluginを持ち、Stanza開発者が旧 `togostanza-build.mjs` でVue pluginを注入しなくても最小Vue SFCをビルドできるようにすることである。
- ただし、pluginやpeer dependencyの配置で公開CLIの依存分類に影響する場合は、後続へ送らずPhase 4内で `dependencies` / `devDependencies` の扱いを決める。
- Phase 4-2実装では、`@vitejs/plugin-vue` のpeer dependencyを公開CLI相当でも満たすため、CLI側のbuild runtime dependencyとして `vue` も `dependencies` に置く。Stanzaソース内の `import "vue"` は、引き続きStanzaリポジトリ側dependenciesから解決する。
- `this.root.querySelector("main")` をVue `createApp()` のマウント対象にする。
- `this.params` をVue propsへ渡す。
- Vue runtimeチャンクが相対importで解決できることを確認する。
- Vue SFC `<style>` がShadow DOMへ届くことを確認する。ViteのCSS出力が独立assetになる場合は、`{id}.css` 相当へ集約するか、runtime登録時にShadow DOMへlink / styleとして注入できるURLとして扱うかを4-2で決める。

判断:

- 旧 `togostanza-build.mjs` のRollup plugin注入は無条件実行しない。
- 旧設定を検出した場合は、Phase 2-4の警告方針に従い、必要なら `togostanza.config.ts` またはbuilt-in Vue supportへ移行する説明を残す。
- Vue SFC compiler / pluginは、Stanzaリポジトリ側のVue runtimeとmajor version不一致にならないように解決する。CLI同梱compilerで固定して互換範囲を狭める場合は、その理由と影響を009または012ケースへ記録する。
- Vue versionの細かな互換範囲は固定しない。009ケースとmetastanza代表stanzaが動くことを確認対象にする。

### 4-3 `togostanza-utils` compatibility

4-3では、010ケースをリメイク版で通す。

対象:

- `togostanza-utils` package自体を修正しない。
- 010ケースでは、`references/togostanza-utils` の既存package実体を正本として使う。`references/metastanza/node_modules/togostanza-utils` は同一性の再確認やfallbackに留める。手書きshimや再実装fixtureで代替しない。
- `togostanza-utils`、`togostanza-utils/load-data`、`togostanza-utils/apply-filter` のimport pathを解決する。
- `togostanza-utils/spinner.png` は、関数API互換ではなくpackage asset解決として扱う。Phase 2-4 / 007で確認済みの観点と重なる場合は、010ではruntime互換側の観測に集中する。
- `loadData()` がJSON、CSV、TSV、SPARQL results JSONを読み込めることを確認する。
- `loadData()` がloading / error DOMを `mainElement` へ出し、完了後にloading DOMを消せることを確認する。
- `togostanza-utils/load-data` のnamed exportである `showLoadingIcon()` / `hideLoadingIcon()` は、実プロジェクトでの直接利用が観測されていないためPhase 4では直接受け入れ対象にしない。loading / error DOM互換は `loadData()` 経由で確認する。
- `loadData()` が配列データに `__togostanza_id__` を付与することを確認する。
- 同じURL / type / limit / offsetの連続呼び出しでcacheを返すことを確認する。
- `appendCustomCss()` がshadow root内の `link[data-togostanza-custom-css]` を差し替えることを確認する。
- download menu helpersがruntime menu item contractに合うitemを返し、handler実行時にruntime構造依存の例外が出ないことを確認する。
- `dividerMenuItem()` が `{ type: "divider" }` を返すことを確認する。
- `this.root.host.stanzaInstance.element` がhost custom elementを指すcompat propertyを提供する。

判断:

- `togostanza-utils/apply-filter` は、import path解決と参考観測に留める。戻り値の詳細はPhase 4の互換契約にしない。
- `Data` class、tree / graph helperはPhase 4の受け入れ対象にしない。実プロジェクト直接利用が見つかった場合は、012で分類して後続判断へ送る。
- SVG / PNG downloadの出力内容はバイト列比較しない。Phase 4ではhandler実行時のruntime構造依存エラーがないことを確認する。

### 4-4 real project regression

4-4では、012ケースを使って実プロジェクト回帰を確認する。

対象:

- `references/metastanza` と `references/togomedium-web` は読み取り対象として扱い、直接変更しない。
- 必要な確認は一時ディレクトリまたはworkbench内の検証環境で行う。
- 実プロジェクト依存関係は `references/` を汚さない。既存 `node_modules/` を読み取り利用できる場合は利用し、installが必要な場合は一時コピー上で対象プロジェクトの通常手順に従う。
- metastanzaでは、Vue SFC、`togostanza-utils`、Sass `@/common.scss`、package asset、`this.root.querySelector("main")` の代表経路を確認する。
- TogoMedium Stanzaでは、React / TSX、`TogoMediumReactStanza` 相当のprovider、`handleAttributeChange()`、`importWebFontCSS()`、`togostanza-menu-placement="none"`、alias移行、CSS-in-JSのShadow DOM到達の代表経路を確認する。
- 実プロジェクト全体のWebアプリ側buildやE2Eは対象外にする。
- 実プロジェクト回帰で見つかった不足は、合成ケースへ切り出すか、移行メモへ送るか、Phase 4内で修正するか分類する。

判断:

- metastanzaは可能な限り固定点として扱う。外れる判断をする場合は、理由と影響範囲を012ケースへ記録する。
- TogoMedium Stanzaは、必要なソース修正や移行手順も判断材料に含める。
- CSS-in-JSがdocument headへ注入されShadow DOM内に効かない場合は、runtime側不足、Stanza側移行対象、provider設定不足、後続送りのどれかに分類する。Emotion cacheをShadow rootへ向ける必要がある場合は、TogoMedium Stanzaの移行メモとして記録する。
- Emotion / MUI関連で落とす・深追いしない判断が必要になった場合は、TogoMediumへの直接影響、他用途への波及可能性、対応コストをまとめて相談する。人間判断なしにPhase 4対象外へ送らない。
- `%stanza/*`、`%api/*`、`%core/*` のようなaliasは、Phase 2-4で残した未対応領域とつながる。Phase 4で自動吸収するか、`togostanza.config.ts` の `vite.resolve.alias` へ移すか、実プロジェクト回帰の結果を見て判断する。
- 旧 `togostanza-build.js` / `.mjs` の自動実行はしない。必要な設定は `togostanza.config.ts` へ移す方針を維持する。

### 4-5 documentation / handoff

4-5では、Phase 4の完了状態を記録する。

対象:

- 008ケースREADMEに、React / TSXのリメイク版観測結果を記録する。
- 009ケースREADMEに、Vue SFCのリメイク版観測結果を記録する。
- 010ケースREADMEに、`togostanza-utils` 互換のリメイク版観測結果を記録する。
- 012ケースREADMEに、実プロジェクト回帰の対象範囲、実行コマンド、観測結果、差分、分類を記録する。
- 仕様や方針の意味変更が必要になった場合は、`docs/v4-migration/spec/index.md` または `docs/v4-migration/spec/remake-policy.md` を更新する。
- Phase 4 handoffを作成する。

## 実装方針

### framework dependencies

React、React DOM、Vue runtimeは、Stanzaリポジトリ側のdependenciesとして扱う。リメイク版CLIは、埋め込み先Webサイトにこれらのdependencyを要求しない。必要なruntimeは、build生成物のbundleまたは共有チャンクとして出力する。

Vue SFC処理に必要なVite pluginは、CLI内部のbuild runtimeとして必要になる可能性が高い。Phase 4では、公開CLIで `build` が動くことを前提に、必要なpluginを `dependencies` に置くか、Stanzaリポジトリ側の `togostanza.config.ts` で明示するかを決める。Phase 4の推奨は、最小Vue SFCについてはbuilt-in supportに寄せることである。

### fixture strategy

package testでは、実装の回帰を早く拾える最小fixtureを使う。workbenchケースREADMEでは、現行版とリメイク版の観測結果、生成物ツリー、ブラウザ観測、差分を記録する。

既存の `workbench/cases/*/current-pnpm/generated-repo/` は現行版観測用入力である。リメイク版確認では、同じ入力意図を使うが、旧 `togostanza-build.mjs` や現行版固有設定をそのまま実行する前提にはしない。

実プロジェクト回帰では、`references/` を直接変更しない。必要な場合は一時ディレクトリへコピーし、観測結果だけを012ケースへ記録する。

### runtime compat properties

Phase 2で `this.root`、`this.element`、`this.root.host.stanzaInstance.element` の一部土台は成立している。Phase 4では、`togostanza-utils` と実プロジェクトが依存する範囲で、compat propertyを追加・確認する。

追加するcompat propertyは、公開APIとして望ましいかどうかではなく、既存Stanzaソース無変更移行のために必要かどうかで判断する。望ましくない内部構造依存を受け入れる場合は、理由と影響範囲を010または012ケースへ記録する。

### diagnostics and migration notes

旧設定、alias、unsupported import、framework plugin不足などで失敗する場合は、単にViteのresolve errorを見せるだけでなく、可能な範囲で移行先が分かる診断へ寄せる。

ただしPhase 4では、すべてのmigration guideを完成させない。実プロジェクト回帰で観測された差分を、012ケースとhandoffへ分類して残す。

## 検証計画

Unit test:

- React / TSX entrypointを含むStanzaをbuildできる。
- Vue SFC importを含むStanzaをbuildできる。
- `togostanza-utils` が必要とするruntime compat propertyを確認する。
- menu item / divider contractが既存helperと噛み合う。
- unsupported aliasや旧設定に対して、移行先が分かる診断を返す。

Integration test:

- bin entry経由でReact / TSX Stanzaをbuildできる。
- bin entry経由でVue SFC Stanzaをbuildできる。
- 生成物にReact / Vue runtimeまたは共有チャンクが含まれ、サブパス安全な相対URLになっている。
- `serve` 経由でもReact / Vueの最小プレビューを読める。

Browser test:

- 008相当のdirect embedでReact componentがShadow DOM内 `main` に描画される。
- React Stanzaで属性変更後に表示が更新される。
- 009相当のdirect embedでVue componentがShadow DOM内 `main` に描画される。
- Vue SFC `<style>` がShadow DOM内の描画へ適用されるか、適用できない場合は009または012ケースへ分類を記録する。
- TogoMediumで使われるEmotion / MUI経路は、styleがShadow DOM内の描画へ効くところまで確認する。確認できない構成や動かない構成は、自動的に対象外にせず判断材料として報告する。
- 010相当のdirect embedで `togostanza-utils` の受け入れ対象観測値が `ok` になる。
- download menu helperのhandler実行時にruntime構造依存の例外が出ない。

Workbench / documentation:

- 008、009、010、012ケースREADMEにリメイク版観測を追記する。
- 実プロジェクト回帰は、対象stanza、実行コマンド、Node.js / pnpm version、生成物、ブラウザ観測、差分を記録する。

確認コマンド:

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、sandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。

## 後続へ送る事項

- React、Vue以外のframework support。
- MUI、Emotion、TanStack Query、Jotai、Redux provider stack全体の完全互換。
- TogoMedium Webアプリ本体のE2E。
- `togostanza-utils` 全API互換。
- `Data` class、tree / graph helperの挙動互換。
- SVG / PNG download出力の完全なバイト列一致。
- `stanza:include` とpackage内JSON include解決。
- root assetをStanzaソースから安定して参照する公開API。
- alias合成順とtsconfig paths自動解決の完全仕様。
- ヘルププレビューUIの完全復元。
- npm package公開、tarball install、live deploy確認。

## 確認が必要な論点

- Vue SFC supportをbuilt-inにする場合、どのVite pluginをCLI runtime dependencyとして持つか。
- Vue pluginのpeer dependencyを、CLI側とStanzaリポジトリ側のどちらで解決するか。
- 010ケースで `references/togostanza-utils` の既存package実体をpackage testへどう取り込むか。GitHub dependencyをネットワーク越しに取得せず、読み取り元を固定して観測を安定させる必要がある。
- 実プロジェクト回帰を自動testに寄せる範囲と、012ケースの手動観測記録に留める範囲。
- 実プロジェクト回帰でdependency installが必要になった場合に、一時コピーでどこまで通常手順を実行し、package automated testへどこから最小fixtureとして切り出すか。
- `%stanza/*`、`%api/*`、`%core/*` aliasをPhase 4で自動吸収するか、`togostanza.config.ts` への移行メモに留めるか。
- `togostanza-utils/data` を後続で扱うかどうか。

## 関連文書

- [Phase 2引き継ぎ](../phase-2/handoff.md)
- [Phase 3引き継ぎ](../phase-3/handoff.md)
- [008 Reactランタイム](../../../../workbench/cases/008-react-runtime/)
- [009 Vueランタイム](../../../../workbench/cases/009-vue-runtime/)
- [010 togostanza-utils compatibility](../../../../workbench/cases/010-togostanza-utils-compat/)
- [012 Real project regression](../../../../workbench/cases/012-real-project-regression/)
