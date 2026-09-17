# Phase 8: source and config readiness 設計

Phase 8は、Stanzaソースとbuild設定の移行可能性を整えるフェーズである。

このフェーズでは、`tsconfig.json` の `compilerOptions.paths` を自動でVite aliasへ合成しない。TogoMedium固有aliasも自動吸収しない。Phase 8では、既存stanzaリポジトリがリメイク版でbuildできない場合に、Stanza開発者がどの設定へ移せばよいか分かる状態を作る。

## 目的

- `tsconfig paths`、TogoMedium固有alias、旧設定ファイルから `togostanza.config.ts` への手動移行方針を明確にする。
- `moduleResolution: "node"` のままでは `togostanza/stanza` と `togostanza/config` の型解決に限界があることを案内する。
- metadata validationをリメイク版独自に強めず、現行版の観測済み挙動に合わせる。
- metadata異常系について、現行版の挙動を新しい検証ケースで観測できるようにする。
- 実装時に必要な局所診断改善の範囲を固定し、広範な診断メッセージ体系整理へ広げない。

## 完了条件

- Stanza開発者向けの手動移行ドキュメントを追加している。
- 手動移行ドキュメントに、`tsconfig paths` から `togostanza.config.ts` の `vite.resolve.alias` へ移す例がある。
- 手動移行ドキュメントに、TogoMediumの `%stanza/*`、`%core/*`、`%api/*` などのaliasを `vite.resolve.alias` へ移す例がある。
- 手動移行ドキュメントに、`moduleResolution: "bundler"` を推奨する理由と、既存の `moduleResolution: "node"` の限界を記録している。
- 旧 `togostanza-build.js` / `togostanza-build.mjs` は自動実行せず、`togostanza.config.ts` へ移す方針を手動移行ドキュメントへ記録している。
- `013-metadata-validation` 検証ケースを追加し、metadata異常系の最小セットを定義している。
- 固定済み最小validationについては、現行版観測は差分説明用であり、Phase 8完了条件ではないことを明記している。
- metadata validationは現行版挙動に合わせ、未観測edgeをリメイク版独自判断で固定しないことを明記している。
- Phase 8で追加または更新する検証入力の `tsconfig.json` は、必要に応じて `moduleResolution: "bundler"` を明示している。
- `docs/v4-migration/implementation/index.md` と `workbench/cases/README.md` からPhase 8と013ケースを参照できる。
- Phase 8完了後にhandoffを作る。

## 含めるもの

- `docs/for-developers/guides/source-config-migration.md` の追加。
- `docs/v4-migration/implementation/phase-8/plan.md` の追加。
- `workbench/cases/013-metadata-validation/README.md` の追加。
- `docs/v4-migration/implementation/index.md` へのPhase 8追加。
- `workbench/cases/README.md` への013追加。
- 必要に応じたbuild診断の局所改善。
- 必要に応じた `workbench/cases/007-config-and-resolution/README.md` の移行メモ更新。
- 必要に応じた `workbench/cases/012-real-project-regression/README.md` のTogoMedium alias移行メモ更新。

## 含めないもの

- `tsconfig.json` の `compilerOptions.paths` を自動でVite aliasへ合成する実装。
- TogoMedium固有aliasの自動吸収。
- 既存workbench全体の `tsconfig.json` 一括更新。
- `init` が生成する雛形への `tsconfig.json` 追加。
- 旧 `togostanza-build.js` / `togostanza-build.mjs` の自動実行。
- 広範なmetadata schema validation。
- 現行版で未観測のmetadata異常系の仕様固定。
- 全体的な診断メッセージ体系の整理。
- pack install smoke。
- Phase 12のdistribution準備。

## source / config移行方針

### `tsconfig paths`

`tsconfig.json` はTypeScript / TSXビルド設定として尊重する。ただし、Phase 8では `compilerOptions.paths` を自動でVite aliasへ合成しない。

`compilerOptions.paths` だけに依存するimportが未解決になる場合は、単純なbuild errorでよい。Phase 8では、そのerrorを必ず専用診断へ置き換えることは求めない。

一方で、Stanza開発者が手動で移行できるように、`togostanza.config.ts` の `vite.resolve.alias` へ移す手順をドキュメント化する。移行ドキュメントは仕様そのものではなく、既存stanzaリポジトリをリメイク版へ合わせるための案内として扱う。

### TogoMedium固有alias

TogoMediumで観測した `%stanza/*`、`%storybook/*`、`%core/*`、`%api/*` は、リメイク版CLIの一般機能として自動吸収しない。

Phase 8では、これらをTogoMedium側の `togostanza.config.ts` へ明示的に移す方針を維持する。一般機能として広げる場合は、TogoMedium以外への波及と保守負荷を整理して、別途人間判断を受ける。

### `moduleResolution`

Phase 7の型解決確認では、`moduleResolution: "bundler"` を明示した一時的なstanzaリポジトリ風入力を使った。

TypeScriptは従来の `moduleResolution: "node"` では、`package.json` の `exports` subpathを尊重しない。そのため、既存stanzaリポジトリが `moduleResolution: "node"` のままの場合、`togostanza/stanza` と `togostanza/config` の型解決がエディタや `tsc` で効かない可能性がある。

Phase 8では、手動移行ドキュメントで `moduleResolution: "bundler"` を推奨として案内する。Phase 8で追加または更新する検証入力の `tsconfig.json` も、必要に応じて `moduleResolution: "bundler"` に寄せる。

