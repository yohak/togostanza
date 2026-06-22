# 006 Inter stanza coordination

## 目的

Stanza 間連携の入口を確認し、維持するものと再設計するものを分けて観測する。

## 対応する方針

- `togostanza--container` は Stanza 間連携の入口として維持する。
- `togostanza--event-map` は概念を維持するが、現行の詳細挙動は再設計候補。
- `togostanza--data-source` は外部データを Stanza に渡す目的を維持するが、API詳細は再設計候補。
- `togostanza--data-container` は旧ドキュメント内の誤記として破棄する。

## 入力条件

- sender / receiver の複数 stanza を含むHTMLを用意する。
- outgoing event と receiver attribute 更新を観測できるようにする。
- data source から receiver へデータが渡るケースを用意する。

## fixture 構造

`current/` には、現行版の Stanza 間連携を観測するための最小プロジェクトを置く。

```text
current/
  fixtures/
    inter-stanza.html
    sample-data.json
  stanzas/
    coordination-sender/
    coordination-receiver/
```

- `coordination-sender` は `value` parameter を受け取り、ボタン押下時に `selectedValue` event を dispatch する。payload は `detail.payload.label` で観測する。
- `coordination-receiver` は `selected-label` と `data-url` attributes を Stanza parameters として読み、受け取った値と `data-url` から取得した JSON の先頭 item label を表示する。
- `fixtures/inter-stanza.html` は `togostanza--container` 内に sender / receiver / `togostanza--event-map` / `togostanza--data-source` を並べた最小HTML。`togostanza--event-map` は `selectedValue` の `payload.label` を receiver の `selected-label` に渡す。`togostanza--data-source` は `sample-data.json` を読み、receiver の `data-url` に渡す。
- `fixtures/sample-data.json` は `togostanza--data-source` から receiver へ渡る外部データの最小サンプル。receiver はこの JSON の `items[0].label` を表示する。

## 実行予定コマンド

現行版の観測では、必要になった時点で `current/` で次を実行する予定。

```sh
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

build 後は `current/fixtures/inter-stanza.html` を browser で開き、sender のボタン押下後に receiver の `selected-label` が更新されることと、`data-url` 経由で `sample-data.json` の label が表示されることを確認する。

## 現行版で観測すること

- `togostanza--container` が関連携の入口として動くこと。
- `togostanza--event-map` が container 内の同名 outgoing event を拾うこと。
- event-map が送信元 selector を持たないこと。
- `togostanza--data-source` が `url` / `receiver` / `target-attribute` を使うこと。
- blob URL 経由の data handoff。
- `togostanza--data-container` が custom element として実装されていないこと。

### 現行版観測状況

- `current/` の fixture は作成済み。
- `npm install` は未実行。
- `mise exec -- npx togostanza build --output-path dist` は未実行。
- browser での `fixtures/inter-stanza.html` 確認は未実行。
- そのため、上記の現行版挙動はまだ実測ではなく、fixture が観測する予定の内容として記録している。

## リメイク版で観測すること

- `togostanza--container` の目的が維持されること。
- event-map / data-source を再設計する場合、現行HTMLとの差分、移行メモ、修正手順があること。
- `togostanza--data-container` を持ち込まないこと。

## 合格条件

- Stanza 間連携の入口が確認できる。
- 再設計対象は、目的、影響範囲、移行方法が記録されている。
- 破棄対象は、持ち込まれないことと根拠が確認できる。

## 記録する差分

- HTML snippet。
- event name、receiver selector、target attribute。
- data handoff の path または URL。
- 再設計する場合の新旧対応表。

## 未決定事項

- event-map の新しい送信元指定方法。
- data-source の新しい API。
- blob URL 経由を維持するかどうか。
