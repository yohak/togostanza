# Phase 13: リッチなヘルププレビュー計画

## ゴール

Phase 13では、`build` と `serve` で生成されるヘルプページを、Stanza開発者が実際にパラメーターやstyleを変更しながら確認できるリッチなプレビューへ戻す。

現行版のヘルププレビューは、`index.html`、`{id}.html`、`-togostanza/help-app.js`、`-togostanza/index-app.js` を生成し、VueとBootstrapを使ってパラメーター、style、イベント、About、プレビュー、HTML snippetを表示する。リメイク版では内部ファイル構造の完全互換は固定しないが、Stanza開発者が見る体験は現行版に近づける。

## 完了条件

- `togostanza build` が `index.html` と `{id}.html` を生成する。
- `index.html` から、ビルド対象の各stanzaのヘルプページへ移動できる。
- `{id}.html` で、対象stanzaのcustom elementをプレビューできる。
- `{id}.html` で、`stanza:parameter` からフォームUIを生成し、値を変更するとプレビューが更新される。
- `{id}.html` で、`stanza:style` からフォームUIを生成し、値を変更するとプレビューへ反映される。
- `{id}.html` で、現在のプレビュー状態に対応するHTML snippetを表示できる。
- `{id}.html` で、About情報とDownload JSON導線を確認できる。
- `togostanza serve` の `/` と `/{id}.html` で、`build` と同じヘルププレビューUIを確認できる。
- `serve` は従来どおり一時出力ディレクトリを使い、通常開発中の `dist/` を触らない。
- query parameterによる初期値上書きは行わない。
- 001、003、004、005、011のうち影響する検証ケースに、リメイク版の観測結果または差分を記録する。

## 採用判断

### UI実装

Vue 3でヘルププレビューを実装する。

理由:

- 現行版のヘルププレビューもVueで実装されている。
- リメイク版パッケージは、Vue SFC互換のために既に `vue` と `@vitejs/plugin-vue` をbuild runtime dependencyとして持っている。
- パラメーター、style、タブ、snippet、プレビュー更新の状態管理を、依存追加なしで扱える。

### スタイリング

Bootstrap 5のCSSを使い、Bootstrap JSは使わない。

理由:

- 現行版はBootstrapを使っており、フォーム、タブ、ボタン、テーブル、snippet表示の見た目を寄せやすい。
- Bootstrap JSはVueの状態管理と重複するため使わない。
- Tailwind CSSやChakra UIは、今回の範囲では依存と設定を増やす割に得られる利点が小さい。
- icon packageは初回では追加しない。

### 生成物構造

外部契約として固定するのは `index.html` と `{id}.html` の存在と、Stanza開発者がブラウザで確認できるヘルププレビュー体験までにする。

`-togostanza/` 配下のapp bundle名、CSS名、チャンク構造は内部生成物として扱い、現行版との完全一致は求めない。ただし、現行版の構造に近い `-togostanza/` 配置を採用すると、既存の調査記録や差分説明と照合しやすい。

## UI要件

### `index.html`

- Stanzaリポジトリ名を表示する。
- ビルド対象stanzaの一覧を表示する。
- 各stanzaのラベル、ID、定義が分かる。
- 各stanzaの `{id}.html` へ移動できる。

### `{id}.html`

- 対象stanzaのラベルと定義を表示する。
- 左側または上部に、Parameters、Styles、Events、Aboutの切り替えUIを持つ。
- 右側または下部に、プレビューとHTML snippetを表示する。
- レスポンシブに崩れず、狭い画面ではフォームとプレビューが縦に並ぶ。

### パラメーターUI

`stanza:parameter` の各要素からフォーム項目を作る。

- 初期値は `stanza:default` を優先し、無ければ `stanza:example` を使う。
- `stanza:type` が `single-choice` の場合は `select` を使う。
- `stanza:type` が `boolean` の場合はcheckboxを使う。
- `stanza:type` が `datetime` の場合は `datetime-local` inputを使う。
- `stanza:type` が `number`、`date`、`color` などHTML input typeとして使える値の場合は、そのinput typeを使う。
- `stanza:type` が `json` の場合は、初回では専用editorを作らず、現行版と同様に通常inputとして扱う。
- 不明な `stanza:type` はtext inputとして扱う。

フォーム値はcustom element属性へ反映する。`boolean` が `false` の場合は、現行版と同様に該当属性を付けない。

### style UI

`stanza:style` の各要素からフォーム項目を作る。

- 初期値は `stanza:default` を使う。
- `stanza:type` の扱いはパラメーターUIと同じにする。
- 変更された値は、プレビュー対象custom elementへCSS custom propertyとして反映する。
- 既定値のままのstyleは、HTML snippetへ含めない。

### snippet

