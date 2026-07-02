# Phase 5: readiness inventory

この文書では、Phase 0からPhase 4までで残した課題を、後続フェーズで判断できる形に棚卸しする。

Phase 5は再設計フェーズではない。この文書では、残課題を解決済みに見せず、状態、影響、推奨する送り先を記録する。

## 読み方

棚卸し項目は、状態を示す `status` と、振り分け先を示す `phase` に分けて読む。

| status | 意味 |
| ---- | ---- |
| `done` | Phase 0からPhase 4までで完了済み。後続作業は不要。 |
| `documented constraint` | 既知制約として記録済み。現時点では修正しない。 |
| `needs decision` | 人間判断または追加調査が必要。 |
| `distribution blocker` | Phase Xへ進む前に閉じる必要がある。 |
| `open` | 未解決。扱うフェーズは `phase` 列に記録する。 |

`phase` はPhase 5時点の振り分け先を示す。複数phaseを併記してよい。各フェーズの意味は `Proposed roadmap seed` を参照し、詳細な範囲、API、実装順序は、そのフェーズの詳細計画で再確認する。

## Systemic blockers

| item | source | current status | status | impact | recommendation | phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `pack -> install -> 実行` 未検証 | [Phase 1 handoff](../phase-1/handoff.md), [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | すべての検証はローカルsource tree、compiled `dist/`、または `bin -> dist` 経由で行っている。ローカルtarballを作り、別Stanzaリポジトリへinstallし、`npm exec` / `pnpm exec` / generated workflow相当で実行する確認はしていない。 | `distribution blocker` | `files`、`exports`、`bin`、shebang、dependency分類、`private`、version、runtime path解決の問題が一度に露出する。個別項目として散らすと見落としやすい。 | Phase Xの最初に、最小pack-install-smokeを置く。Phase 5では関連項目をこのblocker配下として扱う。 | Phase X |
| 公開package surface未整備 | [Phase 0 handoff](../phase-0/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [Phase 4 handoff](../phase-4/handoff.md), [リメイク版仕様](../../spec/index.md) | `togostanza/config` の最小subpath exportは追加済み。一方で `main`、`exports` 全体、`files`、型定義、公開metadata、`private` 解除は未整理。 | `distribution blocker` | 配布時にCLI、設定helper、runtime API、型解決が欠ける可能性がある。 | package surface全体はPhase Xへ送る。ただし開発中の検証を歪めるdependency分類はPhase 7として分けて見る。 | Phase X / Phase 7 |
| `togostanza/stanza` exportと型定義 | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [リメイク版仕様](../../spec/index.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | build時はVite aliasでCLI内部runtimeへ解決し、生成JSにbare importは残らない。公開packageとしての `togostanza/stanza` subpath exportと型定義は未整理。 | `distribution blocker` | Stanza開発者のsourceは `import Stanza from "togostanza/stanza"` に依存する。配布後のtsc、IDE、外部toolingで解決できない可能性がある。 | `pack -> install -> 実行` blockerの中で最優先確認項目にする。実装自体はPhase X寄りだが、Phase 7で型・export方針だけ先に設計してよい。 | Phase X / Phase 7 |
| 公開CLI相当のdependency分類 | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | `vite`、`sass`、`handlebars`、`@vitejs/plugin-vue`、`vue` などはbuild実行時に必要。Phase 4では `vue` もCLI build runtime dependencyとして扱う方針にした。 | `open` | devDependencyに置くべきものとruntime dependencyに置くべきものがずれると、公開CLIやpack-install smokeで失敗する。 | Phase 5 decision: distributionだけの問題としてPhase Xへ逃がさず、現在の開発検証を壊す分類不整合としてPhase 7で扱う。具体的なdependency分類はPhase 7詳細計画で再確認する。 | Phase 7 |
| GitHub Actions live deploy未確認 | [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | workflowは実deploy flowを持つが、GitHub Actions上のlive deployと公開npm package解決は未確認。 | `open` | package公開前はGitHub Actions上で `dependencies.togostanza` が解決できないため、完全確認できない。 | Phase Xでpack-install smoke後にlive deploy smokeを置く。Phase 6で行う必要はない。 | Phase X |
| CLI status / result messages | [リメイク版仕様](../../spec/index.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 3 handoff](../phase-3/handoff.md) | `build` / `serve` の成功時stdoutは実装とtestで確認している。`build` 成功時は簡易duration msを表示する。Stanza開発者向けのstatus、progress、result messageとしてのUXは独立して設計していない。CLI出力文言そのものは互換対象外としている。 | `open` | `pack -> install -> 実行` やTogoMediumローカル確認時に、何が起きたか、どこを開くか、どこへ出力したかが分かりにくいと開発体験に影響する。 | 診断メッセージ体系とは分け、Phase Xの配布前確認で通常利用時の `build` / `serve` 実行結果メッセージを整理する。詳細文言を互換契約にするかはPhase Xで判断する。 | Phase X |

## Spec gaps and implementation follow-ups

| item | source | current status | status | impact | recommendation | phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| workbench current fixture completeness | [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md), [002](../../../workbench/cases/002-build-artifacts/README.md), [003](../../../workbench/cases/003-runtime-embedding/README.md), [004](../../../workbench/cases/004-runtime-parameters/README.md), [005](../../../workbench/cases/005-stanza-source-api/README.md), [006](../../../workbench/cases/006-inter-stanza-coordination/README.md), [007](../../../workbench/cases/007-config-and-resolution/README.md), [008](../../../workbench/cases/008-react-runtime/README.md), [009](../../../workbench/cases/009-vue-runtime/README.md), [010](../../../workbench/cases/010-togostanza-utils-compat/README.md), [011](../../../workbench/cases/011-serve-development-server/README.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | 各case READMEは現行版観測とリメイク版観測を蓄積しているが、`current-*` の中身はケースごとに揃い方が違う。`workbench` は挙動が揃うかを実際に確認する場所なので、READMEだけでなく実行可能な入力fixtureとして整える必要がある。 | `open` | fixtureが薄いと、後続の互換判断や回帰確認がREADME記述に寄りすぎる。pack-install前でも、開発中CLIによる機能確認の再現性を高められる。 | Phase 6で `current-*` の `package.json` とscriptsを揃える。scriptsはpack installではなく、repo-localの `package/bin/togostanza.mjs` を `node` で呼ぶ方式を基本にする。pack-install smokeはPhase Xのdistribution検証として別に扱う。 | Phase 6 |
| `tsconfig.json` の `compilerOptions.paths` 自動解決 | [リメイク版仕様](../../spec/index.md), [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [007](../../../workbench/cases/007-config-and-resolution/README.md) | `tsconfig.json` は入力として尊重するが、`paths` はViteへ自動合成しない。必要なaliasは `togostanza.config.ts` の `vite.resolve.alias` へ移す。 | `open` | 仕様は未対応aliasに移行手順または診断を求める。実プロジェクトのalias移行コストに影響する。 | Phase 5 decision: 最終的にaliasが解決できればよく、`tsconfig paths` 自動解決は本開発では必須にしない。Phase 8では `togostanza.config.ts` への手動移行案内と、未解決alias時の診断を優先する。 | Phase 8 |
| TogoMedium固有alias自動吸収 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` は `togostanza.config.ts` の `vite.resolve.alias` へ移す移行設定として確認した。自動吸収は契約にしていない。 | `open` | 自動吸収するとTogoMedium移行は楽になるが、TogoMedium固有挙動をCLI一般機能へ広げることになる。 | Phase 5 decision: 既定では自動吸収せず、TogoMedium側の手動移行設定として扱う。一般機能へ広げる場合は、TogoMedium以外への波及と保守負荷を整理して再相談する。 | Phase 8 |
| 広範なmetadata schema validation | [Phase 2 handoff](../phase-2/handoff.md), [follow-ups](../../investigation/follow-ups.md), [open questions](../../investigation/open-questions.md) | `@id` とディレクトリ名一致など必要最小限は実装済み。`stanza:parameter` の詳細schema、型不正値、exampleの検証は広げていない。 | `open` | エラーが早くなる一方で、現行で曖昧に通った入力を壊す可能性がある。 | build / serve診断改善フェーズで扱う。Phase 5では閉じない。 | Phase 8 |
| Runtime edge semantics | [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [004](../../../workbench/cases/004-runtime-parameters/README.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | `this.params`、`render()`、`renderTemplate()`、`handleAttributeChange()`、`query()`、`importWebFontCSS()`、`menu()` の主要経路は成立。JSON parse失敗、invalid number / date / datetime、async renderの再入制御、render例外UI、`importWebFontCSS()` 重複抑止、menu DOM / keyboard interaction、`oldValue` / `newValue` の厳密観測は未固定。 | `open` | 細部を固定しすぎると互換面が広がるが、実アプリのエッジ挙動やデバッグ体験には影響する。 | Phase 5 decision: 現行版で確認できる挙動に合わせる。現行版の挙動が未調査または曖昧な項目は、Phase 11で調査してから固定し、推測で新仕様にしない。 | Phase 11 |
| internal runtime / build surface cleanup | [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [003](../../../workbench/cases/003-runtime-embedding/README.md) | `initializeRuntime()` のpublic method維持、build wrapper末尾の `export default StanzaClass`、menu shellを `togostanza--menu` custom elementにするか、`.togostanza-build-output` marker除外、`metadata.json` のDownload JSON導線は未整理。runtime初期化はinline metadataで成立し、`metadata.json` fetch非依存は確認済み。 | `open` | 外部仕様ではないが、公開生成物やStanza開発者API面として誤って固定されると後で動かしにくい。 | 外部契約にするものと内部実装に留めるものを分ける。Phase X blockerではなく、runtime/build cleanupとして扱う。 | Phase 10 |
| scaffold / CLI UX follow-ups | [Phase 0 plan](../phase-0/plan.md), [Phase 1 plan](../phase-1/plan.md), [Phase 1 handoff](../phase-1/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md), [follow-ups](../../investigation/follow-ups.md) | `init` / `generate stanza` の主要経路は成立。`index.ts` / `index.tsx` 生成option、README本文詳細、bare `init` prompt、CLI parser / help / option validation複雑化時のCLI library採用は未対応。 | `open` | Stanza開発者体験に効くが、build/runtimeの成立やdistribution前blockerではない。 | `init .` mergeとは別のUX bucketとして扱う。bare `init` promptは安全な非対話入口を崩すため、導入するなら明示判断にする。Phase 6のworkbench実行性ではなく、developer experience側へ送る。 | Phase 10 |
| generated repo `scripts.build` / `scripts.serve` | [Phase 1 handoff](../phase-1/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | 現行版もリメイク版も生成repoの `package.json` にbuild / serve scriptは書いていない。workflowは `npm exec` / `pnpm exec` でCLIを直接呼ぶ。 | `open` | 互換必須ではないが、利用者が `npm run build` / `pnpm build`、`npm run serve` / `pnpm serve` で自然に動かせるため、開発体験に効く。workbench currentのscripts整備とも相性がよい。 | Phase 6で `build: "togostanza build"` と `serve: "togostanza serve"` の追加を有力項目として扱う。workflowは引き続き `npm exec` / `pnpm exec` 直接呼びでよい。 | Phase 6 |
| generated workflow operational constraints | [Phase 2-6 handoff](../phase-2/phase-2-6/handoff.md), [001](../../../workbench/cases/001-cli-scaffold-and-generate/README.md) | workflow生成は成立。`dependencies.togostanza` は `^0.0.0`、pnpm workflowはpnpm 10系lockfile前提、lockfile無しpush案内、Action major tag運用、`packageManager` field生成は後続判断。 | `open` | live deploy以前に、利用者案内と運用ルールが不足すると初回CIで詰まりやすい。 | live deploy未確認とは別に、workflow運用制約としてまとめる。package公開前にREADMEやscaffold UXへ反映するかを判断する。 | Phase X / Phase 10 |

## Real project and compatibility inventory

| item | source | current status | status | impact | recommendation | phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| metastanza / TogoMedium全Stanzaのブラウザ表示 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | metastanza全10 StanzaとTogoMedium全15 Stanzaのbuild成功を確認。TogoMedium `gmdb-meta-list` のdirect embed smokeは確認済み。全Stanzaのブラウザ表示は未網羅。 | `open` | buildだけではruntime表示差分を拾い切れない。すべてをPhase 9で自動化すると範囲が重くなるが、どこかの時点で全Stanzaのブラウザ確認は必要。 | Phase 5 decision: Phase 9では全Stanza build checkと代表Stanza browser smokeを行う。全Stanza browser smokeはPhase 11で扱い、Phase X前に再実行する。browser smokeは軽量なブラウザ読み込み、custom element upgrade、Shadow DOM、最小描画、fatal consoleなし、CSS / asset load確認を指し、UIの完全E2Eではない。 | Phase 9 / Phase 11 / Phase X |
| TogoMedium Webアプリ本体E2E | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | TogoMedium Stanzaは全15 Stanzaのbuild成功、`gmdb-meta-list` のdirect embed smokeを確認。TogoMedium Webアプリ本体のbuild / start / E2Eは未確認。 | `open` | 実利用の統合リスクを最後まで残す可能性がある。 | Phase 5 decision: Phase 11でTogoMedium Webアプリ本体のE2Eを設計し、最小実行する。Phase X前に再実行する。Phase Xで初めて触る状態にはしない。 | Phase 11 / Phase X |
| React / Vue version互換範囲 | [Phase 4 handoff](../phase-4/handoff.md), [008](../../../workbench/cases/008-react-runtime/README.md), [009](../../../workbench/cases/009-vue-runtime/README.md) | 実React / React DOM、Vue SFCの代表経路は確認済み。version差分の互換範囲は未固定。 | `open` | Stanzaリポジトリ側dependencyとして解決するため、利用側のversion差分がbuild/runtimeに影響する。 | Phase 5 decision: 本開発では検証済みversionだけを保証対象にする。Phase 9で確認済みversionと未確認versionの扱いを記録し、実利用要求が出た場合だけPhase 11でmatrixを広げる。 | Phase 9 / Phase 11 |
| `references/` 依存の検証再現性 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | 010/012相当の検証はローカルの `references/togostanza-utils`、`references/metastanza`、`references/togomedium-web` に依存する。 | `open` | 別マシンや配布前検証で手順を再現できない可能性がある。 | Phase 5 decision: 本開発ではローカルcompatibility検証として扱い、CI化は対象外にする。Phase 9ではローカル再現手順と前提を記録する。 | Phase 9 |

## Documented constraints

| item | source | current status | status | impact | recommendation | phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| source map内容とCSS source map精度 | [Phase 2 handoff](../phase-2/handoff.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md), [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [リメイク版仕様](../../spec/index.md) | source mapは生成と相対参照を確認済み。内部構造、列精度、byte-level互換は非契約。CSS URL書き換えやVite CSS prependで精度差があり得る。 | `documented constraint` | 開発支援には影響するが、利用契約ではない。 | 再オープンしない。必要になった時点で開発体験改善として扱う。 | None |
| asset inline / emit / hash / threshold | [007](../../../workbench/cases/007-config-and-resolution/README.md), [リメイク版仕様](../../spec/index.md) | 生成URLのサブパス安全性と読み込みは確認。inlineされるか、hash名になるかなどは非契約。 | `documented constraint` | 生成物の見た目やdiffには影響するが、埋め込み契約ではない。 | 外部契約として固定しない。 | None |
| `treeshake: false` を戻さない | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | `treeshake: false` がMUI関連bundleの実行時例外を起こしたため、明示無効化をやめた。 | `documented constraint` | tree-shaking設定を不用意に戻すとTogoMedium direct embedが壊れる。 | tree-shakingを触る場合はTogoMedium direct embed smokeを必須確認にする。 | None |
| Emotion / MUI provider stackの扱い | [Phase 4 handoff](../phase-4/handoff.md), [008](../../../workbench/cases/008-react-runtime/README.md), [012](../../../workbench/cases/012-real-project-regression/README.md) | 合成browser testと実TogoMedium `gmdb-meta-list` direct embedでShadow DOM style適用を確認。provider stack全体の完全互換は対象外。 | `documented constraint` | TogoMediumに関係する構成を落とすと実利用へ影響する。関係しないedgeまで追うと範囲が膨らむ。 | TogoMediumに関係するEmotion / MUI構成は落とさない。関係しないedge caseは深追いしないが、動かないことが分かった場合は影響範囲を整理して人間判断に回す。 | None |
| Sass `@import` 非推奨警告 | [Phase 4 handoff](../phase-4/handoff.md), [012](../../../workbench/cases/012-real-project-regression/README.md), [follow-ups](../../investigation/follow-ups.md) | 現行ソース由来の警告としてPhase 4では許容。将来Sass versionでerror化する可能性は残る。 | `documented constraint` | いまはbuild失敗ではないが、依存更新時に顕在化する。 | Phase 5では修正しない。dependency更新時の注意として残す。 | Future |
| `index.html` と `-togostanza/` 非生成 | [Phase 2 handoff](../phase-2/handoff.md), [Phase 3 handoff](../phase-3/handoff.md), [002](../../../workbench/cases/002-build-artifacts/README.md), [007](../../../workbench/cases/007-config-and-resolution/README.md) | リメイク版は公開生成物として個別HTMLとmodule scriptを重視し、現行版のヘルププレビュー構造は復元していない。 | `documented constraint` | 現行版との差分だが、Phase 2/3の方針として記録済み。 | ヘルププレビューUIを復活させる場合は別タスクにする。 | Future |
| menu placementの詳細見た目 | [Phase 2-2 handoff](../phase-2/phase-2-2/handoff.md), [003](../../../workbench/cases/003-runtime-embedding/README.md) | `none`、About導線、属性処理は確認。placementごとの見た目やDOM互換は対象外。 | `documented constraint` | UI互換に影響するが中核runtime契約ではない。 | 要求が出るまで固定しない。 | Future |
| 細かいCLI exit code分類 | [Phase 0 handoff](../phase-0/handoff.md), [Phase 1 handoff](../phase-1/handoff.md), [follow-ups](../../investigation/follow-ups.md) | CLIは成功 `0` / 失敗non-zeroを維持。失敗理由ごとの詳細exit code分類は固定していない。 | `documented constraint` | CIでの細分岐や外部toolingには影響し得るが、現時点の仕様契約ではない。 | 診断メッセージ改善とは分ける。必要な利用シナリオが出るまで細分化しない。 | Future |
| React / Vue以外のframework support | [Phase 4 handoff](../phase-4/handoff.md), [follow-ups](../../investigation/follow-ups.md) | React、Vue、MUI / Emotionの代表経路は確認済み。Svelteなど他frameworkは実プロジェクト観測も受け入れ検証もない。 | `documented constraint` | 対応範囲を広げるとbuild plugin、style注入、runtime mounting契約が増える。 | 実利用根拠が出るまでFuture扱いにする。React / Vue互換範囲の判断とは混ぜない。 | Future |

## 本開発の対象外整理

この表は、Phase 5中の人間判断を記録する。本開発から外すことは、価値が低いことを意味しない。中核のbuild / runtime / compatibility成立と混ぜないために外す項目も含む。

| item | 本開発での扱い | 後続優先度 | 補足 |
| ---- | ---- | ---- | ---- |
| source mapのbyte-level / column-level精度 | 不要 | 低 | `.map` 生成と参照の健全性は維持する。既存版とのmapping内容一致や列精度は互換条件にしない。 |
| asset inline / emit / hash / thresholdの詳細固定 | 不要 | 低 | assetが読み込めることとサブパス安全性を維持する。inline有無、hash名、thresholdは固定しない。 |
| menu placementの見た目 / DOM完全互換 | 不要 | 高め | `none`、About導線、基本placement属性の解釈は維持する。見た目やDOM互換はUI compatibility / runtime polishで扱う。 |
| 細かいCLI exit code分類 | 不要 | 中 | 成功 `0` / 失敗non-zeroを維持する。診断メッセージ改善よりは低いが、source map精度やasset hash固定よりは高い。 |
| React / Vue以外のframework support | 不要 | 低 | Svelteなどは実利用要求が出たら再評価する。React / Vue / MUI / Emotionの確認範囲とは混ぜない。 |
| root assetをStanzaソースから安定参照するAPI | 不要 | 低から中 | Stanza sourceから参照するassetは `stanzas/{id}/assets/` に置く。root `assets/` は共有静的ファイルとして扱い、Stanza source向けの安定参照APIは本開発では追加しない。 |
| `stanza:include` とpackage内JSON include解決 | 不要 | 低から中 | 現行機能として認識済みだが、Phase 2-4 / Phase 4の中核経路には不要だった。実プロジェクト利用が確認された場合だけ優先度を上げる。 |
| `references/` 依存検証のCI化 | 不要 | 低から中 | 本開発ではローカルcompatibility検証として扱う。CI fetch、pinning、更新運用は扱わず、Phase 9ではローカル再現手順と前提だけを記録する。 |
| `query()` のGET / headers / auth / timeout | 不要 | 中 | POST / urlencodedの成功経路を維持する。外部API利用要求が出たら再評価する。 |
| Stanza間連携の高度API | 不要 | 中 | 006相当の静的HTML連携を維持する。dynamic rewire、upgrade前queue、複数receiver設計、blob URL revoke、複雑なvalue-pathは後続。 |
| `serve` の高度化 | 不要 | 中から低 | preview、watch、rebuild、失敗500、復帰、loopback originからの開発用CORSを維持する。HMR、自動reload、host指定、loopback外CORS、大規模watch性能は後続。 |
| `url` parameter type | 不要 | 低 | 仕様にあるparameter typeのみ維持する。`date` / `datetime` とは別扱いにする。 |
| 診断メッセージ体系の整理 | 不要 | 中 | 各フェーズで必要な局所診断改善は行ってよい。全体の診断体系、文言、修正案、スタイル統一は本開発ではまとめて扱わない。 |
| `togostanza-utils` 未対象API | 不要 | 低から中 | 純粋データ処理API、`Data` class、tree / graph helper、`showLoadingIcon()` / `hideLoadingIcon()` 直接importは対象外。実プロジェクト利用が確認されたものは再評価する。 |
| リッチなプレビュー / ヘルプページ生成 | 不要 | 最優先 | 現行版の `index.html` / `-togostanza/` 相当のリッチUIは本開発から外す。ただし後続DXでは最優先項目にする。 |
| `init .` の既存ファイルmerge / 上書き | 不要 | 中から高 | 現時点では安全側に衝突失敗する。後続で `.gitignore`、`README.md`、`LICENSE`、既存 `package.json` のmerge方針を決める。 |
| bare `init` のinteractive prompt化 | 不要 | 中 | 本開発では `init --name <dir>` / `init .` の非対話入口を維持する。TTY / non-TTYの扱いは後続で決める。 |
| generated repo `packageManager` field | 不要 | 低から中 | pnpm version固定やCorepack運用まで含むため、scriptsとは分ける。 |

## Already done or closed

| item | source | current status | status | impact | recommendation | phase |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `metadata["@id"]` とstanzaディレクトリ名一致 | [open questions](../../investigation/open-questions.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md) | 仕様判断済み。Phase 2-1で一致を要求するvalidationを実装済み。 | `done` | custom element名と生成物URLのズレを防ぐ。 | 後続作業不要。 | None |
| `this.query()` method未指定時POST | [open questions](../../investigation/open-questions.md), [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [005](../../../workbench/cases/005-stanza-source-api/README.md) | 仕様判断済み。Phase 2-3でPOSTとして確認済み。 | `done` | docsと現行実装のズレをリメイク版仕様として固定した。 | 後続作業不要。GETなどは別項目。 | None |
| `togostanza--data-container` 破棄 | [open questions](../../investigation/open-questions.md), [Phase 2-5 handoff](../phase-2/phase-2-5/handoff.md) | 誤記として破棄。Phase 2-5で登録しないことを確認済み。 | `done` | 不要な互換面を増やさない。 | 後続作業不要。 | None |
| `style.scss` を正とする | [open questions](../../investigation/open-questions.md), [Phase 2-1 handoff](../phase-2/phase-2-1/handoff.md) | 仕様判断済み。`stanza.scss` は旧ドキュメント誤記として扱う。 | `done` | source layoutの開発契約を単純にする。 | 後続作業不要。 | None |
| boolean parameterの属性有無判定 | [open questions](../../investigation/open-questions.md), [Phase 2-3 handoff](../phase-2/phase-2-3/handoff.md), [004](../../../workbench/cases/004-runtime-parameters/README.md) | 仕様判断済み。Phase 2-3で属性有無による変換を確認済み。 | `done` | HTML埋め込み時のboolean挙動が安定する。 | 後続作業不要。 | None |
| 旧設定ファイルの検出と非実行 | [Phase 2-4 handoff](../phase-2/phase-2-4/handoff.md), [007](../../../workbench/cases/007-config-and-resolution/README.md), [follow-ups](../../investigation/follow-ups.md) | 旧 `togostanza-build.mjs` / `.js` は検出し、実行せず、`togostanza.config.ts` への移行warningを出す。007でも現行版が旧設定を読み込んでいないことを観測済み。 | `done` | 旧設定を自動実行しない安全側の制約を固定した。 | 後続作業不要。旧設定migration診断の文言改善は診断メッセージ整理で扱う。 | None |
| Codex sandboxではなく通常環境で確認する運用 | [open questions](../../investigation/open-questions.md), [Phase 0 handoff](../phase-0/handoff.md), [Phase 4 handoff](../phase-4/handoff.md) | browser testやwatcherは承認付き通常実行を優先する方針。 | `done` | 環境差を現行版やリメイク版の失敗と誤認するリスクを下げる。 | Phase 5でも検証コマンドを書く場合はこの方針を維持する。 | None |

## Phase 5で判断済みの振り分け

この一覧は、Phase 5で実装や検証を完了した項目ではない。Phase 5で送り先と扱いを判断した事項を記録する。

1. workbenchの `current-*` fixture整備はPhase 6で扱う。pack installを待たず、repo-localの `package/bin/togostanza.mjs` を `node` で呼ぶscriptsを基本にする。
2. path aliasは最終的に動けばよい。`tsconfig paths` 自動解決は本開発では必須にせず、`togostanza.config.ts` の `vite.resolve.alias` への手動移行案内と診断をPhase 8で優先する。
3. root assetをStanza sourceから安定参照する新規APIは本開発では追加しない。Stanza sourceから参照するassetは `stanzas/{id}/assets/` に置く。
4. `stanza:include` は本開発では扱わない。実プロジェクト利用が確認された場合だけ優先度を上げて再判断する。
5. 実プロジェクト回帰は、Phase 9で全Stanza build checkと代表Stanza browser smoke、Phase 11で全Stanza browser smoke、Phase X前に再実行とする。
6. TogoMedium Webアプリ本体E2EはPhase 11で設計して最小実行し、Phase X前に再実行する。Phase Xで初めて触る状態にはしない。
7. React / Vueは本開発では検証済みversionだけを保証対象にする。Phase 9で確認済みversionを記録し、広いversion matrixは実利用要求が出た場合にPhase 11で扱う。
8. `references/` 依存のcompatibility検証は、本開発ではローカル検証として扱う。CI化は対象外にし、Phase 9ではローカル再現手順と前提を記録する。
9. Runtime edge semanticsは、現行版で確認できる挙動に合わせる。現行版の挙動が未調査または曖昧なものはPhase 11で調査してから固定する。
10. internal runtime / build surface cleanupはPhase 10で扱う。外部契約と内部実装詳細を分け、Phase 6 workbench実行性とは混ぜない。
11. scaffold / CLI UXはPhase 10で扱う。ただしPhase 6ではworkbenchと生成repoの実行性に必要な最小scriptsだけ先に扱う。
12. 診断メッセージ体系の整理は本開発ではまとめて扱わず、Futureへ送る。各フェーズで必要な局所診断改善は行ってよい。
13. dependency分類はPhase 7で扱う。公開CLI相当の実行に必要なbuild runtime dependencyをPhase Xまで放置しない。
14. CLI status / result messagesはPhase Xで扱う。診断メッセージ体系とは分け、配布前の通常利用確認で `build` / `serve` の成功時・進捗・完了メッセージを整理する。

## 後続フェーズで再確認すること

次の項目はPhase 5では実施しない。各フェーズの詳細計画または実装時に、Phase 5の振り分けを前提として再確認する。

1. Phase 7でのdependency分類の具体値。
2. Phase 8での `tsconfig paths` 未解決時の移行案内と診断の具体形。
3. Phase 9で扱う代表Stanza browser smokeの対象。
4. Phase 11で扱う全Stanza browser smokeの実行方法と合格条件。
5. TogoMedium Webアプリ本体E2Eの起動条件、必要環境、最小画面、合格条件。
6. React / Vueの検証済みversionとして記録する範囲。
7. `references/` 依存のローカル再現手順。
8. Phase 11でRuntime edge semanticsについて、現行版で調査する具体項目。
9. Phase 10でinternal runtime / build surfaceのうち外部契約にするものと内部に留めるもの。
10. Phase 10で扱うscaffold / CLI UXの詳細範囲。
11. 診断メッセージ体系をFutureで扱う場合の入口条件。

## Proposed roadmap seed

このロードマップはPhase 5時点の振り分け結果であり、各フェーズの詳細計画で範囲と順序を再確認する。

| phase | theme | items |
| ---- | ---- | ---- |
| Phase 6 | workbench executability | workbench current fixture completeness、repo-local CLI scripts、generated repo `scripts.build` / `scripts.serve` |
| Phase 7 | package runtime readiness | dependency分類、`togostanza/stanza` export設計、公開CLI相当のpackage内部面確認 |
| Phase 8 | source and config readiness | `tsconfig paths` / alias移行案内、TogoMedium alias移行方針、metadata schema validation |
| Phase 9 | local compatibility baseline | referencesローカル再現手順、全Stanza build check、代表Stanza browser smoke、React / Vue検証済みversion記録 |
| Phase 10 | developer experience and internal cleanup | internal runtime / build surface cleanup、scaffold / CLI UX、generated workflow operational constraints |
| Phase 11 | compatibility verification | 全Stanza browser smoke、TogoMedium Webアプリ本体E2E、Runtime edge semantics |
| Phase X | distribution | pack-install smoke、package metadata、`files`、`exports`、`private`解除、tarball install、`npm exec` / `pnpm dlx`、CLI status / result messages、GitHub Actions live deploy、Phase 11 browser smoke / E2E再実行 |
