# 012 Real project regression

## 目的

**実プロジェクト群**であるmetastanzaとTogoMedium Stanzaを使い、合成検証ケースだけでは拾い切れない互換性回帰を確認する。

## 対応する方針

- **実プロジェクト群**は互換性判断の強い根拠として扱う。
- metastanzaは可能な限り固定点として扱い、外れる判断をする場合は理由と影響範囲を記録する。
- TogoMedium Stanzaは、必要なソース修正や移行手順も判断材料に含める。
- リファレンスリポジトリは汚さず、観測結果と差分をこの検証ケースに記録する。

## 入力条件

- `references/metastanza` をmetastanzaの入力として参照する。
- `references/togomedium-web` のTogoMedium Stanza領域を入力として参照する。
- 008、009、010で確認したReact、Vue、`togostanza-utils` 互換を、実プロジェクトのStanzaソースでも確認できるようにする。

## 現行版で観測すること

- 現行版でビルドできるstanzaと、既知の失敗または警告。
- 実プロジェクトで使われているentrypoint、stylesheet、template、asset、config、framework、`togostanza-utils` の利用箇所。
- 実プロジェクトが依存するランタイムDOM、menu、parameter、event、asset解決の挙動。

## リメイク版で観測すること

- 対象stanzaがリメイク版でビルドできること。
- 直接埋め込み、Shadow DOM、parameter、style、menu、framework mountが主要stanzaで崩れないこと。
- `togostanza-utils` の互換対象APIが実プロジェクト上で動くこと。
- 仕様上再設計した箇所について、必要な移行手順で復帰できること。

## 合格条件

- metastanzaとTogoMedium Stanzaの対象範囲、実行コマンド、観測結果が記録されている。
- 仕様で互換対象にした挙動が、実プロジェクト上で確認されている。
- 仕様で再設計または破棄した挙動は、差分、理由、移行メモが記録されている。
- 失敗が残る場合は、仕様違反、未実装、実プロジェクト側の移行対象、未固定事項のどれかに分類されている。

## リメイク版観測: 2026-07-01

実行環境:

- Node.js: `v24.5.0`
- pnpm: `10.28.2`
- references/metastanza: `4d4230d3`
- references/togomedium-web: `79d8f21`

確認手順:

- `cd package && mise exec -- pnpm run build`
- references配下は直接変更せず、一時ディレクトリへStanzaリポジトリroot相当のsymlinkを作成して確認した。
- 一時ディレクトリでは、リメイク版のcompiled CLIを `node /Volumes/DATA/repositories/togostanza-remake/package/bin/togostanza.mjs build --output-path dist-remake` で実行した。

### metastanza

対象:

- `references/metastanza/package.json`
- `references/metastanza/stanzas`
- `references/metastanza/common.scss`
- `references/metastanza/node_modules`

観測結果:

- `barchart`、`hash-table`、`linechart`、`pagination-table`、`piechart`、`scatterplot`、`scorecard`、`scroll-table`、`text`、`tree` の全Stanzaで `build` が成功した。
- `dist-remake/` には各Stanzaの `{id}.js`、`{id}.css`、`{id}.html`、`{id}/metadata.json` と、共有チャンク、package assetが生成された。
- Vue SFC、`togostanza-utils`、`@/common.scss`、root / package assetの基本経路は、合成ケースで確認済みのPhase 4機能を使って解決された。

差分と対応:

- `pagination-table/style.scss` は `@import "./@vueform/slider/themes/default";` でpackage内Sassを参照する。Sassの通常解決ではこの相対pathがStanzaディレクトリ基準になり失敗したため、リメイク版では `./@scope/...` 形式のSass package style importをroot `node_modules/` へ解決する互換処理を追加した。
- Sassから `@import` の非推奨警告が出る。これは現行ソース由来の警告であり、Phase 4ではビルド失敗にしない。
- 上記回帰は、packageのunit testに最小fixtureとして切り出した。

### TogoMedium Stanza

対象:

