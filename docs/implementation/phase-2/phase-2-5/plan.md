# Phase 2-5: inter-stanza coordination 設計

Phase 2-5は、Phase 2-4までに成立したビルド生成物とランタイムAPIの上に、Stanza間連携を載せるサブフェーズである。

このサブフェーズでは、`togostanza--container`、送出 `CustomEvent`、`stanza:incomingEvent` / `stanza:outgoingEvent`、`handleEvent()`、`togostanza--event-map`、`togostanza--data-source` を扱う。`togostanza--data-container` は旧ドキュメント内の誤記として扱い、実装対象に含めない。

## 目的

- 006ケースで観測しているStanza間連携を、リメイク版の生成物で確認できるようにする。
- `togostanza--container` をStanza間連携のスコープとして維持する。
- Stanza sourceから `this.element.dispatchEvent(new CustomEvent(...))` で送出したイベントを、同じcontainer内で扱えるようにする。
- `stanza:outgoingEvent` と `stanza:incomingEvent` を、イベント連携のメタデータゲートとして使う。
- 受信側Stanzaの `handleEvent(event)` を、metadataに列挙されたincoming eventに対して呼び出せるようにする。
- `togostanza--event-map` と `togostanza--data-source` は目的を維持しつつ、Phase 2-5で扱う最小APIと後続へ送る細部を分ける。
- 006ケースREADMEに、現行版との差分、リメイク版で確認した挙動、移行メモを記録する。

## 完了条件

- `togostanza build` / `togostanza b` が、006ケース相当のStanzaリポジトリをビルドできる。
- `togostanza--container` がcustom elementとして登録され、同じcontainer内の連携スコープを作る。
- 送信側Stanzaから送出した `CustomEvent` が、containerに到達する条件を説明できる。
- `stanza:outgoingEvent` に列挙されていないイベントは、Phase 2-5のcontainer連携で扱わない。
- 受信側の `stanza:incomingEvent` に列挙されたイベントだけが、`handleEvent(event)` 呼び出し対象になる。
- `handleEvent(event)` には、元の `CustomEvent` と同じ `event.type` と `event.detail` を観測できる形で渡す。
- `togostanza--event-map` が、metadataで許可されたイベントから値を取り出し、同じcontainer内の受信側Stanza属性へ反映する。
- `togostanza--event-map` の `value-path` は、`event.detail` を起点にしたドット区切りpathとして扱う。
- `togostanza--event-map` による属性更新が、Phase 2-3の `this.params` 更新、`handleAttributeChange()`、再描画につながる。
- `togostanza--data-source` が外部JSONを取得し、同じcontainer内の受信側Stanza属性へ渡す。
- Phase 2-5では、`togostanza--data-source` は現行観測に合わせてblob URL handoffを維持する。
- `togostanza--data-container` をcustom elementとして登録しない。
- 006ケースREADMEに、実行したリメイク版コマンド、生成物、browser観測、現行版との差分、後続へ送る事項を記録する。

## 含めるもの

- `togostanza--container` custom element。
- container内イベントの監視。
- `stanza:outgoingEvent` の最小解釈。
- `stanza:incomingEvent` の最小解釈。
- 受信側Stanza instanceへの `handleEvent(event)` 呼び出し。
- `togostanza--event-map` の最小実装。
- `togostanza--data-source` の最小実装。
- event-map / data-sourceのreceiver selector解決。
- event-map / data-sourceのtarget attribute更新。
- value pathの最小解決。
- 006ケースのリメイク版観測更新。

## 含めないもの

- `togostanza--data-container`。
- containerをまたぐイベント連携。
- Shadow DOM内部からの自動イベント拾い上げ。
- `sender` selectorの正式API化。
- 複数sender / 複数receiver / 複数event-map競合時の詳細優先順。
- `value-path` の配列index、escape、fallback、型変換の高度な仕様。
- event payload schema validation。
- event-mapでの非属性targetや関数呼び出し。
- data-sourceのPOST、headers、認証、polling、streaming、retry、timeout、abort。
- data-sourceのJSON以外の入力。
- data-sourceが生成するblob URLの長期cache戦略。
- data-sourceのURL変更時やdisconnect時の完全なblob URL revoke。
- `serve` のwatchや差分invalidate。
- `togostanza-utils`、React、Vue固有の互換。
- GitHub Pages workflow置き換え。

## 実装順

### 2-5a container / metadata-gated events

2-5aでは、containerとmetadata-gated event dispatchを先に成立させる。

対象:

- `togostanza--container` のcustom element登録。
- container内での `CustomEvent` 監視。
- 送信側custom elementに紐づくmetadataから `stanza:outgoingEvent` を読む。
- 受信側custom elementに紐づくmetadataから `stanza:incomingEvent` を読む。
- incoming eventが一致する受信側Stanza instanceへ `handleEvent(event)` を呼ぶ。
- metadataに列挙されていないイベントを無視する。

