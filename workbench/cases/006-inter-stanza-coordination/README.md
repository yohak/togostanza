# 006 Inter stanza coordination

## 目的

Stanza間連携の入口を確認し、維持するものと再設計するものを分けて観測する。

## 対応する方針

- `togostanza--container` は Stanza間連携の入口として維持する。
- `togostanza--event-map` は概念を維持するが、現行の詳細挙動は再設計候補。
- `togostanza--data-source` は外部データをStanzaに渡す目的を維持するが、API詳細は再設計候補。
- `togostanza--data-container` は旧ドキュメント内の誤記として破棄する。

## 入力条件

- sender/receiverの複数stanzaを含むHTMLを用意する。
- outgoing eventとreceiver attribute更新を観測できるようにする。
- outgoing eventとreceiver `handleEvent()` 呼び出しを観測できるようにする。
- data sourceからreceiverへデータが渡るケースを用意する。

## ケース入力と観測補助

`current-pnpm/` はpnpmで現行版を確認する検証環境として用意する。
`generated-repo/` には、現行版のStanza間連携を観測するための最小プロジェクトを置く。

```text
current-pnpm/
  mise.toml
  generated-repo/
    package.json
    pnpm-lock.yaml
    fixtures/
      inter-stanza.html
      sample-data.json
    stanzas/
      coordination-sender/
      coordination-receiver/
```

- `coordination-sender` は `value` parameterを受け取り、ボタン押下時に `selectedValue` eventをdispatchする。payloadは `detail.payload.label` で観測する。
- `coordination-receiver` は `selected-label` と `data-url` attributesをStanza parametersとして読み、受け取った値と `data-url` から取得したJSONの先頭item labelを表示する。
- `coordination-receiver` は現行runtimeの `stanza:incomingEvent` 経路で呼ばれる `handleEvent()` を最小実装し、最後に受け取った `event.type` と `event.detail` を表示する。
- `fixtures/inter-stanza.html` は `togostanza--container` 内にsender/receiver/`togostanza--event-map`/`togostanza--data-source` を並べた最小HTML。`togostanza--event-map` は `selectedValue` の `payload.label` をreceiverの `selected-label` に渡す。`togostanza--data-source` は `sample-data.json` を読み、receiverの `data-url` に渡す。
- `fixtures/sample-data.json` は `togostanza--data-source` からreceiverへ渡る外部データの最小サンプル。receiverはこのJSONの `items[0].label` を表示する。

## 実行コマンド

現行版の確認は `current-pnpm/generated-repo/` で行う。

```sh
cd workbench/cases/006-inter-stanza-coordination/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza build --output-path dist
```

build後は観測補助用package scriptで `fixtures/inter-stanza.html` を配信し、browserで開く。
senderのボタン押下後にreceiverの `selected-label` が更新されることと、`data-url` 経由で `sample-data.json` のlabelが表示されることを確認する。

```sh
mise exec -- pnpm run serve:fixture
```

## 現行版で観測すること

- `togostanza--container` がStanza間連携の入口として動くこと。
- `togostanza--event-map` がcontainer内の同名outgoing eventを拾うこと。
- event-mapが送信元selectorを持たないこと。
- `togostanza--data-source` が `url` / `receiver` / `target-attribute` を使うこと。
- blob URL経由のdata handoff。
- `togostanza--data-container` がcustom elementとして実装されていないこと。
- Sending Eventsは `this.element.dispatchEvent(new CustomEvent(...))` と `stanza:outgoingEvent` を入口として観測する。
- `togostanza--container` が `stanza:incomingEvent` を見てreceiverの `handleEvent()` を呼ぶこと。

### 現行版観測状況

確認済み。

- 確認日: 2026-06-22
- 作業ディレクトリ: `workbench/cases/006-inter-stanza-coordination/current-pnpm/generated-repo/`
- Node.js: `v18.20.4`
- pnpm: `9.15.9`
- `togostanza`: `3.0.0-beta.57`
- 確認URL: `http://127.0.0.1:4176/fixtures/inter-stanza.html`

### 実行したコマンド

```sh
cd workbench/cases/006-inter-stanza-coordination/current-pnpm/generated-repo
mise trust ../mise.toml
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install
mise exec -- pnpm exec togostanza --version
mise exec -- pnpm exec togostanza build --output-path dist
mise exec -- pnpm run serve:fixture
```

`mise.toml` は `current-pnpm/` に置き、Node.jsの18系とpnpmの9系を固定している。

`mise trust`、`install`、`build`、ローカルHTTPサーバーは、Codex sandboxの権限制約、network制限、またはwatcher制限を避けるため、承認済みの通常コマンド実行で行った。

### build結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build時にSass deprecation warningが多数出た。
- `dist/` には `coordination-sender.js`、`coordination-sender.css`、`coordination-receiver.js`、`coordination-receiver.css`、各stanzaの `metadata.json`、`index.html`、`-togostanza/*` が生成された。

### ブラウザ観測結果

- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` は観測補助HTMLのDOM上に存在した。
- `togostanza--data-container` は観測補助HTMLのDOM上に存在しない。
- sender/receiverにはopen shadow rootが作られた。
- 初期状態ではreceiverの `selected-label` attributeは未設定で、表示値は `(none)`。
- `togostanza--data-source` は `sample-data.json` をblob URLとしてreceiverの `data-url` attributeに渡した。
- receiverは `data-url` からJSONを取得し、`items[0].label` の `from-data-source` を表示した。
- senderの `Send from-sender` ボタンを押すと、receiverの `selected-label` attributeが `from-sender` に更新され、表示値も `from-sender` になった。
- `togostanza--event-map` は送信元selectorを持たず、container内の `selectedValue` eventを拾った。
- senderの `Send from-sender` ボタンを押すと、receiverの `handleEvent()` が呼ばれた。
- `handled-event-type` には `selectedValue`、`handled-event-detail` には `{"payload":{"label":"from-sender"}}` が表示された。
- 同じeventで `togostanza--event-map` も動き、receiverの `selected-label` attributeと表示値が `from-sender` になった。

## リメイク版で観測すること

- `togostanza--container` の目的が維持されること。
- event-map/data-sourceを再設計する場合、現行HTMLとの差分、移行メモ、修正手順があること。
- Sending Eventsを再設計する場合、`stanza:outgoingEvent` / `stanza:incomingEvent` との対応、`event.detail` の扱い、`value-path` の扱いが説明できること。
- `togostanza--data-container` を持ち込まないこと。

## 合格条件

- Stanza間連携の入口が確認できる。
- Stanza sourceから外向き `CustomEvent` を発火できる。
- `event-map` と `handleEvent()` の両経路で、metadataに列挙されたeventだけが扱われることを説明できる。
- 再設計対象は、目的、影響範囲、移行方法が記録されている。
- 破棄対象は、持ち込まれないことと根拠が確認できる。

## 記録する差分

- HTML snippet。
- event name、receiver selector、target attribute。
- `stanza:outgoingEvent` / `stanza:incomingEvent`。
- `handleEvent()` に渡る `event.type` と `event.detail`。
- data handoffのpathまたはURL。
- 再設計する場合の新旧対応表。

## 未決定事項

- event-mapの新しい送信元指定方法。
- data-sourceの新しいAPI。
- blob URL経由を維持するかどうか。
