# Phase 9: local compatibility baseline 設計

Phase 9は、実プロジェクト群を使ったローカルcompatibility確認を、後続フェーズへ再利用できるbaselineとして整えるフェーズである。

このフェーズでは、`references/` 配下のローカルリファレンスを使い、metastanzaとTogoMedium Stanzaのbuild check、代表Stanzaのbrowser smoke、React / Vue検証済みversionの記録を行う。CI化、配布検証、全Stanza browser smoke、TogoMedium Webアプリ本体E2Eは扱わない。

## 目的

- `references/` 依存のローカル再現手順を明文化する。
- metastanzaとTogoMedium Stanzaの全Stanza build checkを、Phase 4の一時確認から再実行可能な手順へ寄せる。
- 代表Stanza browser smokeを行い、buildだけでは拾えないruntime / Shadow DOM / asset / frameworkの基本崩れを確認する。
- React / Vue / Emotion / MUI / `togostanza-utils` について、検証済みversionと未確認範囲を記録する。
- Phase 11で扱う全Stanza browser smokeとTogoMedium Webアプリ本体E2Eの入口を整理する。

## 完了条件

- `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` を使うローカル再現手順を記録している。
- referencesが存在しない、または依存が未インストールの場合に、何が不足しているか分かる前提条件を記録している。
- `references/` を直接変更しない確認方法になっている。
- metastanzaの全10 Stanzaでbuild checkを再実行し、対象commit、対象Stanza、結果を012へ記録している。
- TogoMedium Stanzaの全15 Stanzaでbuild checkを再実行し、対象commit、対象Stanza、結果を012へ記録している。
- 代表Stanza browser smokeの対象と理由を記録している。
- 代表Stanza browser smokeで、custom element upgrade、Shadow DOM、最小描画、fatal console errorなし、CSS / asset loadを確認している。
- React / Vue / Emotion / MUI / `togostanza-utils` の検証済みversionを記録している。
- references依存の確認をdefault `check-all` に含めない方針を固定し、ローカルcompatibility確認用の専用入口を用意または明記している。
- Phase 11へ送る全Stanza browser smoke、TogoMedium Webアプリ本体E2E、Runtime edge semanticsを明示している。
- Phase 9完了後にhandoffを作る。

## 含めるもの

- `docs/implementation/phase-9/plan.md` の追加。
- `docs/implementation/index.md` へのPhase 9追加。
- referencesローカル再現手順の追加または012への追記。
- 012のリメイク版観測結果更新。
- 全Stanza build checkを再実行できる最小のpackage側テストまたは手順化されたスクリプト。
- 代表Stanza browser smokeを再実行できるpackage側browser testまたは手順化された確認。
- React / Vue検証済みversionの記録。
- references依存確認をdefault `check-all` から分けるための `test:compat:local` 相当の入口整理。

## 含めないもの

- `references/` のCI化。
- `references/` の自動取得、更新、submodule化。
- pack install smoke。
- npm package公開面の最終整理。
- 全Stanza browser smoke。
- TogoMedium Webアプリ本体E2E。
- React / Vueの広いversion matrix。
- TogoMedium固有aliasの自動吸収。
- `tsconfig paths` の自動解決。
- TogoMedium Web本体やreferences側ソースの修正。

## 前提

Phase 9は、ローカルに次のリファレンスが存在することを前提にする。

- `references/metastanza`
- `references/togomedium-web`
- `references/togostanza-utils`

これらは**リファレンス**であり、Phase 9では直接変更しない。必要な確認は、一時ディレクトリへsymlinkまたはcopyしたstanzaリポジトリroot相当で行う。

referencesが存在しない、または `node_modules/` が不足している場合、Phase 9では自動でnetwork installしない。手順文書に不足前提を記録し、必要なら人間がローカル環境を整える。

## 実プロジェクト確認方針

### metastanza

metastanzaでは、Phase 4でbuild成功を確認した全10 Stanzaを再確認する。

対象:

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

Phase 9では、全10 Stanzaのbuild checkをbaselineとして扱う。全10 Stanzaのbrowser smokeはPhase 11へ送る。

代表Stanza browser smokeの候補は、`pagination-table` とする。理由は、Vue SFC、package内Sass import、`togostanza-utils`、Shadow DOM内style適用の確認に効くためである。実装時に別Stanzaへ変える場合は、理由を012へ記録する。

### TogoMedium Stanza

TogoMedium Stanzaでは、Phase 4でbuild成功を確認した全15 Stanzaを再確認する。

対象:

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

Phase 9では、全15 Stanzaのbuild checkをbaselineとして扱う。全15 Stanzaのbrowser smokeとTogoMedium Webアプリ本体E2EはPhase 11へ送る。

代表Stanza browser smokeは、Phase 4で確認済みの `gmdb-meta-list` を維持する。理由は、React / TSX、TogoMedium provider stack、MUI / Emotion、ローカルJSON fixtureへのAPI通信、Shadow DOM内style適用をまとめて確認できるためである。

