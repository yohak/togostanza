# Phase 10: developer experience and internal cleanup 設計

Phase 10は、Stanza開発者向けの案内と、外部契約にしない内部実装面を整理するフェーズである。

Phase 10では、Phase 6とPhase 7で既に解消済みの事項を再実装しない。生成repoの `build` / `serve` script、`togostanza/stanza` の公開用wrapper、内部ランタイムAPIの非公開化は完了済みの前提として扱う。

## 目的

- `init` が生成するREADMEを、実際の開発手順が分かる内容へ改善する。
- GitHub Pages workflowの運用制約を、生成repo内の文書として説明できるようにする。
- scaffold / CLI UXの残項目を、実装するもの、後続へ送るもの、採用しないものに分ける。
- internal runtime / build surfaceを、外部契約にするものと内部実装に留めるものに分ける。
- Phase 11の互換検証へ送る項目と、Phase 12の配布検証へ送る項目を混ぜない。

## 完了条件

- `init` が生成する `README.md` に、次の項目が含まれている。
  - `npm run build` / `pnpm build` と `npm run serve` / `pnpm serve` の基本手順。
  - `togostanza build` / `togostanza serve` との関係。
  - GitHub Pages workflowの概要。
  - npmでは `package-lock.json`、pnpmではpnpm 11系の `pnpm-lock.yaml` をcommitする前提。
  - `--skip-install` で初期化した場合は、後からinstallしてlockfileをcommitする必要があること。
- `package.json` に既に生成している `scripts.build` / `scripts.serve` の挙動をREADMEとtestで確認している。
- `index.ts` / `index.tsx` 生成option、bare `init` prompt、CLI library採用、細かいerror code分類をPhase 10で実装しない場合、その理由と後続先を記録している。
- `moduleResolution: "bundler"` を含む `tsconfig.json` を `init` 雛形へ追加するか判断し、追加しない場合は理由と後続先を記録している。
- Phase 5棚卸しで束ねた generated workflow operational constraintsを、Phase 10で扱うものとPhase 12へ送るものに分けて記録している。
- internal runtime / build surfaceについて、Phase 10で変更する項目と変更しない項目を明記している。
- 可能なら、build wrapper末尾の `export default StanzaClass` を削除しても生成物とbrowser testが通ることを確認する。削除しない場合は理由を記録する。
- `.togostanza-build-output` markerは、出力先cleanの所有権判定に使う内部markerとして扱い、外部契約ではないことを記録している。Phase 10では原則として削除しない。
- `metadata.json` のDownload JSON導線とヘルププレビューUIのリッチ化は、Phase 10では実装せず、後続の開発体験改善として扱うことを記録している。
- 001 READMEへPhase 10のリメイク版観測または差分を追記している。
- Phase 10完了後にhandoffを作る。

## 含めるもの

- `docs/implementation/phase-10/plan.md` の追加。
- `docs/implementation/index.md` へのPhase 10 / Phase 11追加。
- 生成README本文の改善。
- 生成READMEに対応するunit / integration test更新。
- 001 READMEのPhase 10観測結果更新。
- `moduleResolution: "bundler"` を含む `tsconfig.json` の雛形追加判断。
- build wrapperの `export default StanzaClass` を削除できるかの確認と、可能なら削除。
- internal runtime / build surfaceの後続判断整理。

## 含めないもの

- `init` の対話prompt。
- bare `init` の仕様変更。
- `index.ts` / `index.tsx` 生成optionの実装。
- CLI parserの `commander` などへの置き換え。
- 細かいerror code分類。
- ヘルププレビューUIのリッチ化。
- `index.html` と `-togostanza/` のヘルププレビュー生成。
- 全Stanza browser smoke。
- TogoMedium Webアプリ本体E2E。
- Runtime edge semanticsの現行版調査と固定。
- pack install smoke。
- npm package公開面の最終整理。
- GitHub Actions上でのlive deploy確認。

## 実装方針

### README

生成READMEは、最小のStanzaリポジトリとして作業を始めるための案内に寄せる。

必ず書く内容:

- install後のbuild / serve手順。
- npm / pnpmでのコマンド例。
- `generate stanza <id>` でStanzaを追加できること。
- GitHub Pages workflowが `dist/` をPages artifactとしてdeployすること。
- workflowは公開npm packageとしての `togostanza` 解決を前提にするため、Phase 12まではlive deploy未確認であることをREADMEへ直接書かない。生成repoの利用者向けREADMEでは、公開後の通常利用手順として自然に読める説明にする。
- lockfile前提と `--skip-install` 時の注意。

書きすぎない内容:

