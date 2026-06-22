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
- outgoing event と receiver `handleEvent()` 呼び出しを観測できるようにする。
- data source から receiver へデータが渡るケースを用意する。

## fixture 構造

`current-pnpm/` は pnpm で現行版を確認する検証環境として用意する。
`generated-repo/` には、現行版の Stanza 間連携を観測するための最小プロジェクトを置く。

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

- `coordination-sender` は `value` parameter を受け取り、ボタン押下時に `selectedValue` event を dispatch する。payload は `detail.payload.label` で観測する。
- `coordination-receiver` は `selected-label` と `data-url` attributes を Stanza parameters として読み、受け取った値と `data-url` から取得した JSON の先頭 item label を表示する。
- `coordination-receiver` は現行 runtime の `stanza:incomingEvent` 経路で呼ばれる `handleEvent()` を最小実装し、最後に受け取った `event.type` と `event.detail` を表示する。
- `fixtures/inter-stanza.html` は `togostanza--container` 内に sender / receiver / `togostanza--event-map` / `togostanza--data-source` を並べた最小HTML。`togostanza--event-map` は `selectedValue` の `payload.label` を receiver の `selected-label` に渡す。`togostanza--data-source` は `sample-data.json` を読み、receiver の `data-url` に渡す。
- `fixtures/sample-data.json` は `togostanza--data-source` から receiver へ渡る外部データの最小サンプル。receiver はこの JSON の `items[0].label` を表示する。

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

build 後は fixture 用 package script で `fixtures/inter-stanza.html` を配信し、browser で開く。
sender のボタン押下後に receiver の `selected-label` が更新されることと、`data-url` 経由で `sample-data.json` の label が表示されることを確認する。

```sh
mise exec -- pnpm run serve:fixture
```

## 現行版で観測すること

- `togostanza--container` が関連携の入口として動くこと。
- `togostanza--event-map` が container 内の同名 outgoing event を拾うこと。
- event-map が送信元 selector を持たないこと。
- `togostanza--data-source` が `url` / `receiver` / `target-attribute` を使うこと。
- blob URL 経由の data handoff。
- `togostanza--data-container` が custom element として実装されていないこと。
- Sending Events は `this.element.dispatchEvent(new CustomEvent(...))` と `stanza:outgoingEvent` を入口として観測する。
- `togostanza--container` が `stanza:incomingEvent` を見て receiver の `handleEvent()` を呼ぶこと。

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

`mise.toml` は `current-pnpm/` に置き、Node 18 と pnpm 9 を固定している。

`mise trust`、`install`、`build`、local HTTP server は、Codex sandbox の権限制約、network 制限、または watcher 制限を避けるため、承認済みの通常コマンド実行で行った。

### build 結果

- `mise exec -- pnpm install` は成功し、`pnpm-lock.yaml` が生成された。
- `mise exec -- pnpm exec togostanza build --output-path dist` は成功した。
- build 時に Sass deprecation warning が多数出た。
- `dist/` には `coordination-sender.js`、`coordination-sender.css`、`coordination-receiver.js`、`coordination-receiver.css`、各 stanza の `metadata.json`、`index.html`、`-togostanza/*` が生成された。

### ブラウザ観測結果

- `togostanza--container`、`togostanza--event-map`、`togostanza--data-source` は fixture DOM 上に存在した。
- `togostanza--data-container` は fixture DOM 上に存在しない。
- sender / receiver には open shadow root が作られた。
- 初期状態では receiver の `selected-label` attribute は未設定で、表示値は `(none)`。
- `togostanza--data-source` は `sample-data.json` を blob URL として receiver の `data-url` attribute に渡した。
- receiver は `data-url` から JSON を取得し、`items[0].label` の `from-data-source` を表示した。
- sender の `Send from-sender` ボタンを押すと、receiver の `selected-label` attribute が `from-sender` に更新され、表示値も `from-sender` になった。
- `togostanza--event-map` は送信元 selector を持たず、container 内の `selectedValue` event を拾った。
- `handleEvent()` 表示用の `handled-event-type` / `handled-event-detail` は `dist/coordination-receiver.js` に含まれることを確認した。
- `stanza:outgoingEvent` から `handleEvent()` へ到達する browser 上の伝播結果は追加確認対象。

## リメイク版で観測すること

- `togostanza--container` の目的が維持されること。
- event-map / data-source を再設計する場合、現行HTMLとの差分、移行メモ、修正手順があること。
- Sending Events を再設計する場合、`stanza:outgoingEvent` / `stanza:incomingEvent` との対応、`event.detail` の扱い、`value-path` の扱いが説明できること。
- `togostanza--data-container` を持ち込まないこと。

## 合格条件

- Stanza 間連携の入口が確認できる。
- Stanza source から外向き `CustomEvent` を発火できる。
- `event-map` と `handleEvent()` の両経路で、metadata に列挙された event だけが扱われることを説明できる。
- 再設計対象は、目的、影響範囲、移行方法が記録されている。
- 破棄対象は、持ち込まれないことと根拠が確認できる。

## 記録する差分

- HTML snippet。
- event name、receiver selector、target attribute。
- `stanza:outgoingEvent` / `stanza:incomingEvent`。
- `handleEvent()` に渡る `event.type` と `event.detail`。
- data handoff の path または URL。
- 再設計する場合の新旧対応表。

## 未決定事項

- event-map の新しい送信元指定方法。
- data-source の新しい API。
- blob URL 経由を維持するかどうか。
