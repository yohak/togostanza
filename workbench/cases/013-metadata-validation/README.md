# 013 metadata validation

この検証ケースでは、`metadata.json` の異常系について、現行版とリメイク版の扱いを確認する。

## 目的

- metadata validationをリメイク版独自に強めない。
- 現行版で通るmetadataはリメイク版でも通す。
- 現行版で落ちるmetadataは、リメイク版でも同等に落としてよい。
- ただし、既にリメイク版仕様で固定済みの最小validationは現行版観測より優先する。
- リメイク版で失敗させる場合は、対象stanza IDまたはfile pathが分かる診断にできるか確認する。
- 現行版で未観測のmetadata異常系を、推測でリメイク版仕様にしない。

## 対応する方針

- `metadata["@id"]` とstanzaディレクトリ名は一致必須とする。
- `metadata.json` はvalid JSON objectであり、`@id` はstringであり、`@id` はStanza ID規則に従う必要がある。
- 詳細なメタデータschemaとvalidation規則は、リメイク版仕様では固定しない。
- `stanza:parameter`、`stanza:style`、`stanza:menu-placement` はランタイムと生成物に影響するが、Phase 8では現行版挙動に合わせる。
- 広範なschema validationではなく、現行版で失敗する入力の観測と、リメイク版の診断改善を扱う。

## 入力条件

最小のStanzaリポジトリを用意し、異常系ごとに小さなscenarioへ分ける。

基本構成:

```text
current-pnpm/
  mise.toml
  scenarios/
    <scenario>/
      generated-repo/
        package.json
        stanzas/
          <stanza-id>/
            metadata.json
remake/
  scenarios/
    <scenario>/
      generated-repo/
        package.json
        stanzas/
          <stanza-id>/
            metadata.json
```

metadata読み込み段階で失敗するscenarioは、`index.js`、`style.scss`、templateを置かない。後続段階の挙動を観測するscenarioでは、必要になった時点でStanzaソースを追加する。

実体化済みscenario:

| scenario | 目的 | 状態 |
| ---- | ---- | ---- |
| `malformed-json` | 壊れたJSONの `metadata.json` | current/remake入力あり |
| `metadata-not-object` | `metadata.json` がJSON objectでない | current/remake入力あり |
| `missing-id` | `@id` 欠落 | current/remake入力あり |
| `id-not-string` | `@id` がstringでない | current/remake入力あり |
| `id-mismatch` | `@id` とstanzaディレクトリ名の不一致 | current/remake入力あり |
| `invalid-stanza-id` | Stanza ID規則に従わない `@id` | current/remake入力あり |

未実体化の候補:

- `stanza:parameter` 欠落。
- `stanza:parameter` が配列でない。
- parameter項目の `stanza:key` 欠落。
- `stanza:type` が未知値。
- `stanza:style` 欠落。
- `stanza:style` が配列でない。

## 現行版で観測すること

- 壊れたJSONの `metadata.json` がbuild時にどう失敗するか。
- `metadata.json` がJSON objectでない場合にどう失敗するか。
- `@id` が欠落した場合にどう失敗するか。
- `@id` がstringでない場合にどう失敗するか。
- `metadata["@id"]` とstanzaディレクトリ名が異なる場合に、build生成物やランタイムがどう振る舞うか。
- Stanza ID規則に従わない `@id` の場合にどう失敗するか。
- `stanza:parameter` が欠落した場合に、build時、ヘルプページ生成時、ランタイム時のどこで失敗するか。
- `stanza:parameter` が配列でない場合に、どこで失敗するか。
- parameter項目の `stanza:key` が欠落した場合に、buildまたはランタイムがどう振る舞うか。
- `stanza:type` が未知値の場合に、string相当として扱われるか。
- `stanza:style` が欠落した場合に、buildまたはランタイムがどう振る舞うか。
- `stanza:style` が配列でない場合に、どこで失敗するか。

### Phase 11-4 ソース読解メモ

`references/togostanza` commit `2e5982d` の `src/stanza-element.mjs` と `stanza.ts` では、`stanza:parameter` と `stanza:style` は配列前提で `.map` される。

- `stanza:parameter` 欠落または非配列は、custom element定義時または `this.params` 評価時に失敗し得る。
- parameter項目の `stanza:key` 欠落は、`undefined` keyとして扱われ得る。
- 未知の `stanza:type` はdefault分岐でstringとして扱われる。
- `stanza:style` 欠落はCSS custom property既定値なしで通る。
- `stanza:style` 非配列は、CSS custom property既定値生成時に失敗し得る。