- `references/togomedium-web/@packages/stanza/package.json`
- `references/togomedium-web/@packages/stanza/stanzas`
- `references/togomedium-web/@packages/stanza/components`
- `references/togomedium-web/@packages/stanza/styles`
- `references/togomedium-web/@packages/stanza/utils`
- `references/togomedium-web/@packages/stanza/tsconfig.json`
- `references/togomedium-web/node_modules`

一時設定:

- `togostanza.config.ts` で `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` をreferences配下の実pathへ移した。
- 一時rootでは、`d3`、`d3-drag`、`colord`、`sleep-promise` を `@packages/stanza/node_modules/` 側から解決するaliasを追加した。これは一時rootのnode_modules構成による確認用設定であり、Phase 4では自動吸収の契約にしない。

観測結果:

- `gmdb-component-detail`、`gmdb-find-media-by-components`、`gmdb-find-media-by-organism-phenotype`、`gmdb-find-media-by-taxonomic-tree`、`gmdb-gms-by-tid`、`gmdb-media-alignment-table-by-components`、`gmdb-media-alignment-table-by-strains`、`gmdb-medium-builder`、`gmdb-medium-detail`、`gmdb-meta-list`、`gmdb-roundtree`、`gmdb-similar-media-node`、`gmdb-stats-culturable-species`、`gmdb-strain-detail`、`gmdb-taxon-detail` の全Stanzaで `build` が成功した。
- React / TSX、TogoMedium provider stack、MUI / Emotion関連chunk、共有チャンク、metadata、CSS、HTMLの生成まで確認した。
- `TogoMediumReactStanza` はclass field initializerで `this.root.querySelector("main")` と `createRoot()` を実行する。従来のリメイク版runtimeでは、subclass field initializer実行時に `this.root` が未設定になるため、この構成は壊れる可能性があった。
- リメイク版runtimeでは、Stanza subclassのconstructor / field initializerから `this.root` と `this.element` を参照できるようにした。この回帰はpackageのbrowser testに最小fixtureとして切り出した。
- Emotion / MUIのShadow DOM style到達リスクは、TogoMedium参照側の `@emotion/react` / `@emotion/cache` とReact / React DOMを使った合成browser testへ切り出した。`CacheProvider` の `container` をShadow DOMへ向けたReact Stanzaをdirect embedし、Emotion由来のstyleがShadow DOM内要素のcomputed styleへ反映されることを確認した。
- `gmdb-meta-list` を実TogoMedium Stanza入力としてdirect embedし、ローカルJSON fixtureへのAPI通信、タイトルとtable本文の描画、Shadow DOM内のtable style適用をbrowser testで確認した。この確認はTogoMedium Webアプリ全体ではなく、生成されたStanza artifact単体の視覚的なdirect embed smokeである。
- TogoMediumのdirect embed確認では、`treeshake: false` のVite build設定がMUI関連bundleの実行時例外を引き起こすことを検出した。リメイク版では明示的なtreeshake無効化をやめ、通常のVite / Rollup treeshakeへ戻した。

差分と移行メモ:

- 旧 `togostanza-build.js` / `.mjs` は自動実行しない。TogoMediumのaliasは、`togostanza.config.ts` の `vite.resolve.alias` へ移す。
- `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` の自動解決はPhase 4の契約にしない。実プロジェクト側の移行設定で扱う。
- 一時rootのdependency配置では、一部dependencyを `@packages/stanza/node_modules/` 側へ向けるaliasが必要だった。実プロジェクトの通常install済みworkspaceでの解決と、切り出しfixture上の解決は分けて扱う。

未確認または後続判断:

- TogoMedium Webアプリ本体のbuild / start、実APIを使った画面遷移、TanStack Query / Jotai / Reduxを含むアプリ全体のE2EはPhase 4の対象外である。
- Emotion / MUIについては、TogoMediumソースが `EmotionCacheProvider` でShadow DOM内へstyleを向ける構成を持つこと、buildが通ること、合成browser testでEmotion styleがShadow DOM内に適用されること、実TogoMedium Stanzaのdirect embed smokeでShadow DOM内の視覚スタイルが適用されることを確認した。動かない構成や未検証構成を落とす判断が必要になった場合は、TogoMediumへの影響を整理して人間判断を受ける。