現行fixtureの送信側は `this.element.dispatchEvent(new CustomEvent("selectedValue", { detail }))` を使っている。標準DOMでは、これだけではイベントがbubbleしない。Phase 2-5のリメイク版観測では、送信側Stanza sourceを `bubbles: true`、必要なら `composed: true` を付けて送出する形へ寄せる。

これは仕様の入口を `CustomEvent` に置く判断と整合する。containerが任意の非bubbling eventを横取りするような特殊挙動は作らない。移行メモには、Stanza間連携でcontainerへイベントを届けるにはbubbling eventとして送出することを残す。

### 2-5b event-map

2-5bでは、`togostanza--event-map` を最小実装する。

Phase 2-5で扱う属性は次の範囲にする。

- `on`: 監視するイベント名。
- `receiver`: 同じcontainer内の受信側custom elementを指すCSS selector。
- `value-path`: `event.detail` を起点に値を取り出すドット区切りpath。
- `target-attribute`: 受信側custom elementへ設定する属性名。

現行版ではevent-mapが送信元selectorを持たず、container内の同名イベントを拾う。Phase 2-5でも、`sender` selectorは正式APIとして固定しない。代わりに、送信側のmetadataに `stanza:outgoingEvent` があり、受信側のmetadataに `stanza:incomingEvent` があることを最小の安全境界にする。

`receiver` はcontainerの子孫に限定する。container外の要素へ属性を書き込まない。

`value-path` は `payload.label` のような単純なドット区切りだけを扱う。pathが存在しない場合、Phase 2-5では属性を更新せずwarningを出す候補にする。warning文言の細部は互換対象にしない。

event-mapによる属性更新は、受信側custom elementの通常の属性変更として扱う。Phase 2-3で成立した `this.params`、`handleAttributeChange()`、再描画の経路に乗せる。

### 2-5c data-source

2-5cでは、`togostanza--data-source` を最小実装する。

Phase 2-5で扱う属性は次の範囲にする。

- `url`: 取得する外部JSONのURL。
- `receiver`: 同じcontainer内の受信側custom elementを指すCSS selector。
- `target-attribute`: 受信側custom elementへ設定する属性名。

`url` は、HTML documentのURLを基準に解決する。これは `fixtures/inter-stanza.html` から `./sample-data.json` を参照する現行観測に合わせた判断である。生成bundleやmodule URL基準のasset解決とは別物として扱う。

Phase 2-5では、data-sourceが取得したJSONをblob URLに変換し、そのblob URLを `target-attribute` へ設定する。受信側Stanzaは `this.params["data-url"]` からblob URLを取得し、自分で `fetch()` できる。

blob URL handoffは現行観測に近く、006ケースを小さく通しやすい。一方で、長期的なAPIとして最善かどうかはPhase 2-5では固定しない。直接JSONを渡すAPI、属性名の再設計、cache、revoke、error stateは後続判断へ送る。

### 2-5d verification / case update

2-5dでは、006ケースのリメイク版観測を記録する。

対象:

- リメイク版で実行したコマンド。
- `dist/` tree。
- fixture HTML。
- 送信側の `CustomEvent` 送出コード。
- `stanza:outgoingEvent` / `stanza:incomingEvent` の対応。
- `handleEvent(event)` に渡る `event.type` と `event.detail`。
- event-mapによる属性更新と表示更新。
- data-sourceによるblob URL handoffと表示更新。
- `togostanza--data-container` を持ち込まなかったこと。
- 現行版との差分と移行メモ。

## metadata方針

`stanza:outgoingEvent` と `stanza:incomingEvent` は、Phase 2-5ではイベント名のallow listとして扱う。

metadataの各要素では、`stanza:key` をイベント名として読む。descriptionなどの周辺フィールドは、Phase 2-5の実行時判断には使わない。

送信側custom elementから送出されたイベントは、送信側metadataの `stanza:outgoingEvent` に同じ `stanza:key` がある場合だけ、container連携の対象にする。

受信側custom elementは、受信側metadataの `stanza:incomingEvent` に同じ `stanza:key` がある場合だけ、`handleEvent(event)` 呼び出しとevent-mapによる属性更新の対象になる。

metadataが無い要素、TogoStanza custom elementではない要素、まだupgradeされていない要素は対象外にする。upgrade前イベントのqueueはPhase 2-5では作り込まない。

## CustomEvent方針

Stanza sourceは、送信側custom elementである `this.element` から `CustomEvent` を送出する。

Stanza間連携でcontainerへ届けたいイベントは、`bubbles: true` を付ける。Shadow DOM内から送出する場合や外側のcontainerへ届ける必要がある場合は、`composed: true` も付ける。

Phase 2-5では、containerが標準DOMイベントモデルを尊重する。非bubbling eventを特別に拾い上げる互換処理は作らない。

