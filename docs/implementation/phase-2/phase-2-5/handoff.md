# Phase 2-5: inter-stanza coordination 引き継ぎ

この文書では、Phase 2-5完了後にPhase 2-6以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-5の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` をcustom elementとして登録するようにした。
- 連携用custom elementは、複数のStanza bundleから同じページで読み込まれても重複登録で例外にならないようにした。
- `togostanza--container` をStanza間連携のスコープとして使えるようにした。
- container内の送信側Stanza hostへevent listenerを張るchild-listener方式を採用した。
- `this.element.dispatchEvent(new CustomEvent(...))` のような非bubbling eventを、既存Stanza sourceを変更せずに捕捉できるようにした。
- `stanza:outgoingEvent` を送信側eventのallow listとして使うようにした。
- `stanza:incomingEvent` を受信側eventのallow listとして使うようにした。
- metadataに列挙されていないeventは、`handleEvent()` とevent-mapの対象にしないようにした。
- 受信側Stanza instanceの `handleEvent(event)` を呼び、元の `event.type` と `event.detail` を観測できるようにした。
- Stanza base APIとして置いた `handleEvent()` の実連携をPhase 2-5で成立させた。
- `togostanza--event-map` の `on`、`receiver`、`value-path`、`target-attribute` を扱うようにした。
- `value-path` は `event.detail` 起点の単純なドット区切りpathとして実装した。
- event-mapが受信側Stanza属性を更新し、Phase 2-3の `this.params` 更新、`handleAttributeChange()`、再描画へつながることを確認した。
- `target-attribute` は受信側metadataの `stanza:parameter` に列挙されたkeyであることを要求するようにした。
- 未宣言の `target-attribute` はwarningを出してskipするようにした。
- `togostanza--data-source` の `url`、`receiver`、`target-attribute` を扱うようにした。
- data-sourceの `url` はdocument base基準で解決するようにした。
- data-sourceがJSONをfetchし、blob URLにして受信側属性へ渡す経路を成立させた。
- `togostanza--data-container` は登録しないようにした。
- containerが子Stanzaのupgradeを待つ処理に上限を設け、壊れたStanzaが1つあっても無制限pollingや全連携停止にならないようにした。
- upgrade待ち上限後は、upgrade済みのStanzaだけでgraceful degradeして配線するようにした。
- 006ケースREADMEに、Phase 2-5で確認したリメイク版のStanza間連携観測結果を記録した。
- browser testで、複数Stanza bundleの同時読み込み、重複登録回避、event-map、data-source、`handleEvent()`、metadata gate、壊れたStanzaがある場合の部分配線を確認した。

## 意図的に残したこと

- `togostanza--data-container` の互換。
- containerをまたぐイベント連携。
- Shadow DOM内部から送出されたeventの自動拾い上げ。
- `sender` selectorの正式API化。
- 複数sender、複数receiver、複数event-map競合時の詳細優先順。
- event-mapのreceiver複数一致時の網羅的な配信。
- `value-path` の配列index、escape、fallback、型変換。
- event payload schema validation。
- event-mapでの非属性targetや関数呼び出し。
- data-sourceのPOST、headers、認証、polling、streaming、retry、timeout、abort。
- data-sourceのJSON以外の入力。
- data-sourceが生成するblob URLのcache戦略。
- data-sourceのURL変更時やdisconnect時の完全なblob URL revoke。
- data-sourceのerror event、status属性、表示用error state。
- `handleEvent()` のasync error handling。
- upgrade前eventのqueue。
- container connect後に動的追加されたStanza、event-map、data-sourceの再配線。
- coordination listenerの `removeEventListener()` による完全な後始末。
- `serve` のwatchや差分invalidate。
- `togostanza-utils`、React、Vue固有の互換。
- GitHub Pages workflow置き換え。

## Phase 2-6で使う前提

- `build` は、Stanza間連携を含むstatic `dist/` 生成物を作れる。
- 複数のStanza bundleを同じHTMLで読み込んでも、連携用custom elementの重複登録例外は起きない。
- 006ケース相当のHTMLは、追加のserver-side処理なしでstatic hosting上で動かせる。
- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` は、生成HTMLまたは利用者HTMLに書かれるruntime要素として扱える。
- Stanza sourceは、`this.element.dispatchEvent(new CustomEvent(...))` でeventを送出できる。
- `bubbles: true` や `composed: true` は、Phase 2-5のStanza間連携では必須条件ではない。
- event連携はmetadata gateを通る。送信側は `stanza:outgoingEvent`、受信側は `stanza:incomingEvent` にevent keyを持つ必要がある。
- event-map / data-sourceの `target-attribute` は、受信側 `stanza:parameter` のkeyである必要がある。
- data-sourceの `url` はdocument base基準であり、module URL基準のasset解決とは別物である。
- runtime初期化は `{id}/metadata.json` fetchに依存しない。
- 生成物のCSS、JS asset、package assetのサブパス安全性はPhase 2-4の前提を維持している。
- `test:browser` を単独実行する場合、bin entryが `dist/` を参照するため、直前のruntime変更を反映するには先に `cd package && mise exec -- pnpm run build` を実行する。通常の完了前確認は `check-all` を使えばbuildが先に走る。