## Phase 9 リメイク版ローカルcompatibility baseline: 2026-07-01

Phase 9では、Phase 4で行った実プロジェクト確認を、ローカルで再実行できる専用入口へ整理した。

実行環境:

- Node.js: `v24.5.0`
- pnpm: `10.28.2`
- references/metastanza: `4d4230d3`
- references/togomedium-web: `79d8f21`
- references/togostanza-utils: `daaf62c`
- `references/togostanza-utils` package version: `0.0.0`

確認コマンド:

- `cd package && mise exec -- pnpm run test:compat:local`

この確認は `references/` へ依存するため、default `check-all` には含めない。`check-all` は、Git管理された本リポジトリ内の入力だけで通る入口として維持する。

### version baseline

リメイク版パッケージ側:

- `react`: `19.2.7`
- `react-dom`: `19.2.7`
- `vue`: `^3.5.39`
- `@vitejs/plugin-vue`: `^6.0.7`

references側:

- `references/metastanza` の `vue`: `^3.2.11`
- `references/metastanza` の `togostanza-utils`: `github:togostanza/togostanza-utils`
- `references/togomedium-web` の `react`: `^19.2.4`
- `references/togomedium-web` の `react-dom`: `^19.2.4`
- `references/togomedium-web` の `@emotion/cache`: `^11.11.0`
- `references/togomedium-web` の `@emotion/react`: `^11.11.4`
- `references/togomedium-web` の `@mui/material`: `^7.3.9`
- `references/togomedium-web` の `@mui/icons-material`: `^7.3.9`

`test:compat:local` の `togostanza-utils` 単体確認では、`references/togostanza-utils` を一時rootの `node_modules/togostanza-utils` へcopyして使った。metastanzaの全Stanza build checkでは、`references/metastanza/node_modules` の依存を使った。TogoMedium Stanza build checkでは、`references/togomedium-web/node_modules` と、必要に応じて `@packages/stanza/node_modules` の依存を `togostanza.config.ts` の `vite.resolve.alias` で参照した。

### Stanza名の再照合

metastanzaは、ローカル `references/metastanza/stanzas` に存在するStanza名がPhase 9計画の10件と一致することをtest内で確認した。

- `barchart`
- `hash-table`
- `linechart`
- `pagination-table`
- `piechart`
- `scatterplot`
- `scorecard`
- `scroll-table`
- `text`
- `tree`

TogoMedium Stanzaは、ローカル `references/togomedium-web/@packages/stanza/stanzas` に存在するStanza名がPhase 9計画の15件と一致することをtest内で確認した。

- `gmdb-component-detail`
- `gmdb-find-media-by-components`
- `gmdb-find-media-by-organism-phenotype`
- `gmdb-find-media-by-taxonomic-tree`
- `gmdb-gms-by-tid`
- `gmdb-media-alignment-table-by-components`
- `gmdb-media-alignment-table-by-strains`
- `gmdb-medium-builder`
- `gmdb-medium-detail`
- `gmdb-meta-list`
- `gmdb-roundtree`
- `gmdb-similar-media-node`
- `gmdb-stats-culturable-species`
- `gmdb-strain-detail`
- `gmdb-taxon-detail`

### build check baseline

`test:compat:local` のunit側で、referencesを直接変更せず、一時rootへsymlinkしたStanzaリポジトリroot相当を作って確認した。

- metastanza全10 Stanzaの `build --output-path dist-remake`: 成功。
- TogoMedium Stanza全15 Stanzaの `build --output-path dist-remake`: 成功。
- `references/togostanza-utils` をimportする最小Stanzaのbuild: 成功。

metastanzaの `pagination-table` では、Sass `@import` の非推奨警告が出る。これは現行ソース由来の警告であり、Phase 9ではビルド失敗にしない。

TogoMedium Stanza確認では、`%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` に加え、一時rootの依存配置に合わせて `d3`、`d3-drag`、`colord`、`sleep-promise` を `togostanza.config.ts` の `vite.resolve.alias` へ明示した。これはTogoMedium固有aliasを自動吸収する契約ではない。