- 現在のパラメーターとstyle変更を反映したHTML snippetを表示する。
- snippetには、対象stanzaのmodule script読み込み、style変更、custom elementタグを含める。
- Copy buttonを置くかは実装時判断とする。初回で実装しない場合は、後続改善として記録する。

### About

- メタデータの主要項目を表示する。
- `./{id}/metadata.json` へのDownload JSON導線を維持する。
- README本文の表示は、入力として安全に取得できる場合のみ扱う。READMEのMarkdown変換を入れるかどうかは実装時判断とし、初回で入れない場合は後続改善として記録する。

### Events

- `stanza:outgoingEvent` と `stanza:incomingEvent` の概要を表示する。
- イベントの送受信をプレビュー上で操作するUIは初回では作らない。

## 実装方針

### build

- ヘルププレビュー用のVue app entryを追加する。
- Viteでヘルププレビューappをbundleし、出力ディレクトリへ配置する。
- `{id}.html` は対象stanzaのmetadataと必要な初期データを渡してヘルプappを起動するHTMLにする。
- `index.html` はstanza一覧appまたは静的HTMLとして生成する。
- app bundleはGitHub Pagesのサブパス配信で壊れない相対URLを使う。
- `metadata.json` は引き続き公開配布物として出力し、ヘルププレビューappの起動時fetchへは依存しない。

### serve

- `serve` は `buildStanzaArtifacts()` が一時出力ディレクトリへ生成した `index.html` と `{id}.html` を配信する。
- `serve` 専用の最小HTML生成は段階的に減らし、buildとserveのプレビューUI差分をなくす。
- 初回ビルド失敗、再ビルド失敗、stanza別エラーのHTTP 500挙動は維持する。
- 一時出力ディレクトリを使う理由は維持する。`serve` は通常開発中の `dist/` をclearまたは上書きしない。

## テスト方針

### unit / integration

- `build` が `index.html` とヘルプapp生成物を出力すること。
- `{id}.html` がヘルプappを読み込むこと。
- 既存の「`index.html` と `-togostanza/` を生成しない」期待を更新すること。
- `serve` がbuild生成物と同じHTMLを配信すること。
- query parameter初期値上書きが無いことは、仕様として必要ならbrowser testで確認する。

### browser

- `build` 後の `{id}.html` を静的配信し、custom elementが表示されること。
- parameter UIでtext、number、boolean、single-choice、date、datetime、jsonの代表値を変更し、プレビューが更新されること。
- style UIでCSS custom propertyを変更し、プレビューに反映されること。
- HTML snippetが現在のパラメーターとstyleを反映すること。
- `serve` の `/{id}.html` でも同じUIが動くこと。
- `serve` の `/` から対象stanzaのヘルプページへ移動できること。
- CSSとapp bundleが、document baseではなく生成物基準の相対URLで解決されること。

### workbench

- 001に、生成repoの `build` / `serve` からヘルププレビューを確認できることを記録する。
- 004に、パラメーターUIと型別入力のリメイク版観測を記録する。
- 005に、snippetとsource APIを使うStanzaのプレビュー観測を記録する。
- 011に、`serve` でも同じヘルププレビューUIを確認できることを記録する。

## 含めない範囲

- query parameterによる初期値上書き。
- プレビュー状態をURLで共有する機能。
- Bootstrap JSの利用。
- Primer Octiconsなどのicon package追加。
- JSON専用editor、schema validation、整形表示。
- イベント送受信用の操作UI。
- 現行版のDOM構造、CSS class、bundle名、チャンク構造の完全一致。
- ヘルププレビュー内の自動reloadやHMR。
- menu UIのリッチ化。menu polishは近い領域だが、Phase 13では `{id}.html` 側のヘルププレビューを優先する。

## リスクと確認事項

- Bootstrap CSSを追加すると、依存と生成物サイズが増える。Phase 13では現行版に近い開発体験を優先する。
- Vue app bundleが全stanzaに対して共通生成物になるため、相対URLとサブパス配信の検証が必要である。
- `serve` がstanza別ビルド失敗を持つため、`index.html` の一覧とエラー表示をどう同期するかは実装時に注意する。
- README本文を表示する場合、Markdown変換の依存を追加するかどうかを判断する必要がある。初回では入れない方針を推奨する。
- 現行版はquery parameterで初期値を上書きできるが、リメイク版では初回実装に含めない。差分として記録する。

## 実行する確認コマンド

実装後は、ユーザーのローカル環境で次を確認する。

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:github-dependency:local
mise exec -- pnpm run test:distribution:local
```

runtimeや実プロジェクトcompatibilityへ影響する変更が入った場合だけ、次も確認する。

```sh
mise exec -- pnpm run test:compat:local
```