## aliasと設定の扱い

TogoMedium固有aliasは、Phase 8の方針どおり自動吸収しない。Phase 9のTogoMedium確認では、`togostanza.config.ts` の `vite.resolve.alias` へ明示して確認する。

`tsconfig paths` だけに依存するimportは、Phase 9では失敗してよい。必要なaliasは [source / config移行ガイド](../../guides/source-config-migration.md) に従って `togostanza.config.ts` へ移す。

## browser smokeの範囲

Phase 9でいうbrowser smokeは、軽量な直接埋め込み確認である。UIの完全E2Eではない。

最低限、次を確認する。

- 生成されたmodule scriptを読み込める。
- 対象custom elementがupgradeされる。
- open Shadow DOMが作られる。
- `main` または主要表示要素に最小描画が出る。
- fatalなbrowser console errorが出ない。
- CSSがShadow DOM内へ適用される。
- 対象Stanzaが依存するassetまたはlocal dataが読み込まれる。

ユーザー操作、全パラメーター組み合わせ、API網羅、TogoMedium Webアプリ全体のroutingや状態管理はPhase 9では扱わない。

## React / Vue version記録

Phase 9では、本開発で検証済みのversionだけを保証対象として記録する。

最低限、次を記録する。

- package側の `react` / `react-dom` 検証済みversion。
- package側の `vue` / `@vitejs/plugin-vue` 検証済みversion。
- references側で実際に使われたReact / Vue / Emotion / MUI関連version。
- `references/togostanza-utils` のcommitまたはpackage version。
- metastanzaやTogoMedium Stanzaが参照した `togostanza-utils` が、`references/togostanza-utils` と同一か、各プロジェクトの `node_modules` 内packageか。
- 広いversion matrixは未確認であり、実利用要求が出た場合だけPhase 11で広げること。

## 実装方針

### 手順化

Phase 9では、実プロジェクト回帰を毎回手作業で組み立て直さないようにする。

候補:

- package側に、referencesを入力として一時rootを作るtest helperを追加する。
- build checkは `test:compat:local` 相当の専用scriptへ寄せる。
- browser smokeもdefault `test:browser` ではなく、references依存のlocal compatibility確認として分ける。
- ただし、referencesが無い環境では明確にskipまたは前提不足として扱い、CI前提にはしない。

どの方法を採る場合も、referencesを直接変更しないことを守る。

references依存の確認は、default `check-all` に含めない。`check-all` は本リポジトリとGit管理された検証入力だけで通る品質確認入口として維持する。Phase 9実装時に既存のdefault browser testが `references/` を前提にしている場合は、`test:compat:local` 相当の入口へ移すか、default実行では明示skipする。

### 記録

012 READMEへ、Phase 9の実行結果として次を追記する。

- 実行日。
- Node.js / pnpm version。
- `references/metastanza` と `references/togomedium-web` のcommit。
- `references/togostanza-utils` のcommitまたはpackage version。
- metastanza / TogoMedium Stanzaが実際に参照した `togostanza-utils` の出所。
- 対象Stanza一覧。
- build check結果。
- browser smoke対象と結果。
- 必要だった移行設定。
- 残した未確認事項。

## 検証計画

ドキュメントのみの変更時:

- `git diff --check`

package実装またはtestに触れた場合:

- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run test:integration`
- 必要に応じて `cd package && mise exec -- pnpm run test:browser`
- references依存確認を追加した場合は、専用入口として `cd package && mise exec -- pnpm run test:compat:local` 相当を用意し、承認付き通常実行で確認する。

最終確認:

- `cd package && mise exec -- pnpm run check-all`
- `check-all` はreferences依存確認を含めない。

package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。browser testやserve確認が必要な場合は、サンドボックス環境ではなくユーザーのローカル環境を優先する。

## 残す論点

- referencesが存在しない環境で、testをskipにするか、明示失敗にするか。
- `test:compat:local` をpackage scriptとして追加するか、手順化されたローカル確認に留めるか。
- metastanzaの代表browser smokeを `pagination-table` に固定するか。
- TogoMedium代表browser smokeを `gmdb-meta-list` に固定するか。
- React / Vue version記録をどの文書へ置くか。
- Phase 11の全Stanza browser smokeで使う合格条件をどこまでPhase 9で前倒しするか。

## 成果物

- `docs/implementation/phase-9/plan.md`
- `docs/implementation/index.md` のPhase 9追加
- 012 READMEのPhase 9観測結果
- referencesローカル再現手順
- 必要に応じたpackage側test helperまたは確認スクリプト
- Phase 9完了後の `docs/implementation/phase-9/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 8引き継ぎ](../phase-8/handoff.md)
- [source / config移行ガイド](../../guides/source-config-migration.md)
- [012 Real project regression](../../../workbench/cases/012-real-project-regression/README.md)
- [実装計画](../index.md)
