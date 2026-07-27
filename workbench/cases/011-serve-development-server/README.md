# 011 Serve development server

## 目的

`togostanza serve` を、Stanza開発者がlocalhostで開発中のStanzaを確認するための開発サーバとして検証する。

## 対応する方針

- `serve` は `dist/` を書き換えず、build相当生成物をHTTPで配信する。
- `serve` はlocalhostでlistenし、未指定時のportは `8080` とする。
- `serve` は別localhost開発サーバーからの確認用に、loopback originからのCORSを許可する。
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
- loopback originからの `GET` と `OPTIONS` preflightにCORS headerを返すこと。
- `serve` が `dist/` を書き換えないこと。
- `serve` は永続出力先をclearしないため、`build --output-path` の出力先clear promptを出さないこと。
- 変更後にページ再読み込みで反映されること。
- 初回ビルドと再ビルド完了時に、更新完了、更新時刻、ビルド所要時間が標準出力へ表示されること。
- stanza固有入力の変更では対象stanzaだけが再ビルドされること。
- 依存グラフ上の変更では影響を受けるstanzaがinvalidateされること。
- 安全に特定できない変更では全体invalidateされること。
- ビルド失敗時にHTTP 500エラーページを返し、修正後に復帰すること。

## 合格条件

- `serve --port <port>` と未指定時のport `8080` を確認できる。
- 必須URLが配信される。
- loopback originからのCORS確認ができる。
- Stanza entrypoint、metadata、template、stylesheet、asset、設定、共有ソースの変更が反映される。
- 初回ビルドと再ビルド完了時に、更新時刻とビルド所要時間を含むstatus messageが確認できる。
- 再ビルド失敗時にプロセスが終了しない。
- ビルド失敗中の対象URLでエラー内容が分かる。
- 修正後に通常のプレビューとbuild相当URLへ復帰する。

## 記録する差分

- 起動コマンドとport。
- 配信されたURLとHTTP status。
- CORS headerと `OPTIONS` preflightのHTTP status。
- 初回ビルド、対象stanza再ビルド、全体再ビルドのstatus message。
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

## リメイク版観測: Phase 3

確認方法:

- `mise exec -- pnpm run test:unit`
- `mise exec -- pnpm run test:integration`
- `mise exec -- pnpm run test:browser`

確認したこと:

- bin entry経由で `togostanza serve --port <port>` が起動し、stdoutに `http://127.0.0.1:<port>/` が出る。
- `togostanza s --port <port>` でも同じserve実装へ到達する。
- `/` はStanza一覧を返し、対象stanzaの `/{id}.html` へ辿れる。
- `/{id}.html` はserve用の最小プレビューとして、`./{id}.js` と `<togostanza-{id}>` を含むHTMLを返す。
- `/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、stanza別assetがHTTP 200で読める。
- loopback originからの `GET /{id}.js` で `Access-Control-Allow-Origin` が返り、`OPTIONS /{id}.js` がHTTP 204で返る。
- 未知拡張子の実在assetは、`application/octet-stream` でHTTP 200として配信される。
- `serve` はStanzaリポジトリの `dist/` を作成しない。
- `dist/` に既存生成物があっても、`serve` はそれをclear / overwrite対象にしない。
- stanza固有入力である `style.scss` の変更後、対象stanzaのCSSが再ビルドされ、ページ再読み込みで反映される。
- 共有ソース変更後、共有ソースを使う複数stanzaのbundleが全体rebuildで更新される。
- root asset変更後、serve経由のroot asset URLが全体rebuildで更新される。
- stanza固有入力の再ビルドに失敗した場合、対象stanzaのbuild相当URLはHTTP 500になり、エラーページに `Sass compile failed` が含まれる。
- 修正後の再ビルド成功で、対象stanzaのbuild相当URLはHTTP 200へ復帰する。
- bin entry経由の `serve` を `SIGTERM` で終了したあと、一時出力ディレクトリが削除される。
- Playwrightで `/{id}.html` を開き、custom elementがupgradeされ、Shadow DOM内の `main` とstylesheet適用を確認した。

現行版との差分:

- リメイク版Phase 3の `/{id}.html` は、ヘルププレビューの完全復元ではなく、custom elementを確認するための最小プレビューである。
- リメイク版Phase 3は `dist/` を書き換えず、一時出力ディレクトリ上のbuild相当生成物を配信する。これは、`serve` 実行だけで公開用 `dist/` を削除・更新しないためと、再ビルド中の書きかけ生成物を配信しないための意図的な差分である。
- 共有ソース変更時の精密な影響stanza特定、HMR、自動ブラウザreloadは未実装である。

## Phase 6 リメイク版workbench入力

Phase 6では、011用の `remake/generated-repo/` は新規作成しない。`serve` の実挙動はPhase 3でpackage automated testとして確認済みであり、watcher、HTTP server、一時ディレクトリcleanupを含むため、現時点ではpackage testを正本の確認入口とする。

011をworkbench入力として独立させる場合は、後続で `remake/generated-repo/` に `serve:local` を置き、Stanza entrypoint、metadata、template、stylesheet、asset、設定、共有ソースの変更を人間が再実行できる形へ切り出す。
