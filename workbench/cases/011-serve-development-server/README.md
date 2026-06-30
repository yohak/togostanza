# 011 Serve development server

## 目的

`togostanza serve` を、Stanza開発者がlocalhostで開発中のStanzaを確認するための開発サーバとして検証する。

## 対応する方針

- `serve` は `dist/` を書き換えず、build相当生成物をHTTPで配信する。
- `serve` はlocalhostでlistenし、未指定時のportは `8080` とする。
- `serve` は変更された入力と依存関係に基づき、可能な範囲で影響を受けるstanzaだけを再ビルドする。
- `serve` はビルド失敗時も終了せず、対象URLへHTTP 500エラーページを返し、修正後に復帰する。

## 入力条件

- 1つ以上のstanzaを含む最小Stanzaリポジトリを用意する。
- Stanza entrypoint、metadata、template、stylesheet、asset、設定、共有ソースの変更を観測できるようにする。
- ビルド失敗と修正後復帰を観測できる入力を用意する。

## 現行版で観測すること

- `serve --port` の起動とlisten先。
- `/`、`/{id}.html`、`/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、asset URLの配信。
- Stanzaソースや関連ファイル変更後の反映方法。
- ビルド失敗時のプロセス継続、HTTP response、ブラウザ表示。

## リメイク版で観測すること

- `serve` がlocalhost開発サーバとして起動すること。
- build相当URLをサーバrootから配信すること。
- `serve` が `dist/` を書き換えないこと。
- 変更後にページ再読み込みで反映されること。
- stanza固有入力の変更では対象stanzaだけが再ビルドされること。
- 依存グラフ上の変更では影響を受けるstanzaがinvalidateされること。
- 安全に特定できない変更では全体invalidateされること。
- ビルド失敗時にHTTP 500エラーページを返し、修正後に復帰すること。

## 合格条件

- `serve --port <port>` と未指定時のport `8080` を確認できる。
- 必須URLが配信される。
- Stanza entrypoint、metadata、template、stylesheet、asset、設定、共有ソースの変更が反映される。
- 再ビルド失敗時にプロセスが終了しない。
- ビルド失敗中の対象URLでエラー内容が分かる。
- 修正後に通常のプレビューとbuild相当URLへ復帰する。

## 記録する差分

- 起動コマンドとport。
- 配信されたURLとHTTP status。
- 変更したファイルとinvalidate対象。
- ビルド失敗時の画面、HTTP status、復帰手順。
- 対象stanzaだけの再ビルド失敗で、対象stanzaのURLだけがHTTP 500になること。
- 共有ソース、設定、安全に特定できない変更の失敗で、server全体がHTTP 500になる場合は、その差分。

## 未決定事項

- 現行版とのwatch挙動差分をどこまで互換対象にするか。
- 依存グラフで安全に特定できない変更の具体分類。

## Phase 3計画での扱い

- Phase 3では、`serve` の生成物を一時出力ディレクトリに作り、`dist/` を書き換えないことを確認する。
- Phase 3では、stanza固有入力の変更は対象stanzaだけを再ビルドする。
- 共有ソース、設定、安全に特定できない変更では全体rebuildを許容する。
- 共有ソース変更時の精密な影響stanza特定、HMR、自動ブラウザreload、host指定optionはPhase 3の対象外または後続判断とする。