既存workbench全体の一括更新や、`init` が生成する雛形への `tsconfig.json` 追加はPhase 8では扱わない。雛形生成やCLI UXとして扱う場合はPhase 10へ送る。

### 旧設定ファイル

旧 `togostanza-build.js` / `togostanza-build.mjs` は、リメイク版では自動実行しない。

Phase 8では、旧設定に書かれていたaliasやplugin設定を `togostanza.config.ts` へ移す例を手動移行ドキュメントへ記録する。旧設定ファイルそのものの有効性確認や自動変換は扱わない。

## metadata validation方針

Phase 8では、metadata validationをリメイク版独自に強めない。現行版で通るmetadataは通し、現行版で落ちるmetadataは同等に落としてよい、という方針にする。

ただし、既にリメイク版仕様や過去フェーズで固定済みの最小validationは、現行版観測より優先する。`metadata.json` がvalid JSON objectであること、`@id` がstringであること、`@id` とstanzaディレクトリ名が一致すること、`@id` がStanza ID規則に従うことは、Phase 8で再オープンしない。

ただし、リメイク版では失敗時に対象ファイルやstanza IDが分かる診断を出せる場合は改善してよい。これは現行版より広いschemaを要求することではなく、既に失敗する入力の原因を分かりやすくするための局所診断改善である。

現行版で未観測のmetadata異常系は、推測でリメイク版仕様にしない。必要なものは `013-metadata-validation` で現行版を観測してから扱う。

Phase 8で観測候補にするmetadata異常系:

- 壊れたJSONの `metadata.json`。
- `metadata.json` がJSON objectでない。
- `@id` 欠落。
- `@id` がstringでない。
- `metadata["@id"]` とstanzaディレクトリ名の不一致。
- Stanza ID規則に従わない `@id`。
- `stanza:parameter` 欠落。
- `stanza:parameter` が配列でない。
- parameter項目の `stanza:key` 欠落。
- parameter項目の `stanza:type` 不明。
- `stanza:style` 欠落。
- `stanza:style` が配列でない。

この一覧は観測候補であり、すべてをPhase 8実装で同時に診断改善することを意味しない。現行版観測で、build時ではなくランタイム時に落ちるものがある場合は、その差分を013に記録してから扱う。

## 実装方針

### ドキュメント

`docs/for-developers/guides/source-config-migration.md` を新設する。この文書は、Stanza開発者が既存stanzaリポジトリをリメイク版へ移すときの案内であり、リメイク版仕様そのものではない。

最低限、次を含める。

- `compilerOptions.paths` から `vite.resolve.alias` への移行例。
- TogoMedium固有aliasの移行例。
- `moduleResolution: "bundler"` の推奨理由。
- 旧設定ファイルから `togostanza.config.ts` への移行方針。
- 自動対応しないもの。

### 検証ケース

`workbench/cases/013-metadata-validation/README.md` を新設する。

013は、metadata異常系の現行版観測とリメイク版観測を分けて記録するための検証ケースである。最初はREADME定義だけを置き、Phase 8実装時に必要な `current-pnpm/` や `remake/` のケース入力を追加してよい。

013はmetadataの完全schema検査を目的にしない。目的は、現行版でどの異常入力がどの段階で落ちるかを観測し、リメイク版がそれ以上も以下も要求しないようにすることである。

### package実装

Phase 8で実装する場合は、既存のbuild / serve経路に最小限の局所診断を追加する。

優先候補:

- `metadata.json` のJSON parse失敗時に、対象ファイルpathを含める。
- `@id` 不一致診断を維持する。
- 現行版でも明確に失敗するmetadata形について、リメイク版でも原因が分かる診断にする。

`stanza:parameter` の全フィールド、`stanza:style` の全フィールド、`stanza:example` の型厳密性、未使用フィールドの警告などはPhase 8の主目的にしない。

## 検証計画

ドキュメントのみの変更時:

- `git diff --check`

013ケース入力を追加した場合:

- 現行版検証環境で対象ケースを実行し、READMEへ観測結果を記録する。
- リメイク版検証環境を追加する場合は、repo-local CLI scriptの前提に従う。

package実装に触れた場合:

- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run test:integration`

最終確認:

- `cd package && mise exec -- pnpm run check-all`

package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。browser testやserve確認が必要な場合は、サンドボックス環境ではなくユーザーのローカル環境を優先する。

## 残す論点

- `013-metadata-validation` で最初に実ケース入力まで作るか、README定義だけでレビューへ出すか。
- metadata異常系のうち、build時診断へ寄せるものとランタイム挙動として残すもの。
- 未解決importの診断をどこまで補助するか。
- `togostanza.config.ts` の設定schemaをどこまで検査するか。
- `moduleResolution: "bundler"` を、将来の `init` 雛形へ入れるか。
- 手動移行ドキュメントを、将来のREADMEや公開docsへどう接続するか。

## 成果物

- `docs/v4-migration/implementation/phase-8/plan.md`
- `docs/for-developers/guides/source-config-migration.md`
- `workbench/cases/013-metadata-validation/README.md`
- `docs/v4-migration/implementation/index.md` のPhase 8追加
- `workbench/cases/README.md` の013追加
- 必要に応じた `docs/README.md` のguide導線追加
- Phase 8完了後の `docs/v4-migration/implementation/phase-8/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 7引き継ぎ](../phase-7/handoff.md)
- [source / config移行ガイド](../../../for-developers/guides/source-config-migration.md)
- [013 metadata validation](../../../../workbench/cases/013-metadata-validation/README.md)
- [実装計画](../index.md)
