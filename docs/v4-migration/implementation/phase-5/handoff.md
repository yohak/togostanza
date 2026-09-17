# Phase 5: readiness inventory 引き継ぎ

この文書では、Phase 5完了後にPhase 6以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 5の設計は [plan.md](./plan.md) を正とする。棚卸し結果は [inventory.md](./inventory.md) を正とする。この文書は設計や棚卸し表の再掲ではなく、Phase 6以降へ入るための入口メモである。

## 完了したこと

- Phase 0からPhase 4までのplan / handoffを読み直し、残課題を [inventory.md](./inventory.md) に集約した。
- `docs/v4-migration/spec/`、`docs/v4-migration/investigation/follow-ups.md`、`docs/v4-migration/investigation/open-questions.md`、各workbenchケースREADMEに残る未固定事項を棚卸しした。
- 古い `Phase 5 = distribution` 前提の送り先を見直し、Phase 12またはPhase 6以降へ再分類した。
- `pack -> install -> 実行` 未検証を、単一のdistribution blockerとして整理した。
- `status` と `phase` を分け、状態と振り分け先が混ざらないようにした。
- `Future`、`done`、`documented constraint` はメインの未解決テーブルから分け、対象外整理と完了済み事項として読めるようにした。
- Phase 5で判断済みの振り分けと、後続フェーズで再確認することを短い一覧にした。
- Phase 6からPhase 11までの通常フェーズ案と、Phase 12 distributionを `Proposed roadmap seed` として整理した。

## Phase 5で判断したこと

- Phase 6は `workbench current fixture completeness` と、repo-local CLI scripts、generated repo `scripts.build` / `scripts.serve` を扱う。
- Phase 7はpackage runtime readinessとして、dependency分類、`togostanza/stanza` export設計、公開CLI相当のpackage内部面確認を扱う。
- Phase 8はsource and config readinessとして、`tsconfig paths` / alias移行案内、TogoMedium alias移行方針、metadata schema validationを扱う。
- Phase 9はlocal compatibility baselineとして、referencesローカル再現手順、全Stanza build check、代表Stanza browser smoke、React / Vue検証済みversion記録を扱う。
- Phase 10はdeveloper experience and internal cleanupとして、internal runtime / build surface cleanup、scaffold / CLI UX、generated workflow operational constraintsを扱う。
- Phase 11はcompatibility verificationとして、全Stanza browser smoke、TogoMedium Webアプリ本体E2E、Runtime edge semanticsを扱う。
- Phase 12 distributionは、pack-install smoke、package metadata、`files`、`exports`、`private` 解除、tarball install、`npm exec` / `pnpm dlx`、GitHub Actions live deployを扱う後続フェーズとして切り出した。

## 意図的に残したこと

- 新規機能実装。
- package設定や実装ファイルの修正。
- tarball install確認。
- `npm publish`、tag作成、GitHub release作成、live deploy確認。
- Phase 6以降の詳細計画。
- Phase 6以降の実装順序やAPI詳細の固定。
- `inventory.md` にある後続フェーズ項目の実作業。

## Phase 6へ渡す前提

- Phase 6はdistribution準備ではなく、workbenchの実行性を整えるフェーズとして始める。
- `current-*` fixtureは、pack installを待たずにrepo-localの `package/bin/togostanza.mjs` を `node` で呼ぶscriptsを基本にする。
- pack-install smokeはPhase 12のdistribution検証として別に扱う。
- generated repoには、`build: "togostanza build"` と `serve: "togostanza serve"` の追加を有力項目として扱う。
- workflowは引き続き `npm exec` / `pnpm exec` 直接呼びでよい。
- Phase 6の詳細計画では、対象にするworkbenchケース、scriptsの形、既存 `current-*` の揃え方、確認コマンドを先に固定する。

## Phase 7以降へ渡す前提

- dependency分類はPhase 12まで放置せず、Phase 7で現在の開発検証を壊す不整合として扱う。
- `togostanza/stanza` exportと型定義は、distribution blockerでもあるが、Phase 7で方針だけ先に設計してよい。
- `tsconfig paths` 自動解決は本開発では必須にしない。Phase 8では `togostanza.config.ts` の `vite.resolve.alias` への手動移行案内と、未解決alias時の診断を優先する。
- TogoMedium固有aliasは、既定では自動吸収せず、TogoMedium側の手動移行設定として扱う。
- 実プロジェクト回帰は、Phase 9で全Stanza build checkと代表Stanza browser smoke、Phase 11で全Stanza browser smokeを扱う。
- TogoMedium Webアプリ本体E2EはPhase 11で設計して最小実行し、Phase 12で初めて触る状態にはしない。
- Runtime edge semanticsは、現行版で確認できる挙動に合わせる。未調査または曖昧なものはPhase 11で調査してから固定する。

## Phase 12へ渡す前提

- `pack -> install -> 実行` 未検証は、Phase 12の最初のblockerとして扱う。
- `files`、`exports`、`bin`、shebang、dependency分類、`private`、version、runtime path解決は、pack-install smokeでまとめて露出する可能性がある。
- CLI status / result messagesは、診断メッセージ体系とは分け、Phase 12の配布前通常利用確認で扱う。
- GitHub Actions live deployは、pack-install smoke後に確認する。
- Phase 12着手前には、Phase 11のbrowser smoke / E2Eを再実行する。

## 注意すること

- `inventory.md` は済み一覧ではなく、分類とrouting判断の正本である。後続フェーズで詳細計画を作るときは、該当項目のsource、current status、impact、recommendationを確認する。
- `documented constraint` と本開発の対象外整理は、価値が低い項目ではない。中核のbuild / runtime / compatibility成立と混ぜないために外した項目も含む。
- `Future` はPhase 12と同義ではない。distribution前に効くものはPhase 12へ、実利用要求が出たら再評価するものはFutureとして扱う。
- `references/` 依存検証は本開発ではローカルcompatibility検証として扱い、CI化は対象外とした。
- 診断メッセージ体系の整理は本開発ではまとめて扱わない。ただし各フェーズで必要な局所診断改善は行ってよい。

## 確認結果

- `git diff --check` を実行し、問題なし。
- Phase 5は文書中心のフェーズであり、実装ファイルとpackage設定を変更していないため、`cd package && mise exec -- pnpm run check-all` は実行していない。

## 関連文書

- [Phase 5設計](./plan.md)
- [Phase 5棚卸し](./inventory.md)
- [実装計画](../index.md)
