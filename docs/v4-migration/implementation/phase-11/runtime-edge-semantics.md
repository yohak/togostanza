# Phase 11 runtime edge semantics

この文書は、Phase 11-4で確認したStanza runtime edge semanticsの集約索引である。観測ケースREADMEはログの置き場、仕様文書は外部契約の正本として扱う。この文書では、現行版根拠、リメイク版の状態、仕様へ戻すかどうかを一覧できるようにする。

## 現行版根拠

- 対象: `references/togostanza`
- commit: `2e5982d`
- 主な参照ファイル:
  - `references/togostanza/stanza.ts`
  - `references/togostanza/src/stanza-element.mjs`
  - `references/togostanza/src/elements/togostanza--menu.mjs`

現行版観測は、まずソース読解を正とする。browser/runtime相互作用がソースだけで確定できない場合だけ、現行版running観測を追加する。

## 結果

| item | 現行版で読めた挙動 | リメイク版の扱い | 分類 |
| ---- | ---- | ---- | ---- |
| boolean parameter | 属性の有無で `true` / `false` になる。`flag="false"` も `true`。 | 維持済み。 | 仕様固定済み |
| boolean以外の未指定parameter | `this.params` にkeyが入り、値は `null`。 | Phase 11-4で `null` に寄せた。 | 互換修正 |
| number parameter | `Number(value)`。invalid値は `NaN`。 | 維持済み。 | 仕様固定候補 |
| date / datetime parameter | `new Date(value)`。invalid値はInvalid Date。 | 維持済み。 | 仕様固定候補 |
| json parameter | `JSON.parse(value)`。invalid JSONは例外。 | Phase 11-4で例外に寄せた。 | 互換修正 |
| `renderTemplate()` | 対象要素の `innerHTML` を置換する。対象がない場合は何もしない。template欠落は例外。 | 置換は維持済み。対象なしはリメイク版では例外。 | 部分差分あり |
| `handleAttributeChange()` | 既定では50ms debounce後に `render()` を呼ぶ。 | Phase 11-4で50ms debounceへ寄せた。 | 互換修正 |
| async `render()` 再入制御 | 明示的な再入制御はない。 | 明示的な再入制御はない。 | 固定しない |
| `render()` 例外 | ソース上、runtime側で明示的に吸収しない。 | リメイク版はconsole errorとして報告し、runtime全体の停止を避ける。 | 意図的差分 |
| `importWebFontCSS()` | `document.head` とShadow DOMの両方へlinkを追加する。重複抑止はない。 | Phase 11-4でhead + Shadow DOMへ寄せた。重複抑止はしない。 | 互換修正 |
| `query()` method | `method || "POST"`。 | 維持済み。 | 仕様固定済み |
| `query()` request | `Content-Type: application/x-www-form-urlencoded`、`Accept: application/sparql-results+json`、bodyに `query`。 | Phase 11-4でContent-Typeを明示した。AcceptはJSON許容を残す。 | 部分互換 |
| `menu()` item / divider | `item` はmenu内のリンク、`divider` は区切りとして描画される。handlerはclickで呼ばれ、menuを閉じる。 | item / divider / handlerは維持済み。DOM構造と見た目は固定しない。 | API互換、DOM非固定 |
| menu placement | 現行版は `togostanza-menu_placement` を監視する。 | リメイク版は仕様判断済みで `togostanza-menu-placement` を正式属性にする。underscore版は正式属性にしない。 | 意図的差分 |
| `stanza:style` | CSS custom property既定値としてShadow DOMへ入る。`this.params` には入らない。 | 維持済み。 | 仕様固定済み |
| `stanza:parameter` 欠落 / 非配列 | 現行版は `.map` を呼ぶため、custom element定義またはparams評価で失敗する。 | リメイク版は空配列相当として扱う。 | 意図的差分 |
| parameter項目の `stanza:key` 欠落 | 現行版は `undefined` keyとして扱われ得る。 | リメイク版はkey/typeがstringでない項目を無視する。 | 意図的差分 |
| 未知の `stanza:type` | defaultでstringとして扱う。 | 維持済み。 | 仕様固定済み |
| `stanza:style` 欠落 | 現行版はCSS defaultなしで通る。 | 維持済み。 | 仕様固定済み |
| `stanza:style` 非配列 | 現行版は `.map` を呼ぶため失敗する。 | リメイク版はstyle defaultなしで通る。 | 意図的差分 |

## 仕様へ戻すもの

すでに `docs/v4-migration/spec/index.md` に入っているもの:

- boolean parameterは属性有無で判定する。
- `number`、`json`、`date`、`datetime`、`single-choice`、`text` の基本変換。
- `stanza:style` はCSS custom property既定値であり、`this.params` には入れない。
- `this.query()` の既定methodは `POST`。
- `this.renderTemplate()` は対象を置換する。
- menu DOM構造や見た目は固定しない。
- `importWebFontCSS()` の重複制御詳細は固定しない。

Phase 11-4で追加確認したが、現時点では仕様文書へ細かく固定しないもの:

- invalid `number` / `date` / `datetime` の具体値。
- `render()` 例外時のUIとconsole報告。
- `handleAttributeChange()` の50ms debounceという時間値。
- `importWebFontCSS()` が `document.head` にもlinkを置く内部詳細。
- menuの内部DOM、keyboard interaction、Copy HTML snippet相当のUI。

## 後続判断

- `renderTemplate()` の対象selectorが見つからない場合、現行版は何もしないが、リメイク版は例外にしている。既存実プロジェクトで問題は出ていないためPhase 11では修正しない。実プロジェクトで発火した場合に互換修正を検討する。
- `render()` 例外を現行版同様に未捕捉へ戻すことはしない。リメイク版の診断改善として扱う。ただし、CLI / browser上のstatus message整理はPhase 12のCLI status / result messagesへ送る。
- menuのリッチなUI、keyboard interaction、Copy HTML snippet相当の導線は、本開発では不要だが後続優先度は中から高寄りとする。ヘルププレビュー改善と近い領域で扱う。
- `stanza:parameter` / `stanza:style` の異常形は、現行版が落ちる場合でもリメイク版では許容する箇所がある。これは広範なschema validationを本開発で追加しない方針と整合するため、Phase 11では修正しない。
