# Phase 5: readiness inventory 設計

Phase 5は、Phase 0からPhase 4までの成果物、仕様、検証、handoff、残課題を棚卸しし、Phase 6以降へ再編するためのフェーズである。

このフェーズでは、実装を広げない。目的は、配布準備へ進むことではなく、何を閉じるべきか、何を後続へ送れるか、どの順序で扱うべきかを判断できる状態にすることである。

Phase 5では、棚卸しと再設計を混ぜない。Phase 5の成果は実装判断そのものではなく、後続で判断できる材料である。

## 目的

- Phase 0からPhase 4までのplan / handoffと、各検証ケースREADMEを読み直し、完了済み事項と残課題を整理する。
- `docs/v4-migration/spec/`、`docs/v4-migration/investigation/follow-ups.md`、`docs/v4-migration/investigation/open-questions.md`、各workbenchケースREADMEに残る未固定事項を棚卸しする。
- 残課題の状態と振り分け先フェーズを分け、根拠、影響範囲、推奨を記録する。
- Phase 6以降の仮ロードマップを作る。ただし、詳細なAPI設計や実装順序までは固定しない。
- DistributionをPhase 12として後続に切り出し、Phase 12で扱う判断材料を整理する。

## 完了条件

- Phase 0からPhase 4までのplan / handoffと、各検証ケースREADMEを確認し、残課題を一覧化している。
- `docs/v4-migration/spec/`、`docs/v4-migration/investigation/follow-ups.md`、`docs/v4-migration/investigation/open-questions.md`、workbenchケースREADMEの未固定事項を確認している。
- 各項目に状態、根拠、影響範囲、振り分け先フェーズを付けている。
- Phase 6以降の再編案を提示している。
- Phase 12: distributionに送る事項と、distribution前に閉じる事項を分けている。
- Phase 5の成果物を、後続フェーズ計画の入力として使える粒度で記録している。
- Phase 5で判断済みの振り分けと、後続フェーズで再確認することを、短い一覧として切り出している。

## 含めるもの

- 完了済みフェーズのhandoff確認。
- 完了済みフェーズのplan確認。
- 未固定事項、既知制約、後続判断、ブロッカーの棚卸し。
- 残課題の状態分類。
- Phase 6以降の仮フェーズ案。
- Phase 12へ送るdistribution関連項目の切り出し。
- 必要な文書リンクの整備。

## 含めないもの

- 新規機能実装。
- 既存実装の広範な修正。
- 追加compatibility実装。
- tarball install確認。
- npm package公開準備の実作業。
- `npm publish`、tag作成、GitHub release作成、live deploy確認。

## 進め方

Phase 5では、次の順序で棚卸しする。

1. 入力文書を固定する。
2. 古いPhase 5送りをすべて拾い直し、現在のPhase 5定義に合わせて再分類する。
3. `docs/v4-migration/investigation/follow-ups.md` と `docs/v4-migration/investigation/open-questions.md` の項目を、閉じずに状態分類する。
4. 各workbenchケースREADMEに残る未固定事項、観測未了、リメイク版差分を分類する。
5. Phase 6以降の仮ロードマップを、項目ごとの振り分け先フェーズと理由に留めて作る。

Phase 5中に閉じてよいのは、根拠が十分で、すでに実装・検証済みで、仕様またはhandoffに反映済みの項目だけである。それ以外は勝手に確定せず、`needs decision` または `open` として記録し、振り分け先フェーズを別に示す。

## status / phase

Phase 5では、棚卸し項目の状態を `status`、振り分け先を `phase` として分ける。

| status | 意味 |
| ---- | ---- |
| `done` | Phase 0からPhase 4までで完了済み。後続作業は不要。 |
| `documented constraint` | 既知制約として記録済み。現時点では修正しない。 |
| `needs decision` | 人間判断または追加調査が必要。 |
| `distribution blocker` | Phase 12で閉じる必要がある。 |
| `open` | 未解決。扱うフェーズは `phase` 列に記録する。 |

`phase` はPhase 5時点の振り分け先を示す。各フェーズの意味は [Phase 5棚卸し](./inventory.md) の `Proposed roadmap seed` を参照し、詳細な範囲、API、実装順序は、そのフェーズの詳細計画で再確認する。

