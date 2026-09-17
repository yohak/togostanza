# Phase 3: serve 引き継ぎ

この文書では、Phase 3完了後にPhase 4以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 3の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `togostanza serve` / `togostanza s` を、Stanzaリポジトリrootで起動できる開発サーバーとして実装した。
- `serve --port <port>` と未指定時port `8080` を実装した。
- listen hostを `127.0.0.1` に固定した。
- Phase 2のbuild処理を再利用し、build相当生成物をStanzaリポジトリ外の一時出力ディレクトリへ作るようにした。
- `serve` がStanzaリポジトリの `dist/` を作成・削除・更新しないことを確認した。
- `/` でStanza一覧を返し、対象stanzaの `/{id}.html` へ辿れるようにした。
- `/{id}.html` で、`./{id}.js` と `<togostanza-{id}>` を含む最小プレビューを返すようにした。
- `/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、stanza別asset、root asset、Vite emit asset、共有チャンクをHTTPで配信できるようにした。
- TogoMedium Webのような別localhost開発サーバーから確認できるように、loopback originからの開発用CORSと `OPTIONS` preflightを許可した。
- 実在する未知拡張子のファイルは、HTTP 404や拒否ではなく `application/octet-stream` で配信するようにした。
- path traversalを拒否するようにした。
- `fs.watch` とdebounceを使い、変更後に再ビルドするようにした。
- stanza固有入力の変更は、対象stanzaだけを再ビルドするようにした。
- root asset、共有ソース、設定、安全に特定できない変更は、全体rebuildとして扱うようにした。
- 対象stanzaの再ビルド失敗では、そのstanzaのプレビューとbuild相当URLをHTTP 500にするようにした。
- 全体rebuild失敗では、server全体をHTTP 500状態にするようにした。
- 修正後の再ビルド成功で、通常のプレビューとbuild相当URLへ復帰するようにした。
- `SIGINT` / `SIGTERM` で終了した場合も、HTTP server、watcher、一時出力ディレクトリを後始末するようにした。
- bin entry経由の `serve` 起動、stdoutのlisten URL、HTTP response、process shutdown、一時出力ディレクトリ削除をintegration testで確認した。
- browser testで、`/{id}.html` からcustom elementがupgradeされ、Shadow DOM内の `main` とstylesheet適用が確認できることを確認した。
- 011ケースREADMEに、Phase 3で確認したリメイク版の観測結果と現行版との差分を記録した。

## 意図的に残したこと

- HMR。
- 自動ブラウザreload。
- host指定option。
- 外部Webアプリ向けの汎用静的ファイルサーバー契約。
- ヘルププレビューUIの完全復元。
- 公開用build生成物としての `index.html` と `-togostanza/` の復活。
- React、Vue、`togostanza-utils` の追加互換。
- 共有ソース変更時の精密な影響stanza特定。
- watch性能最適化。
- watch依存をVite watcherやchokidarへ寄せるかどうか。
- 異常終了で残った古い一時ディレクトリを次回起動時に掃除する仕組み。

## Phase 4以降で使う前提

- `serve` はPhase 2のbuild生成物構造を一時出力ディレクトリ上に作り、その内容をHTTPで配信する。
- `serve` は公開用生成物を作る入口ではない。公開用ファイルを作る場合は `build` を使う。
- `serve` のURL解決はPhase 2の生成物URL契約を再利用する。Phase 4のReact、Vue、`togostanza-utils` 確認でも、まず `build` で成立する生成物が `serve` でも読める前提で扱う。
- `/{id}.html` はcustom elementを確認するための最小プレビューであり、現行版のヘルププレビュー完全互換ではない。
- `serve` はHMRを提供しない。変更後の反映確認はブラウザのページ再読み込みを前提にする。
- `serve` はlocalhost開発サーバーであり、loopback originからの開発用CORSを許可する。外部Webアプリ向けの汎用配信サーバーとしての利用契約にはしない。
- `SIGINT` / `SIGTERM` 終了時は一時出力ディレクトリを削除する。強制終了やprocess crashで残った一時ディレクトリの次回清掃は、Phase 3では外部互換にしていない。
- `test:browser` を含む完了前確認は、引き続き `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認する。

## Phase 4以降で注意すること

- React、Vue、`togostanza-utils` の確認で `serve` を使う場合、`/{id}.html` は最小プレビューである。ヘルププレビュー固有UIや既存の `-togostanza/` 構造を前提にした確認は、別途Phase 4のcompatibility判断として扱う。
- 共有ソース変更はPhase 3では全体rebuildへ倒している。実プロジェクトで大きなリポジトリを扱う場合、watch性能や影響stanza特定が追加課題になる可能性がある。
- 設定変更は全体rebuildとして扱う。設定変更時の細かな差分invalidateはPhase 3では固定していない。
- root assetをStanzaソースからどう参照するかはPhase 2-4で既知制約として残している。`serve` は生成済みURLを配信するだけで、参照APIの追加は行っていない。
- `serve` のプレビューHTMLは最小限であり、将来ヘルププレビューUIを復活させる場合は、Phase 2のruntime APIとPhase 4のcompatibility確認を前提に別タスクとして扱う。

## 後続判断として残すこと

- HMRを入れるかどうか。
- 自動ブラウザreloadを入れるかどうか。
- host指定optionを追加するかどうか。
- CORS保証をloopback origin以外へ広げるかどうか。
- ヘルププレビューUI、`index.html`、`-togostanza/` をどの範囲で復活させるか。
- 共有ソース変更時の精密な影響stanza特定を実装するかどうか。
- watch基盤をNode.js標準 `fs.watch` からVite watcherやchokidarへ寄せるかどうか。
- 強制終了などで残った一時出力ディレクトリの次回起動時清掃を追加するかどうか。
- 大規模Stanzaリポジトリでのwatch性能検証。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは65件、integration testは19件、browser testは7件が通った。
- Phase 3レビュー対応後に、`SIGTERM` 終了時の一時出力ディレクトリ削除、共有ソース変更、root asset変更の回帰テストを追加した。

## 関連文書

- [Phase 3設計](./plan.md)
- [011 Serve development server](../../../../workbench/cases/011-serve-development-server/)
