# current

現行版のStanza間連携を観測するためのケース入力プロジェクト。

このプロジェクトでは、構成を意図的に小さく保つ。

- `coordination-sender` は `selectedValue` をdispatchする。
- `coordination-receiver` は attributes経由で受け取った値を表示する。
- `fixtures/inter-stanza.html` は、両方の stanzaを `togostanza--container` 内に埋め込む。

## ケース入力と観測補助の構造

- `stanzas/coordination-sender/` はoutgoing event dispatchを観測する。template内のボタンは、`detail.payload.label` を持つ `selectedValue` をdispatchする。
- `stanzas/coordination-receiver/` は attributes経由で割り当てられた値を観測する。`selected-label`、`data-url`、`data-url` から取得した最初の labelを描画する。
- `fixtures/inter-stanza.html` は、`togostanza--container`、`togostanza--event-map`、`togostanza--data-source` を使って観測補助を接続する。
- `fixtures/sample-data.json` は、`togostanza--data-source` 経由で読み込む最小の外部データ。

## Coordination elements

- `togostanza--container` は、子 stanzaを連携させる現行版の入口。
- `togostanza--event-map` は `selectedValue` を listenし、`value-path` 経由で `payload.label` を読み、receiverの `selected-label` attributeへ割り当てる。
- `togostanza--data-source` は `fixtures/sample-data.json` を読み、生成された data URLを receiverの `data-url` attributeへ割り当てる。
- `togostanza--data-container` は、この観測補助には意図的に含めない。この検証ケースでは、維持すべき現行custom elementではなく、旧ドキュメントの誤記として扱う。

## Planned commands

現行版の観測が必要な場合は、このディレクトリから実行する。

```sh
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

build後、ブラウザで `fixtures/inter-stanza.html` を開き、receiverがevent-map後の `selected-label` とdata-sourceのlabelを反映することを確認する。

## Current observation status

- `npm install`: 未実行。
- `mise exec -- npx togostanza build --output-path dist`: 未実行。
- ブラウザ確認: 未実行。