同じ未対応でも、次を混ぜない。

- リメイク版仕様が要求しているが未対応またはdeferしている実ギャップ。
- 仕様や方針で固定しないことを明記した既知制約。
- 実プロジェクト由来の制約や移行判断。
- distribution前にだけ問題になる項目。

## 棚卸し対象

Phase 5では、少なくとも次を確認する。

- [Phase 0設計](../phase-0/plan.md)
- [Phase 0引き継ぎ](../phase-0/handoff.md)
- [Phase 1設計](../phase-1/plan.md)
- [Phase 1引き継ぎ](../phase-1/handoff.md)
- [Phase 2サブフェーズ計画](../phase-2/index.md)
- [Phase 2引き継ぎ](../phase-2/handoff.md)
- [Phase 3設計](../phase-3/plan.md)
- [Phase 3引き継ぎ](../phase-3/handoff.md)
- [Phase 4設計](../phase-4/plan.md)
- [Phase 4引き継ぎ](../phase-4/handoff.md)
- [リメイク版仕様](../../spec/index.md)
- [リメイク方針](../../spec/remake-policy.md)
- [Follow-ups](../../investigation/follow-ups.md)
- [未解決事項](../../investigation/open-questions.md)
- `workbench/cases/*/README.md`

## 初期論点

Phase 4完了時点では、次の項目を棚卸し対象の初期項目とする。

- `pack -> install -> 実行` を一度も確認していないことを、単一のdistribution blockerとして扱うか。
- `togostanza/stanza` のpackage exportと型定義をどう扱うか。
- TogoMedium Webアプリ本体のbuild / start / end-to-end検証をどのフェーズで扱うか。
- 実プロジェクト回帰を自動testへさらに寄せるか。
- `tsconfig.json` の `compilerOptions.paths` 自動解決を実装するか。
- TogoMedium固有aliasを自動吸収するか、`togostanza.config.ts` への移行メモに留めるか。
- root assetをStanzaソースから安定して参照する公開APIを追加するか。
- `stanza:include` とpackage内JSON include解決を扱うか。
- `togostanza-utils` の未対象APIを追加で扱うか。
- React / Vue version差分をどこまで互換対象に含めるか。
- `references/` 依存のbrowser testを、CIや他マシンで再現できる形へ寄せるか。
- browser test増加に伴う検証時間とCI実行環境をどう扱うか。
- npm公開に必要なmetadata、`files`、`exports`、dependency分類の最終確認をいつ扱うか。
- `treeshake: false` を戻さない、CSS source map精度は非契約、Sass `@import` 警告は許容、という既知制約をどう固定するか。

これらはPhase 5開始時点の初期論点である。Phase 5中に判断した項目と振り分け結果は、[Phase 5棚卸し](./inventory.md) の `Phase 5で判断済みの振り分け` と `Proposed roadmap seed` を正とする。

## 成果物

Phase 5では、次の成果物を作る。

- `docs/v4-migration/implementation/phase-5/inventory.md`
  - 棚卸し表。
  - 各項目のitem、source、current status、status、impact、recommendation、phaseを記録する。
  - 古いPhase 5送りの再分類、open / follow-up項目、workbenchケースの残課題、distribution blocker、documented constraintを分けて読める形にする。
  - Phase 5で判断済みの振り分けと、後続フェーズで再確認することを短い一覧として切り出す。
- `docs/v4-migration/implementation/phase-5/handoff.md`
  - Phase 5完了後にPhase 6以降へ渡す入口メモ。

必要に応じて、Phase 6以降の詳細計画はPhase 5完了後に別途作成する。

## 確認計画

Phase 5は文書中心のフェーズである。

- `git diff --check`
- リンクの目視確認

実装ファイルを変更しない場合、`cd package && mise exec -- pnpm run check-all` は必須にしない。実装やpackage設定へ触れた場合のみ、変更内容に応じて実行する。

## 関連文書

- [実装計画](../index.md)
- [Phase 4引き継ぎ](../phase-4/handoff.md)
- [Phase 5棚卸し](./inventory.md)
