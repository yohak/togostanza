# Phase 5: readiness inventory 設計

Phase 5は、Phase 0からPhase 4までの成果物、仕様、検証、handoff、残課題を棚卸しし、Phase 6以降へ再編するためのフェーズである。

このフェーズでは、実装を広げない。目的は、配布準備へ進むことではなく、何を閉じるべきか、何を後続へ送れるか、どの順序で扱うべきかを判断できる状態にすることである。

## 目的

- Phase 0からPhase 4までのplan / handoffと、各検証ケースREADMEを読み直し、完了済み事項と残課題を整理する。
- `docs/spec/`、`docs/investigation/follow-ups.md`、`docs/investigation/open-questions.md`、各workbenchケースREADMEに残る未固定事項を棚卸しする。
- 残課題を分類し、根拠、影響範囲、提案先フェーズを記録する。
- Phase 6以降の仮ロードマップを作る。
- DistributionをPhase Xとして無期限延期し、Phase Xへ進む前の判断材料を整理する。

## 完了条件

- Phase 0からPhase 4までのplan / handoffと、各検証ケースREADMEを確認し、残課題を一覧化している。
- `docs/spec/`、`docs/investigation/follow-ups.md`、`docs/investigation/open-questions.md`、workbenchケースREADMEの未固定事項を確認している。
- 各項目に分類、根拠、影響範囲、提案先フェーズを付けている。
- Phase 6以降の再編案を提示している。
- Phase X: distributionに送る事項と、distribution前に閉じる事項を分けている。
- Phase 5の成果物を、後続フェーズ計画の入力として使える粒度で記録している。

## 含めるもの

- 完了済みフェーズのhandoff確認。
- 未固定事項、既知制約、後続判断、ブロッカーの棚卸し。
- 残課題の分類。
- Phase 6以降の仮フェーズ案。
- Phase Xへ送るdistribution関連項目の切り出し。
- 必要な文書リンクの整備。

## 含めないもの

- 新規機能実装。
- 既存実装の広範な修正。
- 追加compatibility実装。
- tarball install確認。
- npm package公開準備の実作業。
- `npm publish`、tag作成、GitHub release作成、live deploy確認。

## 分類軸

Phase 5では、棚卸し項目を少なくとも次の分類で扱う。

| 分類 | 意味 |
| ---- | ---- |
| `done` | Phase 0からPhase 4までで完了済み。後続作業は不要。 |
| `documented constraint` | 既知制約として記録済み。現時点では修正しない。 |
| `needs decision` | 人間判断または追加調査が必要。 |
| `distribution blocker` | Phase Xへ進む前に閉じる必要がある。 |
| `proposed phase` | Phase 6以降のどこで扱うかの提案。 |
| `defer to Phase X` | distribution着手時に扱えばよい。 |

## 棚卸し対象

Phase 5では、少なくとも次を確認する。

- [Phase 0引き継ぎ](../phase-0/handoff.md)
- [Phase 1引き継ぎ](../phase-1/handoff.md)
- [Phase 2引き継ぎ](../phase-2/handoff.md)
- [Phase 3引き継ぎ](../phase-3/handoff.md)
- [Phase 4引き継ぎ](../phase-4/handoff.md)
- [リメイク版仕様](../../spec/index.md)
- [リメイク方針](../../spec/remake-policy.md)
- [Follow-ups](../../investigation/follow-ups.md)
- [未解決事項](../../investigation/open-questions.md)
- `workbench/cases/*/README.md`

## 初期論点

Phase 4完了時点では、次の項目を棚卸し対象の初期候補とする。

- TogoMedium Webアプリ本体のbuild / start / end-to-end検証をどのフェーズで扱うか。
- 実プロジェクト回帰を自動testへさらに寄せるか。
- `tsconfig.json` の `compilerOptions.paths` 自動解決を実装するか。
- TogoMedium固有aliasを自動吸収するか、`togostanza.config.ts` への移行メモに留めるか。
- root assetをStanzaソースから安定して参照する公開APIを追加するか。
- `stanza:include` とpackage内JSON include解決を扱うか。
- `togostanza-utils` の未対象APIを追加で扱うか。
- React / Vue version差分をどこまで互換対象に含めるか。
- browser test増加に伴う検証時間とCI実行環境をどう扱うか。
- npm公開に必要なmetadata、`files`、`exports`、dependency分類の最終確認をいつ扱うか。

## 成果物

Phase 5では、次の成果物を作る。

- `docs/implementation/phase-5/inventory.md`
  - 棚卸し表。
  - 各項目の分類、根拠、影響範囲、提案先フェーズを記録する。
- `docs/implementation/phase-5/handoff.md`
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
