# Phase 11: compatibility verification 設計

Phase 11は、Phase 9で作ったlocal compatibility baselineを広げ、実プロジェクト群とruntime edge semanticsの残りを確認するフェーズである。

このフェーズでは、`references/` 配下のローカルリファレンスを使う確認を継続する。default `check-all` には含めず、`test:compat:local` 系のローカルcompatibility確認として扱う。CI化、配布検証、pack install smoke、npm package公開面の最終整理は扱わない。

## 目的

- metastanza全10 Stanzaのbrowser smokeを行う。
- TogoMedium Stanza全15 Stanzaのbrowser smokeを行う。
- TogoMedium Webアプリ本体E2Eを、Phase X前に一度確認できる最小入口として設計・実行する。
- Phase 2-3から残したruntime edge semanticsを、現行版観測とリメイク版確認で整理する。
- Phase X前に再実行すべきcompatibility確認の入口と、残るリスクを明確にする。

## 完了条件

- `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` の前提と対象commitを再記録している。
- `references/` を直接変更しない確認方法になっている。
- build check前に、計画で列挙したStanza名とローカル `references/` の現在checkoutに存在するStanza名を再照合している。
- metastanza全10 Stanzaでbrowser smokeを実行し、結果を012へ記録している。
- TogoMedium Stanza全15 Stanzaでbrowser smokeを実行し、結果を012へ記録している。
- `pagination-table`、`scroll-table`、`hash-table` など、`main.parentNode.style` に依存するmetastanzaのruntime差分を分類している。
- TogoMedium Webアプリ本体E2Eの起動条件、必要環境、最小画面、合格条件、実行結果またはblockerを012へ記録している。
- Runtime edge semanticsについて、現行版観測、リメイク版確認、固定する挙動、固定しない挙動を004 / 005 / 013または専用記録へ反映している。
- Runtime edge semanticsの現行版観測手段を、`references/togostanza` のソース読解を既定、必要時のみ現行版running観測として定義している。
- Runtime edge semanticsの固定/非固定/根拠を集約する索引を用意している。
- Runtime edge semanticsを外部契約として固定する判断が出た場合は、`docs/spec/index.md` または `docs/spec/remake-policy.md` へ反映している。
- Runtime edge semanticsを固定しない、または判断を保留する場合は、`docs/investigation/follow-ups.md` または `docs/investigation/open-questions.md` へ戻している。
- runtime変更を行った場合は、影響するStanzaのbrowser smokeを再実行し、結果を記録している。
- React / Vue / Emotion / MUIの広いversion matrixは、実利用要求がない限り広げないことを維持している。
- references依存確認をdefault `check-all` に含めない方針を維持している。
- Phase 11完了後にhandoffを作る。

## 含めるもの

- `docs/implementation/phase-11/plan.md` の追加。
- `docs/implementation/index.md` へのPhase 11計画リンク追加。
- 012 READMEのPhase 11観測結果更新。
- metastanza全10 Stanzaのbrowser smoke。
- TogoMedium Stanza全15 Stanzaのbrowser smoke。
- TogoMedium Webアプリ本体E2Eの最小確認。
- Runtime edge semanticsの現行版観測とリメイク版確認。
- Runtime edge semanticsの集約索引。
- 必要に応じたpackage側のlocal compatibility test helper更新。
- Phase 11完了後の `docs/implementation/phase-11/handoff.md`。

## 含めないもの

- `references/` のCI化。
- `references/` の自動取得、更新、submodule化。
- `references/` 側ソースの修正。
- pack install smoke。
- npm package公開面の最終整理。
- GitHub Actions上でのlive deploy確認。
- React / Vue / Emotion / MUIの広いversion matrix。
- TogoMedium固有aliasの自動吸収。
- `tsconfig paths` の自動解決。
- すべてのUI操作パターン、API網羅、視覚差分のpixel-level一致。

## サブフェーズ

### Phase 11-0: compatibility harness hardening

目的は、Phase 9の `test:compat:local` を全Stanza browser smokeへ広げられる状態にすることである。

確認すること:

- `references/` の存在確認と不足時の診断。
- metastanza / TogoMedium Stanzaの対象名再照合。
- 一時root作成、fixture生成、静的配信、browser console収集の共通化。
- `@compat-local` をdefault `test:browser` から除外し続けること。
- smoke失敗時に、対象Stanza ID、生成物path、fixture path、主要console errorが分かること。
- per-Stanza fixture dataは、一時rootでは `fixtures/<project>/<stanza>/...` に置く。commitするfixtureを追加する場合も同じ論理pathを維持する。
- Runtime edge semanticsのrunning観測が必要な場合だけ、現行版build+embedの最小観測経路を用意する。

Phase 11-0では、全Stanzaを通すことよりも、失敗を分類できるharnessにすることを優先する。

ただし、browser console収集の共通化とper-Stanzaの失敗診断bundleは、全Stanza smoke-runnerの形が見えてから実装する。Phase 11-0ではreferences診断、対象名再照合、fixture data規約を先に固定し、console / pageerror / failed requestの収集と「どのStanzaのどの前提が壊れたか」の診断はPhase 11-1 / 11-2でsmoke-runnerと一緒に作る。

現行版running観測は、Phase 11-0で全項目に用意しない。Phase 11-4では `references/togostanza` のソース読解を既定の現行版観測手段にし、ソースだけで判断できないruntime/browser相互作用に限ってrunning観測経路を足す。

### Phase 11-1: metastanza full browser smoke

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

最低限確認すること:

- module scriptを読み込める。
- custom elementがupgradeされる。
- open Shadow DOMが作られる。
- `main` または主要表示要素に最小描画が出る。
- fatalなbrowser console errorが出ない。
- CSSがShadow DOM内へ適用される。
- 対象Stanzaが依存するassetまたはlocal dataが読み込まれる。

`pagination-table`、`scroll-table`、`hash-table` などで見つかっている `main.parentNode.style` 依存は、Phase 11で分類する。リメイク版runtimeを変更して吸収する、実プロジェクト側の移行対象にする、または互換対象外にする、のいずれかを人間判断できる形にする。

Phase 11-1のsmoke-runnerでは、対象Stanza ID、生成物path、fixture path、browser console error、pageerror、failed requestをまとめて失敗時に参照できるようにする。`main.parentNode.style` 判断などでruntimeを変更した場合は、影響するmetastanza Stanzaを再smokeする。

### Phase 11-2: TogoMedium Stanza full browser smoke

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

最低限確認すること:

- Phase 9の `gmdb-meta-list` direct embed smokeと同等の軽量smokeを、全15 Stanzaへ広げる。
- React / TSX、TogoMedium provider stack、MUI / Emotion、Shadow DOM内style、local fixture dataの代表経路を確認する。
- 実APIや本番dataに依存しないlocal fixtureで確認する。
- aliasは `togostanza.config.ts` の `vite.resolve.alias` へ明示する。TogoMedium固有aliasの自動吸収はしない。

全Stanzaで同じ深さのUI確認を要求しない。Phase 11-2のbrowser smokeは、direct embedでの致命的なruntime崩れを拾うための確認であり、TogoMedium Webアプリ本体E2Eではない。

Phase 11-2のsmoke-runnerでも、対象Stanza ID、生成物path、fixture path、browser console error、pageerror、failed requestをまとめて失敗時に参照できるようにする。Phase 11-1で作った失敗診断bundleを流用できる場合は、同じ形に揃える。

### Phase 11-3: TogoMedium Web application E2E

目的は、TogoMedium Webアプリ本体をPhase X前に一度確認できる状態にすることである。

確認すること:

- `references/togomedium-web` の起動前提。
- 必要な環境変数、依存、ローカルデータ、外部APIの扱い。
- 変更せずに起動できるか。
- 起動できる場合、最小画面でTogoMedium Stanzaが読み込まれ、重大なruntime errorなしに表示されるか。
- 起動できない場合、blockerを環境不足、外部依存、未実装、実プロジェクト側の移行対象、仕様判断待ちに分類する。

