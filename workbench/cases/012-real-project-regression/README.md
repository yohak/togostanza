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
