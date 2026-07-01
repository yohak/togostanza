# Phase 5: readiness inventory

この文書では、Phase 0からPhase 4までで残した課題を、後続フェーズで判断できる形に棚卸しする。

Phase 5は再設計フェーズではない。この文書では、残課題を解決済みに見せず、分類、影響、推奨する送り先を記録する。

## 読み方

分類は [plan.md](./plan.md) の分類軸に従う。

| classification | 意味 |
| ---- | ---- |
| `done` | Phase 0からPhase 4までで完了済み。後続作業は不要。 |
| `documented constraint` | 既知制約として記録済み。現時点では修正しない。 |
| `needs decision` | 人間判断または追加調査が必要。 |
| `distribution blocker` | Phase Xへ進む前に閉じる必要がある。 |
| `proposed phase` | Phase 6以降のどこで扱うかの提案。 |
| `defer to Phase X` | distribution着手時に扱えばよい。 |

`proposed phase` は仮置きである。Phase 5では詳細APIや実装順序を固定しない。

## Systemic blockers

| item | source | current status | classification | impact | recommendation | proposed phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `pack -> install -> 実行` 未検証 | [Phase 1 handoff](../phase-1/handoff.md), [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | すべての検証はローカルsource tree、compiled `dist/`、または `bin -> dist` 経由で行っている。ローカルtarballを作り、別Stanzaリポジトリへinstallし、`npm exec` / `pnpm exec` / generated workflow相当で実行する確認はしていない。 | `distribution blocker` | `files`、`exports`、`bin`、shebang、dependency分類、`private`、version、runtime path解決の問題が一度に露出する。個別項目として散らすと見落としやすい。 | Phase Xの最初に、最小pack-install-smokeを置く。Phase 5では関連項目をこのblocker配下として扱う。 | Phase X |
| 公開package surface未整備 | [Phase 0 handoff](../phase-0/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [Phase 4 handoff](../phase-4/handoff.md), [リメイク版仕様](../../spec/index.md) | `togostanza/config` の最小subpath exportは追加済み。一方で `main`、`exports` 全体、`files`、型定義、公開metadata、`private` 解除は未整理。 | `distribution blocker` | 配布時にCLI、設定helper、runtime API、型解決が欠ける可能性がある。 | package surface全体はPhase Xへ送る。ただし開発中の検証を歪めるdependency分類はPhase 6候補として分けて見る。 | Phase X / Phase 6 candidate |
| `togostanza/stanza` exportと型定義 | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [リメイク版仕様](../../spec/index.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | build時はVite aliasでCLI内部runtimeへ解決し、生成JSにbare importは残らない。公開packageとしての `togostanza/stanza` subpath exportと型定義は未整理。 | `distribution blocker` | Stanza開発者のsourceは `import Stanza from "togostanza/stanza"` に依存する。配布後のtsc、IDE、外部toolingで解決できない可能性がある。 | `pack -> install -> 実行` blockerの中で最優先確認項目にする。実装自体はPhase X寄りだが、Phase 6で型・export方針だけ先に設計してよい。 | Phase X / Phase 6 candidate |
| 公開CLI相当のdependency分類 | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | `vite`、`sass`、`handlebars`、`@vitejs/plugin-vue`、`vue` などはbuild実行時に必要。Phase 4では `vue` もCLI build runtime dependencyとして扱う方針にした。 | `needs decision` | devDependencyに置くべきものとruntime dependencyに置くべきものがずれると、公開CLIやpack-install smokeで失敗する。 | distributionだけの問題としてPhase Xへ逃がしすぎない。現在の開発検証を壊す分類不整合はPhase 6候補にする。 | Phase 6 candidate |
| GitHub Actions live deploy未確認 | [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | workflowは実deploy flowを持つが、GitHub Actions上のlive deployと公開npm package解決は未確認。 | `defer to Phase X` | package公開前はGitHub Actions上で `dependencies.togostanza` が解決できないため、完全確認できない。 | Phase Xでpack-install smoke後にlive deploy smokeを置く。Phase 6で行う必要はない。 | Phase X |

## Spec gaps and implementation follow-ups

| item | source | current status | classification | impact | recommendation | proposed phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `tsconfig.json` の `compilerOptions.paths` 自動解決 | [リメイク版仕様](../../spec/index.md), [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [007](../../../workbench/cases/007-config-and-resolution/README.md) | `tsconfig.json` は入力として尊重するが、`paths` はViteへ自動合成しない。必要なaliasは `togostanza.config.ts` の `vite.resolve.alias` へ移す。 | `needs decision` | 仕様は未対応aliasに移行手順または診断を求める。実プロジェクトのalias移行コストに影響する。 | 自動解決を実装するか、移行メモと診断に留めるかを人間判断にする。TogoMedium alias自動吸収とは別項目として扱う。 | Phase 6 candidate |
| TogoMedium固有alias自動吸収 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` は `togostanza.config.ts` の `vite.resolve.alias` へ移す移行設定として確認した。自動吸収は契約にしていない。 | `needs decision` | 自動吸収するとTogoMedium移行は楽になるが、TogoMedium固有挙動をCLI一般機能へ広げることになる。 | 既定では移行設定に留める。自動吸収を求める場合は、TogoMedium以外への波及と保守負荷を人間判断する。 | Phase 6 candidate |
| root assetをStanzaソースから安定参照するAPI | [Phase 2 handoff](../phase-2/handoff.md), [Phase 3 handoff](../phase-3/handoff.md), [007](../../../workbench/cases/007-config-and-resolution/README.md), [follow-ups](../../investigation/follow-ups.md) | root `assets/` は `dist/assets/` にコピーされる。Stanza source内で `./assets/...` と書いた場合の推奨APIやhelperは未解決。 | `needs decision` | buildとserveでは配信されるが、Stanza sourceからの安定URL生成契約が曖昧。 | 仕様として公開APIを増やすか、root assetはHTML側または明示URLで扱う制約にするかを判断する。 | Phase 6 candidate |
| `stanza:include` とpackage内JSON include解決 | [リメイク版仕様](../../spec/index.md), [Phase 2 handoff](../phase-2/handoff.md), [Phase 4 handoff](../phase-4/handoff.md), [follow-ups](../../investigation/follow-ups.md) | 現行機能として認識済みだが、Phase 2-4では扱わず、Phase 4でも `togostanza-utils/params/data-chart.json` との関連を残した。 | `needs decision` | metadata共通化や実プロジェクトの移行に影響する可能性がある。 | 実プロジェクト使用有無を追加調査し、必須、再設計、破棄のどれにするか判断する。 | Phase 6 candidate |
| 広範なmetadata schema validation | [Phase 2 handoff](../phase-2/handoff.md), [follow-ups](../../investigation/follow-ups.md), [open questions](../../investigation/open-questions.md) | `@id` とディレクトリ名一致など必要最小限は実装済み。`stanza:parameter` の詳細schema、型不正値、exampleの検証は広げていない。 | `proposed phase` | エラーが早くなる一方で、現行で曖昧に通った入力を壊す可能性がある。 | build / serve診断改善フェーズで扱う。Phase 5では閉じない。 | Phase 6 candidate |
| `query()` のGET、headers、auth、timeoutなど | [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [005](../../../workbench/cases/005-stanza-source-api/README.md), [open questions](../../investigation/open-questions.md) | Phase 2-3ではPOST/urlencodedの成功経路を確認済み。GETや追加headersなどは後続判断。 | `documented constraint` | 既存実プロジェクトでは使用観測がなく、現時点の互換リスクは限定的。 | 追加要求が出るまで閉じない。必要ならsource API拡張フェーズで扱う。 | Future |
| Runtime edge semantics | [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [004](../../../workbench/cases/004-runtime-parameters/README.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | `this.params`、`render()`、`renderTemplate()`、`handleAttributeChange()`、`query()`、`importWebFontCSS()`、`menu()` の主要経路は成立。JSON parse失敗、invalid number / date / datetime、async renderの再入制御、render例外UI、`importWebFontCSS()` 重複抑止、menu DOM / keyboard interaction、`oldValue` / `newValue` の厳密観測は未固定。 | `proposed phase` | 細部を固定しすぎると互換面が広がるが、実アプリのエッジ挙動やデバッグ体験には影響する。 | 主要経路はdone、edge semanticsはsource API hardeningとしてまとめて扱う。個別にその場で仕様化しない。 | Phase 8 candidate |
| `url` parameter | [004](../../../workbench/cases/004-runtime-parameters/README.md), [リメイク版仕様](../../spec/index.md) | `date` / `datetime` は仕様の変換表に入り、Phase 2-3でunit確認済み。`url` は004ケースの追加候補に残っているが、仕様や受け入れ観測には入っていない。 | `needs decision` | `url` をparameter typeとして扱うかどうかで、変換表とvalidation対象が広がる。 | `date` / `datetime` と混ぜず、仕様外の追加候補として扱う。実利用根拠が出るまで採用しない。 | Future |
| Stanza間連携の高度なAPI | [Phase 2-5 handoff](../phase-2/phase-2-5/handoff.md), [006](../../../workbench/cases/006-inter-stanza-coordination/README.md) | metadata gate、child-listener、event-map、data-sourceの最小経路は成立。複数receiver、value-path詳細、blob URL revoke、retry、dynamic rewireなどは未対応。 | `documented constraint` | 静的HTMLの基本連携は動くが、複雑なアプリ連携では足りない可能性がある。 | 006相当を超える要求が出た時点で、APIとして再設計する。Phase 5では閉じない。 | Future |
| `serve` の高度化 | [Phase 3 handoff](../phase-3/handoff.md), [011](../../../workbench/cases/011-serve-development-server/README.md), [follow-ups](../../investigation/follow-ups.md) | 最小プレビュー、watch、対象stanza rebuild、失敗復帰は成立。HMR、自動reload、host指定、CORS、ヘルププレビュー完全復元、大規模watch性能は未対応。 | `documented constraint` | 開発体験には効くが、build/runtimeの中核契約ではない。 | distribution前必須にはしない。開発体験改善フェーズ候補として残す。 | Future |
| internal runtime / build surface cleanup | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [003](../../../workbench/cases/003-runtime-embedding/README.md) | `initializeRuntime()` のpublic method維持、build wrapper末尾の `export default StanzaClass`、menu shellを `togostanza--menu` custom elementにするか、`.togostanza-build-output` marker除外、`metadata.json` のDownload JSON導線は未整理。runtime初期化はinline metadataで成立し、`metadata.json` fetch非依存は確認済み。 | `proposed phase` | 外部仕様ではないが、公開生成物やStanza開発者API面として誤って固定されると後で動かしにくい。 | 外部契約にするものと内部実装に留めるものを分ける。Phase X blockerではなく、runtime/build cleanupとして扱う。 | Phase 7 candidate |
| `init .` の既存ファイルmergeと上書き | [Phase 2-0 handoff](../phase-2/phase-2-0/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | `.git/` とlockfileだけは許容。`.gitignore`、`README.md`、`LICENSE` などは衝突として失敗。mergeや上書きoptionは未対応。 | `documented constraint` | 利便性には影響するが、安全側の挙動として成立している。 | 生成体験改善として後続に残す。Phase X blockerではない。 | Future |
| scaffold / CLI UX follow-ups | [Phase 0 plan](../phase-0/plan.md), [Phase 1 plan](../phase-1/plan.md), [Phase 1 handoff](../phase-1/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md), [follow-ups](../../investigation/follow-ups.md) | `init` / `generate stanza` の主要経路は成立。`index.ts` / `index.tsx` 生成option、README本文詳細、bare `init` prompt、CLI parser / help / option validation複雑化時のCLI library採用、細かいerror code分類は未対応。 | `proposed phase` | Stanza開発者体験に効くが、build/runtimeの成立やdistribution前blockerではない。 | `init .` mergeとは別のUX bucketとして扱う。Phase 6のreadinessではなく、developer experience側へ送る。 | Phase 7 candidate |
| `package.json` の `scripts.build` / `packageManager` field生成 | [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [Phase 1 handoff](../phase-1/handoff.md) | `packageManager` fieldは生成しない方針を維持。`scripts.build` も生成していない。workflowは `npm exec` / `pnpm exec` でCLIを呼ぶ。 | `needs decision` | 開発者体験とworkflowの見通し、pnpm version固定に影響する。 | Phase Xではなく、scaffold UXまたはworkflow UXとしてPhase 6以降で判断する。 | Phase 6 candidate |
| generated workflow operational constraints | [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | workflow生成は成立。`dependencies.togostanza` は `^0.0.0`、pnpm workflowはpnpm 10系lockfile前提、lockfile無しpush案内、Action major tag運用、`scripts.build` / `packageManager` field生成は後続判断。 | `defer to Phase X` | live deploy以前に、利用者案内と運用ルールが不足すると初回CIで詰まりやすい。 | live deploy未確認とは別に、workflow運用制約としてまとめる。package公開前にREADMEやscaffold UXへ反映するかを判断する。 | Phase X / Phase 7 candidate |
| 旧設定ファイルと診断体系 | [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [Phase 4 handoff](../phase-4/handoff.md), [follow-ups](../../investigation/follow-ups.md) | 旧 `togostanza-build.mjs` / `.js` は検出し、実行せず、`togostanza.config.ts` への移行warningを出す。旧設定の自動実行はしない。validation / config / build errorの診断体系や細かいCLI error code分類は未整理。 | `proposed phase` | 旧設定を実行しない制約は安全側で成立。診断の品質は移行体験に影響する。 | 旧設定の非実行はdocumented constraintとして維持し、診断メッセージ体系はdeveloper experience / diagnosticsへ送る。 | Phase 7 candidate |

## Real project and compatibility inventory

| item | source | current status | classification | impact | recommendation | proposed phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| metastanza全Stanzaのブラウザ表示 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | metastanzaは全10 Stanzaのbuild成功を確認。全Stanzaのブラウザ表示は未網羅。 | `needs decision` | buildだけではruntime表示差分を拾い切れない。 | 代表Stanzaを増やすか、全Stanza smokeを作るか判断する。distribution前必須かは人間判断。 | Phase 6 candidate |
| TogoMedium Webアプリ本体E2E | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | TogoMedium Stanzaは全15 Stanzaのbuild成功、`gmdb-meta-list` のdirect embed smokeを確認。TogoMedium Webアプリ本体のbuild / start / E2Eは未確認。 | `needs decision` | 実利用の統合リスクを最後まで残す可能性がある。 | distribution前に必須とするか、別プロジェクト側の受け入れ検証へ送るかを判断する。 | Phase 6 candidate / Phase X |
| Emotion / MUI provider stackの完全互換 | [Phase 4 handoff](../phase-4/handoff.md), [008](../../../workbench/cases/008-react-runtime/README.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | 合成browser testと実TogoMedium `gmdb-meta-list` direct embedでShadow DOM style適用を確認。provider stack全体の完全互換は対象外。 | `needs decision` | TogoMediumに関係する構成を落とすと実利用へ影響する。関係しないedgeまで追うと範囲が膨らむ。 | 未検証または不具合が見つかった場合は、TogoMediumへの直接影響と他用途への波及を整理して人間判断に回す。 | Phase 6 candidate |
| React / Vue version互換範囲 | [Phase 4 handoff](../phase-4/handoff.md), [008](../../../workbench/cases/008-react-runtime/README.md), [009](../../../workbench/cases/009-vue-runtime/README.md) | 実React / React DOM、Vue SFCの代表経路は確認済み。version差分の互換範囲は未固定。 | `needs decision` | Stanzaリポジトリ側dependencyとして解決するため、利用側のversion差分がbuild/runtimeに影響する。 | サポートversion範囲をpackage engines / peer方針と合わせて決める。 | Phase 6 candidate |
| `togostanza-utils` 未対象API | [Phase 4 handoff](../phase-4/handoff.md), [010](../../../workbench/cases/010-togostanza-utils-compat/README.md), [リメイク方針](../../spec/remake-policy.md) | runtime API、menu contract、生成DOM構造に触れるAPIは確認。純粋データ処理API、`Data` class、tree / graph helper、`showLoadingIcon()` / `hideLoadingIcon()` 直接importは対象外。 | `documented constraint` | drop-in互換を過大に見せると後続で誤解を生む。 | 対象API一覧を維持し、追加APIは実利用根拠が出た場合だけ判断する。 | Future |
| `references/` 依存の検証再現性 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | 010/012相当の検証はローカルの `references/togostanza-utils`、`references/metastanza`、`references/togomedium-web` に依存する。 | `needs decision` | CI、別マシン、配布前検証で `check-all` 相当を再現できない可能性がある。 | referencesの取得方法、固定revision、CI上の扱いを棚卸しし、Phase 6かPhase Xへ振り分ける。 | Phase 6 candidate |

## Documented constraints

| item | source | current status | classification | impact | recommendation | proposed phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| source map内容とCSS source map精度 | [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [リメイク版仕様](../../spec/index.md) | source mapは生成と相対参照を確認済み。内部構造、列精度、byte-level互換は非契約。CSS URL書き換えやVite CSS prependで精度差があり得る。 | `documented constraint` | 開発支援には影響するが、利用契約ではない。 | 再オープンしない。必要になった時点で開発体験改善として扱う。 | None |
| asset inline / emit / hash / threshold | [007](../../../workbench/cases/007-config-and-resolution/README.md), [リメイク版仕様](../../spec/index.md) | 生成URLのサブパス安全性と読み込みは確認。inlineされるか、hash名になるかなどは非契約。 | `documented constraint` | 生成物の見た目やdiffには影響するが、埋め込み契約ではない。 | 外部契約として固定しない。 | None |
| `treeshake: false` を戻さない | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | `treeshake: false` がMUI関連bundleの実行時例外を起こしたため、明示無効化をやめた。 | `documented constraint` | tree-shaking設定を不用意に戻すとTogoMedium direct embedが壊れる。 | tree-shakingを触る場合はTogoMedium direct embed smokeを必須確認にする。 | None |
| Sass `@import` 非推奨警告 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md), [follow-ups](../../investigation/follow-ups.md) | 現行ソース由来の警告としてPhase 4では許容。将来Sass versionでerror化する可能性は残る。 | `documented constraint` | いまはbuild失敗ではないが、依存更新時に顕在化する。 | Phase 5では修正しない。dependency更新時の注意として残す。 | Future |
| `index.html` と `-togostanza/` 非生成 | [Phase 2 handoff](../phase-2/handoff.md), [Phase 3 handoff](../phase-3/handoff.md), [002](../../../workbench/cases/002-build-artifacts/README.md), [007](../../../workbench/cases/007-config-and-resolution/README.md) | リメイク版は公開生成物として個別HTMLとmodule scriptを重視し、現行版のヘルププレビュー構造は復元していない。 | `documented constraint` | 現行版との差分だが、Phase 2/3の方針として記録済み。 | ヘルププレビューUIを復活させる場合は別タスクにする。 | Future |
| menu placementの詳細見た目 | [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [003](../../../workbench/cases/003-runtime-embedding/README.md) | `none`、About導線、属性処理は確認。placementごとの見た目やDOM互換は対象外。 | `documented constraint` | UI互換に影響するが中核runtime契約ではない。 | 要求が出るまで固定しない。 | Future |
| Codex sandboxではなく通常環境で確認する運用 | [open questions](../../investigation/open-questions.md), [Phase 0 handoff](../phase-0/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | browser testやwatcherは承認付き通常実行を優先する方針。 | `done` | 環境差を現行版やリメイク版の失敗と誤認するリスクを下げる。 | Phase 5でも検証コマンドを書く場合はこの方針を維持する。 | None |

## Already done or closed

| item | source | current status | classification | impact | recommendation | proposed phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `metadata["@id"]` とstanzaディレクトリ名一致 | [open questions](../../investigation/open-questions.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md) | 仕様判断済み。Phase 2-1で一致を要求するvalidationを実装済み。 | `done` | custom element名と生成物URLのズレを防ぐ。 | 後続作業不要。 | None |
| `this.query()` method未指定時POST | [open questions](../../investigation/open-questions.md), [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | 仕様判断済み。Phase 2-3でPOSTとして確認済み。 | `done` | docsと現行実装のズレをリメイク版仕様として固定した。 | 後続作業不要。GETなどは別項目。 | None |
| `togostanza--data-container` 破棄 | [open questions](../../investigation/open-questions.md), [Phase 2-5 handoff](../phase-2/phase-2-5/handoff.md) | 誤記として破棄。Phase 2-5で登録しないことを確認済み。 | `done` | 不要な互換面を増やさない。 | 後続作業不要。 | None |
| `style.scss` を正とする | [open questions](../../investigation/open-questions.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md) | 仕様判断済み。`stanza.scss` は旧ドキュメント誤記として扱う。 | `done` | source layoutの開発契約を単純にする。 | 後続作業不要。 | None |
| boolean parameterの属性有無判定 | [open questions](../../investigation/open-questions.md), [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [004](../../../workbench/cases/004-runtime-parameters/README.md) | 仕様判断済み。Phase 2-3で属性有無による変換を確認済み。 | `done` | HTML埋め込み時のboolean挙動が安定する。 | 後続作業不要。 | None |

## Human decision shortlist

Phase 5では、次の項目を人間判断が必要な短い一覧として扱う。

1. `tsconfig paths` を自動解決するか、`togostanza.config.ts` への移行診断に留めるか。
2. TogoMedium固有aliasを自動吸収するか、TogoMedium側の移行設定として扱うか。
3. TogoMedium Webアプリ本体E2Eをdistribution前必須にするか、別受け入れ検証へ送るか。
4. metastanza / TogoMediumの実プロジェクト回帰をどこまで自動test化するか。
5. React / Vue version互換範囲をどこまで明示するか。
6. root asset参照APIと `stanza:include` をPhase 6候補にするか、追加調査へ送るか。
7. `references/` 依存の検証をCIで再現可能にするか、ローカルcompatibility検証として扱い続けるか。
8. Runtime edge semanticsを後続で硬くするか、主要経路だけを互換契約として維持するか。
9. internal runtime / build surfaceを整理するか、内部実装詳細として維持するか。
10. scaffold / CLI UXをどのタイミングで改善するか。

## Proposed roadmap seed

このロードマップは仮置きであり、Phase 5完了後の詳細計画で再確認する。

| proposed phase | theme | candidate items |
| ---- | ---- | ---- |
| Phase 6 candidate | readiness cleanup before distribution | dependency分類、`togostanza/stanza` export設計、`tsconfig paths` / alias方針、references再現性、実プロジェクト回帰範囲の判断 |
| Phase 7 candidate | developer experience and diagnostics | metadata validation、diagnostics整理、旧設定migration診断、internal runtime / build surface cleanup、scaffold / CLI UX、`init .` merge UX、`scripts.build` / `packageManager` field、serve preview改善 |
| Phase 8 candidate | compatibility expansion if needed | Runtime edge semantics、`url` parameter、`stanza:include`、root asset参照API、Stanza間連携高度化、追加 `togostanza-utils` API、React / Vue version範囲 |
| Phase X | distribution | pack-install smoke、package metadata、`files`、`exports`、`private`解除、tarball install、`npm exec` / `pnpm dlx`、GitHub Actions live deploy |