- Phase番号や本リポジトリ内部事情。
- repo-local CLI scripts。
- `references/` やworkbenchの説明。
- pack install未検証など、本リポジトリ内部の開発状況。

### scaffold / CLI UX

Phase 10では、次を実装しない方針を基本にする。

- bare `init` のprompt対応。
- `index.ts` / `index.tsx` 生成option。
- CLI library採用。
- 細かいerror code分類。

これらは、build / runtime成立やPhase 12着手前の配布blockerではない。必要になった場合は、後続のdeveloper experience改善として個別に計画する。

ただし、README本文やhelp文言と実装が食い違う場合はPhase 10で直す。

Phase 8からの引き継ぎとして、`moduleResolution: "bundler"` を含む `tsconfig.json` を `init` 雛形へ追加するかをPhase 10で判断する。これは `togostanza/stanza` や `togostanza/config` のexports-awareな型解決に関わるため、追加しない場合でも理由と後続先を記録する。既存workbench全体の `tsconfig.json` 一括更新はPhase 10の対象外とする。

### generated workflow operational constraints

Phase 10では、GitHub Pages workflowを「公開後の通常利用手順」として説明する。ただし、公開package解決そのものはPhase 12まで扱わない。

| 項目 | Phase 10での扱い |
| --- | --- |
| `dependencies.togostanza` が `^0.0.0` で生成されること | Phase 12へ送る。`^0.0.0` は実質的に `0.0.0` 固定なので、将来publish versionを上げたpackage解決にはそのまま使えない可能性がある。Phase 10ではdependency specを変更せず、publish versionと配布方針を決めるPhase 12で確定する。 |
| workflowがlockfileを前提にすること | Phase 10でREADMEと001へ記録する。npmでは `package-lock.json`、pnpmではpnpm 11系の `pnpm-lock.yaml` をcommitする前提にする。 |
| `--skip-install` 後にlockfile無しでpushするとworkflowが失敗しうること | Phase 10でREADMEと001へ記録する。skipした場合は後からinstallし、lockfileをcommitしてからpushする案内にする。 |
| Action major tag運用 | Phase 10では、生成workflowが使うAction major tagをREADMEまたは001で説明する。Action versionを外部互換契約にはせず、tag更新やlive validationはPhase 12または保守更新で扱う。 |
| `packageManager` field | Phase 10では生成しない方針を維持する。pnpm workflowはpnpm 11系を明示する。`packageManager` fieldを生成するかどうかは、Phase 12または後続のdeveloper experience改善で再判断する。 |

Phase 10のhandoffには、実スキャフォールドからそのままpushしてGitHub Actions deployまで通ることは、公開npm package解決を扱うPhase 12以降の確認であると記録する。

### internal runtime / build surface

Phase 7で、`togostanza/stanza` は公開用wrapperへ分離済みである。Phase 10では、外部公開APIの追加は行わない。

確認する項目:

- build wrapper末尾の `export default StanzaClass` が不要なら削除する。
- `.togostanza-build-output` markerは内部markerとして維持する。
- menu shellは内部DOMのまま維持し、`togostanza--menu` custom elementにはしない。
- `metadata.json` は公開配布物として維持するが、runtime fetch先ではない契約を維持する。
- Download JSON導線は `this.menu()` 経由の個別Stanza menu itemとして扱い、ヘルププレビューUI全体の設計へ広げない。

## 検証計画

ドキュメントのみの変更時:

- `git diff --check`

package実装またはtestに触れた場合:

- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run test:integration`
- 必要に応じて `cd package && mise exec -- pnpm run test:browser`

最終確認:

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。browser testやserve確認が必要な場合は、サンドボックス環境ではなくユーザーのローカル環境を優先する。

## 残す論点

- 生成READMEの詳しさを、最小手順に留めるか、GitHub Pages設定まで含めるか。
- build wrapper末尾の `export default StanzaClass` を削除できない場合、どの生成物互換に依存しているか。
- ヘルププレビューUIのリッチ化を、Phase 11後にどのフェーズへ置くか。
- CLI library採用を、どの程度のoption複雑化で再検討するか。

## 成果物

- `docs/implementation/phase-10/plan.md`
- `docs/implementation/index.md` のPhase 10 / Phase 11追記
- 生成README本文の更新
- package側test更新
- 001 READMEのPhase 10観測結果
- Phase 10完了後の `docs/implementation/phase-10/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 6引き継ぎ](../phase-6/handoff.md)
- [Phase 7引き継ぎ](../phase-7/handoff.md)
- [Phase 9引き継ぎ](../phase-9/handoff.md)
- [001 CLI scaffold and generate](../../../workbench/cases/001-cli-scaffold-and-generate/README.md)
- [実装計画](../index.md)
