# 文章スタイル

この文書では、TogoStanza Remakeの文書を書くときの表記スタイルを扱う。

用語の意味や概念の境界は [用語集](./UBIQUITOUS_LANGUAGE.md) で扱う。
この文書では、同じ意味の語をどの表記で書くかを揃える。

## 基本方針

- 日本語の説明文では、読みやすいカタカナ語または日本語表現を優先する。
- コード、コマンド、ファイル名、パッケージ名、API名、属性名、設定キーは原文の表記を維持する。
- 英語表現を残す場合でも、日本語との間に不要な半角スペースを入れない。
- 英語表現内部のスペースは維持する。
  - 例: `module script`、`custom element`、`source map`
- 固有の観測語として残したい表現は、無理に翻訳しない。

## 推奨表記

| 英語表現 | 推奨表記 | 備考 |
| -------- | -------- | ---- |
| runtime | ランタイム | `TogoStanza runtime` のような固有表現では必要に応じて原文を維持する。 |
| build | ビルド | コマンド名の `build` はそのまま書く。 |
| artifact | 生成物 | `build artifact` を専門語として扱う場合だけ原文を残す。 |
| preview | プレビュー | `help preview` は説明文では `ヘルププレビュー` と書く。 |
| scaffold | 雛形生成 | 生成された結果を指す場合は `雛形` と書いてよい。CLIの出力形式を指す調査メモでは `scaffold` を残してよい。 |
| source | ソース | `Stanza source` は既存文書での扱いに合わせ、必要なら原文を維持する。 |
| mount | マウント | DOMやframeworkの操作名として説明する場合はカタカナに寄せる。 |
| chunk | チャンク | `shared chunk` は説明文では `共有チャンク` などに寄せる。 |
| help | ヘルプ | コマンドオプションの `--help` や `help-app.js` などの名前はそのまま書く。 |
| page | ページ | `help page` は説明文では `ヘルプページ` と書く。HTMLファイル名やコード上の識別子はそのまま書く。 |
| container | コンテナ | `togostanza--container` などのcustom element名はそのまま書く。 |
| repository | リポジトリ | `generated-repo/` などのパスはそのまま書く。 |
| directory | ディレクトリ | パス表記はそのまま書く。 |
| package manager | パッケージマネージャー | `npm`、`pnpm` などの名前はそのまま書く。 |
| install | インストール | コマンドの `install` はそのまま書く。 |
| cache | キャッシュ | `.cache/` のようなパスはそのまま書く。 |
| server | サーバー | `HTTP server` など技術語として残す場合は文脈で判断する。 |
| browser | ブラウザ | `in-app browser` は環境名として原文を残してよい。 |
| console | コンソール | `browser console` は調査メモでは原文を残してよい。 |
| error | エラー | ログの `error` はそのまま書く。 |
| warning | 警告 | ログの `warning` はそのまま書く。 |
| event | イベント | `CustomEvent`、`stanza:outgoingEvent` などのAPI名やメタデータキーはそのまま書く。 |
| metadata | メタデータ | ファイル名の `metadata.json` やキー名ではそのまま書く。 |
| sender | 送信側 | 検証ケース名やstanza IDの一部ではそのまま書く。 |
| receiver | 受信側 | 検証ケース名やstanza IDの一部ではそのまま書く。 |
| target | 対象 | `target` 属性、`target-attribute`、`event.target` などの名前はそのまま書く。 |
| dispatch | 送出 | API呼び出しの `dispatchEvent()` はそのまま書く。 |
| attribute | 属性 | HTML属性名や `attribute mutation` は原文を残してよい。 |
| mutation | 変更 | `MutationObserver` などのAPI名はそのまま書く。 |
| parameter | パラメーター | `stanza:parameter` やAPI名はそのまま書く。 |

## 原文を維持するもの

次の表現は、文章中でも原文を維持してよい。

- コマンド名: `build`、`serve`、`generate stanza`
- パッケージ名: `react`、`vue`、`@rollup/plugin-typescript`
- API名: `this.params`、`this.root`、`renderTemplate()`
- イベントAPI名: `dispatchEvent()`、`CustomEvent`
- DOM API名: `MutationObserver`
- HTMLやWeb Componentsの語: `custom element`、`module script`、`Shadow DOM`
- 設定やメタデータのキー: `stanza:type`、`stanza:parameter`
- パスやファイル名: `generated-repo/`、`metadata.json`

## 判断に迷う場合

- 読みやすさを優先する説明文では、カタカナ語か日本語表現に寄せる。
- 現行版の観測結果やログに近い調査メモでは、原文を残してよい。
- 同じ文書内では、同じ語の表記を揃える。
- 意味の違いがありそうな場合は、この文書では決めず [用語集](./UBIQUITOUS_LANGUAGE.md) に追加する。