Phase 11-3では、TogoMedium Web本体を修正しない。必要な一時設定がある場合は、referencesを直接変更せず、一時ディレクトリまたは明示手順で扱う。

### Phase 11-4: runtime edge semantics

対象:

- `this.params` のJSON parse失敗時のfallback。
- invalid number / date / datetimeのfallback。
- `render()` のasync再入制御。
- `render()` 例外時のconsole / UI / 再描画の扱い。
- `handleAttributeChange(name, oldValue, newValue)` の `oldValue` / `newValue`。
- `handleAttributeChange()` のdebounce有無。
- `importWebFontCSS()` の重複挿入。
- `importWebFontCSS()` のlink注入先とDOM構造。
- `menu()` のDOM、keyboard interaction、item / divider / handlerの詳細。
- 013で未実体化のparameter / style系metadata異常入力。

現行版観測手段:

- 既定は `references/togostanza` のソース読解とする。
- 根拠として、参照したfile path、関数またはclass、commit、読み取った挙動、リメイク版で固定するかどうかを記録する。
- ソース読解だけで判断できないbrowser/runtime相互作用に限り、現行版togostanzaでbuild+embedする最小running観測を追加する。
- running観測はすべてのruntime edgeに必須ではない。必要になった項目だけ、11-0のharnessに追加して結果を記録する。

方針:

- 現行版で確認できる挙動に合わせる。
- 現行版の挙動が未調査または曖昧なものは、推測で新仕様にしない。
- 実プロジェクト群に影響する場合は、人間判断へ回す。
- `url` parameter typeは仕様外の追加候補であり、`date` / `datetime` と混ぜない。

記録先:

- 集約索引: `docs/implementation/phase-11/runtime-edge-semantics.md`。
- `this.params` と属性変換: 004。
- `renderTemplate()`、`handleAttributeChange()`、`importWebFontCSS()`、`menu()`、`query()`: 005。
- metadata異常系: 013。
- 実プロジェクト由来のruntime差分: 012。
- 外部契約として固定する挙動: `docs/spec/index.md` または `docs/spec/remake-policy.md`。
- 固定しない既知制約、改善候補、判断保留: `docs/investigation/follow-ups.md` または `docs/investigation/open-questions.md`。

004 / 005 / 013 / 012は観測ログと根拠の置き場であり、仕様正本ではない。Phase 11で外部契約として固定する判断が出た場合は、必ず仕様文書へ戻す。固定しない判断や後続判断にするものは、follow-upまたはopen questionへ戻す。

### Phase 11-5: routing and handoff

Phase 11で見つかった差分を、次のどれかへ分類する。

- Phase 11内で修正する互換バグ。
- リメイク版仕様として `docs/spec/index.md` または `docs/spec/remake-policy.md` へ反映する外部契約。
- 実プロジェクト側の移行対象。
- リメイク版仕様として固定しない既知制約。
- `docs/investigation/follow-ups.md` または `docs/investigation/open-questions.md` へ戻す後続判断。
- Phase X前に再実行する確認。
- Phase Xのdistribution blocker。
- Futureのdeveloper experience改善。

この分類をhandoffへ記録し、Phase X前に再実行すべき手順を明示する。

11-1 / 11-2のbrowser smoke後にruntimeまたはShadow DOM構造を変更した場合は、影響するStanzaのsmokeを再実行する。先に通したsmoke結果は、runtime変更後の根拠として使い回さない。

## browser smokeの合格条件

Phase 11でいうbrowser smokeは、Phase 9と同じく軽量な直接埋め込み確認である。UIの完全E2Eではない。

最低限、次を確認する。

- 生成されたmodule scriptを読み込める。
- 対象custom elementがupgradeされる。
- open Shadow DOMが作られる。
- `main` または主要表示要素に最小描画が出る。
- fatalなbrowser console errorが出ない。
- CSSがShadow DOM内へ適用される。
- 対象Stanzaが依存するassetまたはlocal dataが読み込まれる。

対象Stanzaごとに、必要なfixture dataや表示確認点は変えてよい。ただし、失敗した場合に「どのStanzaのどの前提が壊れたか」を記録できる粒度にする。

