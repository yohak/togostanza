# パラメーター互換性の再確認

- 調査日: 2026-09-18
- 契機: TogoMediumへのV4 Alpha導入時のパラメーター互換性報告
- V3根拠: `references/togostanza`、`3.0.0-beta.57`、commit `2e5982d25bdebc604574908c6ebc72d0334cb000`
- V4比較元: `v4.0.0-alpha.1` の保持フィールド方式
- 検証手順・入力: [ケース004](../../../workbench/cases/004-runtime-parameters/README.md#2026-09-18-パラメーター互換性の再確認)

## 静的確認

V3の `stanza.ts` のgetterは、宣言済みパラメーターを列挙し、`attributes.getNamedItem(key)?.value` を読む。欠落属性の値は `undefined` であり、key自体は `Object.fromEntries()` に残る。Phase 11の「未指定は `null`」という記録は、このoptional chainingの読み違いだった。

V3は `number` / `json` / `date` / `datetime` を変換する前に空文字を判定するため、空文字は `undefined` になる。string、text、single-choice、未知の型は文字列をそのまま返す。空白は空文字と区別される。booleanは属性の有無で判定する。

getterは参照ごとに新しいobjectを返す。JSONやDateも参照ごとに変換される。非空の不正JSONはgetter参照時に例外になる。V4 Alphaのフィールド方式では、接続・属性変更時の先行変換により、値だけでなく参照同一性と例外時点も異なっていた。

V3の公開型は `Record<string, any>`、V4は `Record<string, unknown>` である。これは実行時の変換とは別のTypeScript開発契約の差分である。

## ブラウザ確認

V3と修正後V4に同一のChromiumテストを実行し、両方で成功した。未指定値はJSON文字列化だけでは欠落と区別できないため、own keyの存在と `undefined` の両方を確認した。

- 既存DOMアップグレードのコンストラクタでは既存属性を参照できる。新規 `createElement()` のコンストラクタでは未指定値になる。
- number/json/date/datetimeの欠落と空文字、string空文字、未宣言属性除外、boolean欠落の結果が一致した。
- 連続参照は別objectになり、JSONの深い変更も次の参照に残らない。
- 非接続中の属性更新・削除は直後の参照に反映され、接続後の更新は再描画へ反映された。
- 不正JSONを明示参照すると `SyntaxError` になる。参照しない描画は不正JSONがあっても接続・属性変更後に継続した。
- V4の描画内で不正JSONを参照した場合は既存のconsole error経路で報告され、属性修正後に描画が復帰した。

この比較はパラメーターを参照しない既定menuを使う。独自 `menu()` などがgetterを参照すれば、その呼び出し時点で例外が起きる。すべての呼び出し元の例外を描画診断へ集約する検証ではない。

TogoMediumで報告された個別の型エラー11件は、この比較では再現していない。配布型のintegration testでは、未検証値をstringへ代入すると型エラーになり、`typeof` で絞り込んだ後は使用できることを確認する。

## 修正後の検証結果

- `mise exec -- pnpm run check-all`: 成功。format、lint、type-check、build、unit 124件（ローカル互換2件skip）、integration 23件、browser 12件。
- ケース004のV3/V4比較: 2件成功。
- `git diff --check`: 成功。

初回はPlaywright用Chromium未導入でbrowser起動に失敗したため、通常の `mise exec -- pnpm exec playwright install chromium` で導入した。次の実行で既存ヘルププレビューの `null` 期待が1件残っていることを検出し、今回の未指定値契約に合わせて `undefined` へ訂正した。上記はその後の通常手順での最終結果である。

## 記録の訂正先

[Phase 11集約](../implementation/phase-11/runtime-edge-semantics.md)、[引き継ぎ](../implementation/phase-11/handoff.md)、ケース004の誤った `null` 観測を訂正した。採用判断は[リメイク方針](../spec/remake-policy.md#parameter)、利用方法は[移行ガイド](../../for-developers/guides/v3-to-v4.md#runtime-parameter-compatibility)で扱う。