`handleEvent(event)` には、元のevent objectを渡す。受信側は `event.type` と `event.detail` を観測できる。

## event-map方針

`togostanza--event-map` は、event detailから属性更新へつなぐ宣言的な橋渡しとして扱う。

Phase 2-5では、現行fixtureと同じ属性名を最小互換として維持する。新しいsender selectorは導入しない。sender制限はmetadata gateとcontainer scopeで行う。

`receiver` はCSS selectorとして解釈する。複数一致した場合は、Phase 2-5では最初の一致だけを対象にする候補にする。複数receiverを正式に扱うかどうかは後続判断にする。

`target-attribute` はHTML属性名として扱う。camelCase property assignmentは行わない。

`value-path` は `event.detail` を起点にしたpathである。たとえば `value-path="payload.label"` は `event.detail.payload.label` を読む。

取得した値は文字列化して属性へ設定する。objectやarrayを直接渡す契約はPhase 2-5では固定しない。

## data-source方針

`togostanza--data-source` は、外部データを受信側Stanzaへ渡す宣言的な橋渡しとして扱う。

Phase 2-5では、現行fixtureと同じ `url` / `receiver` / `target-attribute` を最小互換として維持する。

`url` はdocument base基準で解決する。これはHTML上の宣言要素であり、Stanza bundle内assetとは責務が異なるためである。

data-sourceは `url` からJSONを取得し、取得したJSONをblob URLにして受信側属性へ設定する。受信側StanzaはそのURLを自分でfetchする。

fetch失敗時の表示、retry、ステータス属性、error eventはPhase 2-5では作り込みすぎない。browser testでは成功経路を優先し、失敗経路はunit testまたは後続判断へ回す。

## 006ケース更新方針

006ケースでは、リメイク版で次を確認する。

- `togostanza--container` がcustom elementとしてupgradeされること。
- 送信側Stanzaが `CustomEvent("selectedValue", { bubbles: true, composed: true, detail })` を送出できること。
- `coordination-sender` の `stanza:outgoingEvent` に `selectedValue` があること。
- `coordination-receiver` の `stanza:incomingEvent` に `selectedValue` があること。
- 受信側の `handleEvent(event)` が呼ばれ、`event.type` と `event.detail` がDOMで観測できること。
- `togostanza--event-map` が `payload.label` を読み、受信側の `selected-label` 属性を更新すること。
- 属性更新後に受信側の表示が `from-sender` になること。
- `togostanza--data-source` が `sample-data.json` を取得し、blob URLを受信側の `data-url` 属性へ設定すること。
- 受信側がblob URLからJSONを取得し、`from-data-source` を表示すること。
- metadataに列挙されていないイベントは `handleEvent()` とevent-mapの対象にならないこと。
- `togostanza--data-container` が不要であること。

現行fixtureの送信側コードは、`CustomEvent` に `bubbles` を付けていない。リメイク版観測では、標準DOMイベントとしてcontainerへ届けるため、fixture側の送出コードを更新する。

## 検証計画

### unit test

- metadataからincoming / outgoing event keyを取り出す。
- metadataに無いevent nameを拒否する。
- `value-path` が `event.detail` から値を取り出す。
- `value-path` が存在しない場合の挙動を確認する。
- receiver selectorがcontainer内に限定される。
- `target-attribute` が属性更新として反映される。
- data-sourceのURL解決がdocument base基準になる。
- data-sourceがJSONからblob URLを作る処理を分離できる場合は確認する。
- `togostanza--data-container` を登録しない。

### integration test

- 006相当のStanzaリポジトリで `build` が成功する。
- `{id}.js` にcontainer coordination runtimeがbundleされ、bare importが残らない。
- Phase 2-4で確認したasset / config / shared sourceの既存テストが退行しない。

### browser test

- static fixtureで `coordination-sender.js` と `coordination-receiver.js` をmodule scriptとして読み込む。
- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` を含むHTMLを読み込む。
- 初期状態で受信側の表示が未選択状態になる。
- data-source経由で `from-data-source` が表示される。
- 送信側ボタンをクリックすると、受信側の `selected-label` 属性が `from-sender` になる。
- 送信側ボタンをクリックすると、受信側表示も `from-sender` になる。
- 受信側の `handleEvent()` 観測表示に `selectedValue` と `{"payload":{"label":"from-sender"}}` 相当が出る。
- metadataに無いイベントを送出しても受信側へ届かない。
- document baseと生成物baseがずれても、既存のCSS / asset / module script解決が壊れない。

### documentation

- 006ケースREADMEにリメイク版観測結果を追記する。
- event-map / data-sourceのPhase 2-5最小APIと、後続へ送る詳細を記録する。
- 必要ならPhase 2-5完了後にhandoffを作る。

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
- upgrade前イベントのqueue。
- containerをまたぐ連携。
- `serve` でのHTML変更、data-source URL変更、Stanza source変更のwatch。

## 確認コマンド

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