## 実装方針

### referencesの扱い

- `references/` は直接変更しない。
- 一時rootへsymlinkまたはcopyして確認する。
- network installはPhase 11の標準手順にしない。
- referencesが存在しない、または `node_modules/` が不足している場合は、何が足りないかを診断または手順に記録する。

### test入口

- default `check-all` はreferences依存確認を含めない。
- references依存確認は `test:compat:local` またはPhase 11用の派生scriptへ閉じる。
- browser testはサンドボックス環境ではなく、ユーザーのローカル環境で承認付き通常実行を優先する。
- Phase 11で全Stanza browser smokeを追加した結果、実行時間が大きく伸びる場合は、対象別scriptまたはtest tag分割を検討する。

### 記録

012 READMEへ、Phase 11の実プロジェクト観測として次を追記する。

- 実行日。
- Node.js / pnpm version。
- `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` のcommitまたはversion。
- 対象Stanza一覧。
- browser smoke結果。
- 必要だったlocal fixture data。
- console error、warning、失敗分類。
- TogoMedium Webアプリ本体E2Eの起動条件と結果。
- Phase X前に再実行する確認。

004 / 005 / 013 READMEへ、Runtime edge semanticsの観測結果を追記する。

`docs/implementation/phase-11/runtime-edge-semantics.md` には、各runtime edgeの現行版根拠、リメイク版確認、固定する挙動、固定しない既知制約、再確認が必要な項目への索引をまとめる。詳細な観測ログは各workbench case READMEへ置き、索引は後続フェーズが拾うための入口にする。

Runtime edge semanticsの判断結果は、workbench READMEとPhase 11内の索引だけで閉じない。外部契約として固定するものは `docs/spec/index.md` または `docs/spec/remake-policy.md` へ反映し、固定しないものや判断保留は `docs/investigation/follow-ups.md` または `docs/investigation/open-questions.md` へ戻す。

## 検証計画

ドキュメントのみの変更時:

- `git diff --check`

package実装またはtestに触れた場合:

- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run test:integration`
- `cd package && mise exec -- pnpm run test:browser`
- references依存確認を変更した場合は、`cd package && mise exec -- pnpm run test:compat:local`

最終確認:

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`
- `cd package && mise exec -- pnpm run test:compat:local`

`check-all` はreferences依存確認を含めない。package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。browser test、serve、TogoMedium Webアプリ本体E2Eは、サンドボックス環境ではなくユーザーのローカル環境を優先する。

## 残す論点

- 全Stanza browser smokeを1つの `test:compat:local` に含めるか、metastanza / TogoMedium / E2Eでscriptを分けるか。
- metastanzaの `main.parentNode.style` 依存をruntime互換として吸収するか、移行対象にするか。
- TogoMedium Webアプリ本体E2Eで使う最小画面とfixture data。
- Runtime edge semanticsのうち、現行版観測に合わせて固定するものと、既知制約として固定しないもの。
- Phase X前に再実行する確認の最小セット。

## 成果物

- `docs/implementation/phase-11/plan.md`
- `docs/implementation/index.md` のPhase 11リンク更新
- 012 READMEのPhase 11観測結果
- `docs/implementation/phase-11/runtime-edge-semantics.md`
- 004 / 005 / 013 READMEのRuntime edge semantics観測結果
- 必要に応じたpackage側local compatibility test helper更新
- Phase 11完了後の `docs/implementation/phase-11/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 9設計](../phase-9/plan.md)
- [Phase 9引き継ぎ](../phase-9/handoff.md)
- [Phase 10引き継ぎ](../phase-10/handoff.md)
- [004 Runtime parameters](../../../workbench/cases/004-runtime-parameters/README.md)
- [005 Stanza source API](../../../workbench/cases/005-stanza-source-api/README.md)
- [012 Real project regression](../../../workbench/cases/012-real-project-regression/README.md)
- [013 Metadata validation](../../../workbench/cases/013-metadata-validation/README.md)
- [実装計画](../index.md)