### browser smoke baseline

`test:compat:local` のbrowser側で、次の4件を直接埋め込みの軽量smokeとして確認した。

- Emotion合成Stanza: `CacheProvider` の `container` をShadow DOMへ向け、Emotion由来styleがcomputed styleへ反映されること。
- metastanza `scorecard`: custom element upgrade、Shadow DOM、ローカルJSON fixtureの読み込み、`togostanza-utils/load-data`、`renderTemplate()`、CSS反映。
- TogoMedium `gmdb-meta-list`: React / TSX、TogoMedium provider stack、MUI / Emotion、ローカルJSON fixtureへのAPI通信、Shadow DOM内style反映。
- `references/togostanza-utils` 最小Stanza: `loadData()`、`appendCustomCss()`、download menu item、`applyFilter()` の代表経路。

Phase 9計画ではmetastanza代表候補を `pagination-table` としていたが、direct embed smokeの試行で、Stanzaソースが `main.parentNode.style` を前提にしている差分が見つかった。リメイク版runtimeでは `main.parentNode` が `ShadowRoot` になるため、この構成は描画前に止まる。Phase 9では、全Stanza build baselineを維持しつつ、通す代表browser smokeは `scorecard` へ変更した。`pagination-table` のruntime互換をどう扱うかは、全Stanza browser smokeを扱うPhase 11で判断する。

## Phase 11-0 リメイク版compatibility harness hardening: 2026-07-02

Phase 11-0では、Phase 11-1以降の全Stanza browser smokeへ進む前に、local compatibility確認の入口を整理した。

確認したこと:

- `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` の必要pathを共通helperで確認し、不足時に不足pathと理由を診断できるようにした。
- metastanza 10件とTogoMedium Stanza 15件の対象名再照合を共通helperへ集約した。
- `test:compat:local` はdefault `check-all` に含めない方針を維持した。
- per-Stanza fixture dataの一時配置を `fixtures/<project>/<stanza>/...` へ寄せた。
- 既存の代表browser smokeは、metastanza `scorecard` とTogoMedium `gmdb-meta-list` のまま維持した。

この段階では、metastanza全10 StanzaとTogoMedium Stanza全15 Stanzaのbrowser smokeはまだ実行しない。Phase 11-0は、失敗時にどのreferences入力、対象Stanza、fixture dataが問題かを分類しやすくする土台である。browser console / pageerror / failed requestの共通収集と、対象Stanza ID、生成物path、fixture pathを含む失敗診断bundleは、Phase 11-1 / 11-2で全Stanza smoke-runnerと一緒に実装する。

## Phase 11-1 リメイク版metastanza full browser smoke: 2026-07-02

Phase 11-1では、metastanza全10 Stanzaをひとつの一時Stanzaリポジトリrootへsymlinkし、リメイク版CLIでbuildした生成物をブラウザで直接埋め込んで確認した。

確認コマンド:

- `cd package && mise exec -- pnpm run test:compat:local`

確認した対象:

- `barchart`
- `hash-table`
- `linechart`
- `pagination-table`
- `piechart`
- `scatterplot`
- `scorecard`
- `scroll-table`
- `text`
- `tree`

観測結果:

- 全10 Stanzaで module scriptの読み込み、custom element upgrade、open Shadow DOM、`main` の生成、ローカルfixture dataの読み込み、最小描画が成功した。
- グラフ系Stanzaでは、Vega / vega-embed によるSVG生成を確認した。
- `hash-table`、`pagination-table`、`scroll-table`、`scorecard`、`text` では、fixture data由来の表示内容を確認した。
- smoke-runnerは、失敗時に対象Stanza ID、生成物path、fixture path、data path、browser console error、pageerror、failed request、直近requestをまとめて出す。
- `pagination-table`、`scroll-table`、`hash-table` が依存する `main.parentNode.style` は、リメイク版runtimeで `main` をHTMLElement containerの内側に置くことで吸収した。`this.root` は引き続きShadowRootであり、`this.root.querySelector("main")` の経路も維持している。
- `text` はconstructorでKaTeXのCDN stylesheetを追加する。local compatibility smokeでは、この任意外部stylesheetの読み込み失敗はStanza本体のfatal failureとして扱わない。

