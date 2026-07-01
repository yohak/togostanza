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
- `metadata.json` はvalid JSON objectであり、`@id` はstringであり、`togostanza-{id}` がvalid custom element名になる必要がある。
- 詳細なメタデータschemaとvalidation規則は、リメイク版仕様では固定しない。
- `stanza:parameter`、`stanza:style`、`stanza:menu-placement` はランタイムと生成物に影響するが、Phase 8では現行版挙動に合わせる。
- 広範なschema validationではなく、現行版で失敗する入力の観測と、リメイク版の診断改善を扱う。

## 入力条件

最小のStanzaリポジトリを用意し、異常系ごとに小さなstanzaを分ける。

候補:

```text
generated-repo/
  package.json
  stanzas/
    malformed-json/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    metadata-not-object/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    missing-id/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    id-not-string/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    id-mismatch/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    invalid-custom-element-id/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    missing-parameter/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    parameter-not-array/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    parameter-missing-key/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    unknown-parameter-type/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
    style-not-array/
      metadata.json
      index.js
      style.scss
      templates/
        stanza.html.hbs
```

ケース入力は、現行版観測に必要な最小数から作る。すべてを最初から実体化する必要はない。

## 現行版で観測すること

- 壊れたJSONの `metadata.json` がbuild時にどう失敗するか。
- `metadata.json` がJSON objectでない場合にどう失敗するか。
- `@id` が欠落した場合にどう失敗するか。
- `@id` がstringでない場合にどう失敗するか。
- `metadata["@id"]` とstanzaディレクトリ名が異なる場合に、build生成物やランタイムがどう振る舞うか。
- `togostanza-{id}` がvalid custom element名にならない `@id` の場合にどう失敗するか。
- `stanza:parameter` が欠落した場合に、build時、ヘルプページ生成時、ランタイム時のどこで失敗するか。
- `stanza:parameter` が配列でない場合に、どこで失敗するか。
- parameter項目の `stanza:key` が欠落した場合に、buildまたはランタイムがどう振る舞うか。
- `stanza:type` が未知値の場合に、string相当として扱われるか。
- `stanza:style` が欠落した場合に、buildまたはランタイムがどう振る舞うか。
- `stanza:style` が配列でない場合に、どこで失敗するか。

## リメイク版で観測すること

- 現行版で通ったmetadata異常系を、リメイク版独自の厳格化で失敗させていないこと。
- 現行版で失敗したmetadata異常系は、リメイク版でも失敗してよいこと。
- リメイク版で失敗する場合、可能な範囲で `metadata.json` のpathやstanza IDが診断に含まれること。
- valid JSON object、`@id` string、`@id` 不一致、valid custom element名の最小validationは、既に仕様判断済みの想定外入力として分かりやすく失敗すること。
- `stanza:type` 未知値など、現行版が許容する挙動はリメイク版でも壊さないこと。

## 合格条件

- 現行版観測結果とリメイク版観測結果がREADMEに分けて記録されている。
- リメイク版が現行版より広いmetadata schemaを要求する場合は、理由と人間判断が記録されている。
- リメイク版が現行版より緩くする場合は、影響範囲が記録されている。
- valid JSON object、`@id` string、`@id` 不一致、valid custom element名のように既にリメイク版仕様で決めたものは、その仕様に従っている。
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