## Phase 2-6で注意すること

- Phase 2-6のGitHub Pages workflowは、`dist/` をそのままstatic artifactとしてdeployすればよい。Stanza間連携のために特別なserver処理は必要ない。
- workflowで006相当の生成物を確認する場合は、sender / receiverの2本以上のmodule scriptを同一ページで読み込むfixtureを使うとよい。
- containerのupgrade待ちは上限付きである。bundleが404になるStanzaがあっても、upgrade済みStanzaの連携は動く。一方で、上限後に遅れてupgradeしたStanzaはPhase 2-5時点では自動再配線しない。
- data-sourceはdocument base基準でURLを解決する。GitHub Pages上のサブパス配信では、HTMLから見た相対URLとしてdata fileを配置する。
- data-sourceのblob URLはPhase 2-5の最小互換であり、長期APIとして最終判断していない。
- warning文言はPhase 2-5の外部互換契約ではない。後続で診断体系を整理してよい。
- browser testでローカルHTTP serverを追加する場合は、Phase 2-4と同様にkeep-alive接続が残らないよう後始末する。

## 後続判断として残すこと

- `sender` selectorをevent-mapの正式APIとして導入するかどうか。
- 複数receiver、複数event-map、競合更新の優先順。
- `value-path` の配列index、escape、fallback、型変換。
- `target-attribute` 以外の受け渡し方法。
- data-sourceのblob URL handoffを長期APIとして維持するかどうか。
- data-sourceの直接JSON受け渡しAPI。
- data-sourceのcache、revoke、retry、timeout、abort。
- data-sourceのheaders、method、認証。
- data-sourceのerror eventまたはstatus属性。
- `handleEvent()` のasync error handling。
- upgrade前eventのqueue。
- container connect後の動的追加Stanza、event-map、data-sourceの再配線。
- coordination listenerのdisconnect時後始末。
- containerをまたぐ連携。
- `serve` でのHTML変更、data-source URL変更、Stanza source変更のwatch。
- `togostanza-utils`、React、Vue固有の互換。
- GitHub Pages workflow置き換え。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは61件、integration testは17件、browser testは6件が通った。

## 関連commit

- `89e2235 docs: add phase 2-5 coordination plan`
- `a8da1a6 docs: refine phase 2-5 event coordination plan`
- `b5ada92 docs: clarify phase 2-5 runtime registration`
- `5cf9597 feat: support phase 2-5 inter-stanza coordination`
- `fe15e52 fix: degrade container coordination when stanza upgrade fails`