fixture data:

- per-Stanza fixture dataは、一時root内の `fixtures/metastanza/<stanza-id>/...` に置いた。
- metadataの `stanza:example` を基本入力に使い、`data-url` はローカルfixtureへ差し替えた。
- `barchart`、`linechart`、`scatterplot` はgridとlegendを最小表示向けに明示的に無効化した。
- `piechart` はmetadata parameterにない `symbol-shape` をlegend側で参照するため、最小表示ではlegendを無効化した。

残る注意点:

- metastanzaのSass `@import` 非推奨警告は引き続き出る。現行ソース由来の警告であり、Phase 11-1でもbuild失敗にはしない。
- Phase 11-1のbrowser smokeは直接埋め込みの軽量確認であり、現行版とのpixel-level比較やUI操作網羅ではない。

## Phase 11-2 リメイク版TogoMedium full browser smoke: 2026-07-02

Phase 11-2では、TogoMedium Stanza全15件をひとつの一時Stanzaリポジトリrootへsymlinkし、リメイク版CLIでbuildした生成物をブラウザで直接埋め込んで確認した。

確認コマンド:

- `cd package && mise exec -- pnpm run test:compat:local`

確認した対象:

- `gmdb-component-detail`
- `gmdb-find-media-by-components`
- `gmdb-find-media-by-organism-phenotype`
- `gmdb-find-media-by-taxonomic-tree`
- `gmdb-gms-by-tid`
- `gmdb-media-alignment-table-by-components`
- `gmdb-media-alignment-table-by-strains`
- `gmdb-medium-builder`
- `gmdb-medium-detail`
- `gmdb-meta-list`
- `gmdb-roundtree`
- `gmdb-similar-media-node`
- `gmdb-stats-culturable-species`
- `gmdb-strain-detail`
- `gmdb-taxon-detail`

観測結果:

- 全15 Stanzaで module scriptの読み込み、custom element upgrade、open Shadow DOM、`main` の生成、最小描画が成功した。
- React / TSX、TogoMedium provider stack、MUI / Emotion、TanStack Query、Jotai / Reduxを含むStanza単体のdirect embed smokeが通った。
- 失敗時の診断は、対象Stanza ID、生成物path、fixture path、browser console error、pageerror、failed request、直近requestをまとめて出す。
- `gmdb-meta-list`、`gmdb-component-detail`、`gmdb-medium-detail`、`gmdb-strain-detail`、`gmdb-taxon-detail` では、fixture data由来の代表文字列を確認した。
- `gmdb-gms-by-tid`、`gmdb-roundtree`、`gmdb-stats-culturable-species` などのD3系Stanzaも、旧式API shapeに合わせたローカルfixtureで最小描画を確認した。

fixture data:

- per-Stanza fixture HTMLは、一時root内の `fixtures/togomedium/<stanza-id>/fixture.html` に置いた。
- TogoMedium Stanzaの多くは実API前提のため、fixture HTMLで `window.fetch` を差し替え、ローカルの最小JSON / text responseを返した。
- API responseは各Stanzaが参照する実API定義に合わせた。代表例として、`gmdb_media_alignment_by_gm_ids`、`gmdb_media_strains_alignment_by_gm_ids`、`gmdb_stat_media_tax_histgram`、`gmdb_organism_by_taxid`、旧式の `gms_by_kegg_tids_3` / `gms_kegg_code_tid` を含む。
- `gmdb-roundtree` は現行ソースの独自Newick parserに合わせ、root直下に2 branchを持つ最小Newickを使った。
- 外部Google Fontsの読み込み失敗は、Stanza本体のfatal failureとして扱わない。

差分と制約:

- TogoMediumの一時rootでは、`references/togomedium-web/node_modules` と `references/togomedium-web/@packages/stanza/node_modules` の依存を集約して使った。これはreferencesを汚さずにStanza package root相当を作るための検証用配置であり、TogoMedium固有のdependency配置をリメイク版が自動吸収する契約ではない。
- この確認は生成されたStanza artifact単体のdirect embed smokeであり、TogoMedium Webアプリ本体のE2E、実API接続、画面遷移、ユーザー操作網羅、pixel-level比較は含めない。
- `check-all` のhermetic browser suiteで、低頻度の `togostanza build` 失敗が観測された。再実行では解消し、Phase 11-2のTogoMedium smoke由来ではない。次に再現した場合は、Vite / esbuildが出すエラー全文、対象fixture、一時出力先を捕捉し、Phase 12またはCI化前の調査項目として扱う。

## Phase 11-3 リメイク版TogoMedium Web route smoke: 2026-07-02

Phase 11-3では、TogoMedium Webアプリ本体をVite dev serverで起動し、別ポートで動くリメイク版 `togostanza serve` からTogoMedium Stanza bundleを読み込む最小E2Eを確認した。

確認コマンド:

- `cd package && mise exec -- pnpm run test:compat:local`

確認した経路:

- 一時Stanzaリポジトリrootへ `references/togomedium-web/@packages/stanza` の全15 Stanzaをsymlinkした。
- 一時rootで `togostanza serve --port <stanza-port>` を起動した。
- `references/togomedium-web/@packages/web` をVite dev serverで起動した。
- Webアプリ側の `VITE_URL_STANZA` を `http://127.0.0.1:<stanza-port>` に向けた。
- `/find-media-by-components` をブラウザで開き、Webアプリが `<script src="<stanza-serve>/gmdb-find-media-by-components.js">` を生成し、`<togostanza-gmdb-find-media-by-components>` がupgradeしてShadow DOM内で最小描画されることを確認した。

観測結果:

- TogoMedium WebアプリのVite dev serverはreferencesを直接変更せずに起動できた。Vite cacheは一時ディレクトリへ向けた。
- Webアプリのローカルサーバーから、別ポートの `togostanza serve` が配信するStanza module scriptを読み込めた。
- `togostanza serve` のloopback CORS許可により、TogoMedium Webローカル確認の基本経路が成立した。
- browser console error、pageerror、fatal failed requestは発生しなかった。

差分と制約:

- 確認したのは `/find-media-by-components` の1ルートだけであり、Webアプリ全画面の巡回、実API接続、ユーザー操作、画面遷移、pixel-level比較は含めない。
- TogoMedium Webの外部共通ヘッダーscriptは、Stanza互換のfatal failureとして扱わない。
- Webアプリ側の環境変数は検証用に `VITE_URL_STANZA` をローカル `togostanza serve` へ向けた。公開環境のURL設計や配布済みStanzaのホスティングはPhase 12で扱う。

### Phase 11へ送るもの

- TogoMedium Webアプリ本体の追加E2E。Phase 11-3では1ルートのlocal smokeまで確認済み。
- React / Vue / Emotion / MUIの広いversion matrix。
- Runtime edge semantics。
- hermetic browser suiteの低頻度build flakeが再現した場合の原因調査。

## Phase 6 リメイク版workbench入力

Phase 6では、012用の `remake/generated-repo/` は新規作成しない。012は `references/metastanza` と `references/togomedium-web` を使う実プロジェクト回帰であり、Phase 6の目的であるrepo-local workbench入力整備とは分けて扱う。

実プロジェクト回帰の次の入口は、Phase 9で扱う。Phase 6では、012の記録を維持し、全Stanza browser確認、TogoMedium Webアプリ本体E2E、referencesローカル再現手順の完成は後続へ送る。

## 記録する差分

- 対象リポジトリ、commit、package manager、Node.jsバージョン。
- 対象stanzaと確認した機能領域。
- ビルド結果、ブラウザ観測結果、警告、エラー。
- 必要な移行メモと、合成検証ケースへ切り出すべき観測契約。

## 未決定事項

- 実プロジェクト回帰の対象stanzaをどこまで広げるか。
- 実プロジェクトを直接参照するだけで足りるか、小さなケース入力へ抽出する必要があるか。
- 自動化する範囲と、手動ブラウザ確認として残す範囲。