リメイク版は、Phase 11-4時点で `stanza:parameter` / `stanza:style` の異常形を現行版と同じ失敗へ寄せない。広範なschema validationを本開発で追加しない方針と整合させ、key/typeが読めない項目は無視し、style異常形はCSS既定値なしとして扱う。固定済み最小validation以外のmetadata詳細validationは、後続判断に残す。

### 現行版観測結果

Phase 8着手時点では、固定済み最小validationの入力だけを `current-pnpm/scenarios/` に用意した。現行版CLIでの実行結果は未観測である。

現行版観測を行う場合は、対象scenarioの `generated-repo/` で依存をインストールし、次を実行する。

```sh
pnpm run build
```

現行版観測は、リメイク版で既に仕様固定済みの最小validationを覆すためではなく、現行版との差分説明を残すために行う。固定済み最小validationだけを扱う場合、現行版観測はPhase 8完了条件ではない。

## リメイク版で観測すること

- 現行版で通ったmetadata異常系を、リメイク版独自の厳格化で失敗させていないこと。
- 現行版で失敗したmetadata異常系は、リメイク版でも失敗してよいこと。
- リメイク版で失敗する場合、可能な範囲で `metadata.json` のpathやstanza IDが診断に含まれること。
- valid JSON object、`@id` string、`@id` 不一致、Stanza ID規則の最小validationは、既に仕様判断済みの想定外入力として分かりやすく失敗すること。
- `stanza:type` 未知値など、現行版が許容する挙動はリメイク版でも壊さないこと。

### リメイク版観測結果

実行前提:

```sh
mise exec -- pnpm run build
```

各scenarioの `remake/scenarios/<scenario>/generated-repo/` で次を実行した。

```sh
pnpm run build:local
```

結果:

| scenario | exit | 診断 |
| ---- | ---- | ---- |
| `malformed-json` | `1` | `Invalid stanza metadata: malformed JSON at .../stanzas/malformed-json/metadata.json.` |
| `metadata-not-object` | `1` | `Invalid stanza metadata: expected an object at .../stanzas/metadata-not-object/metadata.json.` |
| `missing-id` | `1` | `Invalid stanza metadata: @id must be a string at .../stanzas/missing-id/metadata.json.` |
| `id-not-string` | `1` | `Invalid stanza metadata: @id must be a string at .../stanzas/id-not-string/metadata.json.` |
| `id-mismatch` | `1` | `Invalid stanza metadata: @id other-id must match directory name id-mismatch at .../stanzas/id-mismatch/metadata.json.` |
| `invalid-stanza-id` | `1` | `Invalid stanza metadata: @id is not a valid stanza id at .../stanzas/bad--id/metadata.json.` |

いずれも、リメイク版仕様で固定済みの最小validationとしてbuild時に失敗した。診断には対象 `metadata.json` のpathが含まれる。

## 合格条件

- spec-fixedな最小validation scenarioは、リメイク版観測結果と、現行版観測を要しない理由がREADMEに記録されている。
- parameter / style系の現行版観測はPhase 11で扱う。013全体としては継続するが、Phase 8では未完了扱いにしない。
- リメイク版が現行版より広いmetadata schemaを要求する場合は、理由と人間判断が記録されている。
- リメイク版が現行版より緩くする場合は、影響範囲が記録されている。
- valid JSON object、`@id` string、`@id` 不一致、Stanza ID規則のように既にリメイク版仕様で決めたものは、その仕様に従っている。
- 未観測のedgeを、リメイク版仕様として固定していない。

## 記録する差分

- build時に失敗するか、ランタイム時に失敗するか。
- error / warningの出力先と文言。
- 診断にstanza IDやfile pathが含まれるか。
- 現行版は通るがリメイク版では意図的に落とす入力。
- 現行版は落ちるがリメイク版では意図的に通す入力。

## 未決定事項

- 最初に実体化するmetadata異常系の数。
- 現行版でランタイム時に落ちる異常系を、リメイク版でbuild時診断へ寄せるか。
- `stanza:parameter` 欠落を、現行版互換としてランタイム失敗に寄せるか、build時診断へ寄せるか。
- `stanza:style` 欠落や異常形を、どこまで診断対象にするか。
- 013の観測を、package automated testへどこまで還元するか。

## 関連文書

- [Phase 8設計](../../../docs/implementation/phase-8/plan.md)
- [リメイク版仕様](../../../docs/spec/index.md)
- [リメイク方針](../../../docs/spec/remake-policy.md)
- [source / config移行ガイド](../../../docs/guides/source-config-migration.md)
