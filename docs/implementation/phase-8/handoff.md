# Phase 8: source and config readiness 引き継ぎ

この文書では、Phase 8完了後にPhase 9以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 8の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- Stanza開発者向けの [source / config移行ガイド](../../guides/source-config-migration.md) を追加した。
- `tsconfig.json` の `compilerOptions.paths` は自動でVite aliasへ合成せず、`togostanza.config.ts` の `vite.resolve.alias` へ手動移行する方針を記録した。
- TogoMedium固有aliasは自動吸収せず、TogoMedium側の `togostanza.config.ts` へ明示する方針を記録した。
- `moduleResolution: "node"` の限界と、`moduleResolution: "bundler"` 推奨を移行ガイドに記録した。
- 旧 `togostanza-build.js` / `togostanza-build.mjs` は自動実行せず、`togostanza.config.ts` へ移す方針を記録した。
- [013 metadata validation](../../../workbench/cases/013-metadata-validation/README.md) を追加した。
- 013に、固定済み最小validationの現行版 / リメイク版ケース入力を追加した。
- リメイク版の固定済み最小validationについて、package側unit testを追加した。
- 013のリメイク版scenarioを実行し、対象 `metadata.json` のpathを含む診断で失敗することを記録した。
- scenario配下の `remake/**/generated-repo/pnpm-lock.yaml` をGit管理外にするため、`.gitignore` を更新した。

## 固定したこと

- `tsconfig paths` はPhase 8では自動解決しない。
- 未解決importは、基本的に通常のbuild errorでよい。
- 手動移行ガイドは、Phase 8の成果物として維持する。
- metadata validationは、リメイク版独自に広げない。
- ただし、既にリメイク版仕様や過去フェーズで固定済みの最小validationは、現行版観測より優先する。
- `metadata.json` がvalid JSON objectであること、`@id` がstringであること、`@id` とstanzaディレクトリ名が一致すること、`togostanza-{id}` がvalid custom element名になることは、再オープンしない。

## 013で実体化したscenario

current / remakeの両方に、次のscenario入力を置いた。

| scenario | 目的 |
| ---- | ---- |
| `malformed-json` | 壊れたJSONの `metadata.json` |
| `metadata-not-object` | `metadata.json` がJSON objectでない |
| `missing-id` | `@id` 欠落 |
| `id-not-string` | `@id` がstringでない |
| `id-mismatch` | `@id` とstanzaディレクトリ名の不一致 |
| `invalid-custom-element-id` | `togostanza-{id}` がvalid custom element名にならない `@id` |

リメイク版では、各scenarioの `remake/scenarios/<scenario>/generated-repo/` で `pnpm run build:local` を実行し、すべてexit `1` で失敗することを確認した。

現行版用の `current-pnpm/scenarios/` には入力だけを置いた。Phase 8では現行版CLIでの実行結果は未観測である。これは、上記6項目が既にリメイク版仕様で固定済みの最小validationであり、現行版観測によって覆す対象ではないためである。

## 意図的に残したこと

- `stanza:parameter` 欠落の現行版観測。
- `stanza:parameter` が配列でない場合の現行版観測。
- parameter項目の `stanza:key` 欠落の現行版観測。
- `stanza:type` 未知値の現行版観測。
- `stanza:style` 欠落の現行版観測。
- `stanza:style` が配列でない場合の現行版観測。
- `tsconfig paths` の自動解決。
- TogoMedium固有aliasの自動吸収。
- 既存workbench全体の `tsconfig.json` 一括更新。
- `init` 雛形への `tsconfig.json` 追加。
- 旧設定ファイルの自動実行。
- 全体的な診断メッセージ体系の整理。

## Phase 9へ渡す前提

- Phase 9で実プロジェクト群のローカル再現手順を作る場合、TogoMedium aliasは自動吸収ではなく `togostanza.config.ts` の `vite.resolve.alias` として扱う。
- Phase 9で実プロジェクト群のbuild checkを行う場合、`tsconfig paths` だけに依存するimportは失敗してよい。必要なaliasは移行ガイドに沿って明示する。
- React / Vue検証済みversionの記録と、referencesローカル再現手順はPhase 9で扱う。

## Phase 10以降へ渡す前提

- `moduleResolution: "bundler"` を `init` 雛形へ入れるかどうかは、Phase 10のscaffold / CLI UXで扱う。
- `tsconfig paths` 自動解決を将来採用する場合は、Phase 8の手動移行方針を置き換える変更として扱い、人間判断を受ける。
- TogoMedium固有aliasを一般機能へ広げる場合は、TogoMedium以外への波及と保守負荷を整理する。
- 013で未実体化のmetadata異常系は、Runtime edge semanticsを扱うPhase 11と接続してよい。

## 注意すること

- 013はmetadataの完全schema検査ケースではない。
- 013は、現行版でどの異常入力がどの段階で落ちるかを観測し、リメイク版がそれ以上も以下も要求しないようにするための検証ケースである。
- 固定済み最小validationは、現行版観測より優先する。特に `@id` 不一致は、現行版で通る可能性があってもリメイク版では失敗でよい。
- `pnpm run build:local` を013のremake scenarioで実行すると、scenario配下に `node_modules/` や `pnpm-lock.yaml` が生成され得る。これらはGit管理しない。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run build` を確認し、通った。
- `cd package && mise exec -- pnpm run test:unit` はサンドボックス内ではlocalhost listenを使う既存serve系unit testが `EPERM` で失敗した。
- `cd package && mise exec -- pnpm run test:unit` を承認付き通常実行で確認し、75件が通った。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、format / lint / type-check / build / unit 75件 / integration 21件 / browser 13件が通った。
- 013のリメイク版6scenarioで `pnpm run build:local` を実行し、すべて期待どおりexit `1` で診断を返した。

## 関連文書

- [Phase 8設計](./plan.md)
- [source / config移行ガイド](../../guides/source-config-migration.md)
- [013 metadata validation](../../../workbench/cases/013-metadata-validation/README.md)
- [Phase 7引き継ぎ](../phase-7/handoff.md)
- [実装計画](../index.md)
