# Phase 3: serve 設計

Phase 3は、Stanza開発者がlocalhostで開発中のStanzaを確認し、変更後にページ再読み込みで反映できる開発サーバを成立させるフェーズである。

このフェーズでは、Phase 2で成立したbuild / runtime / asset解決を再利用し、`togostanza serve` / `togostanza s` を実装する。`serve` は公開用生成物を作る入口ではないため、`dist/` を書き換えない。

## 目的

- `togostanza serve` / `togostanza s` を、Stanzaリポジトリrootで起動できるようにする。
- `serve --port <port>` と未指定時のport `8080` を成立させる。
- localhostのみでlistenする開発サーバとして、build相当生成物をHTTPで配信する。
- `/`、`/{id}.html`、`/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、asset URLを提供する。
- `serve` が `dist/` を書き換えないことを確認する。
- Stanzaソース、metadata、template、stylesheet、asset、設定、共有ソースの変更後に再ビルドし、ページ再読み込みで反映できるようにする。
- 初回ビルド失敗や再ビルド失敗でもプロセスを終了せず、HTTP 500エラーページを返し、修正後に復帰する。
- 011ケースREADMEに、Phase 3で確認したリメイク版の観測結果を記録する。

## 完了条件

- `serve` と `s` が未実装診断ではなく開発サーバを起動する。
- Stanzaリポジトリroot外で `serve` を実行した場合、Phase 2-0のroot判定と同じ方針で失敗する。
- `serve --port <port>` が指定portでlistenする。
- port未指定時は `8080` を使う。
- `serve` は `127.0.0.1` にlistenし、外部公開用の `0.0.0.0` listenを行わない。
- 起動時にbuild相当生成物を作り、HTTPで配信する。
- build相当生成物は一時出力ディレクトリに作り、Stanzaリポジトリの `dist/` を作成・削除・更新しない。
- `/` がStanza一覧または対象stanzaへ辿れる最小ページを返す。
- `/{id}.html` が対象stanzaの最小プレビューを返す。
- `/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、stanza別asset、root asset、Vite emit asset、共有チャンクがHTTPで読める。
- `/{id}.html` からcustom elementがupgradeされ、Phase 2のruntime表示がブラウザで確認できる。
- Stanza entrypoint、metadata、template、stylesheet、stanza別asset、root asset、設定、共有ソースの変更後に再ビルドされる。
- 再ビルド後の内容は、ページ再読み込みで反映される。
- 初回ビルド失敗時もserver processは起動し、対象URLでHTTP 500エラーページを返す。
- 再ビルド失敗時もserver processは終了せず、HTTP 500エラーページを返す。
- 修正後の再ビルド成功で、通常のプレビューとbuild相当URLへ復帰する。
- integration testまたはbrowser testで、起動、配信、変更反映、失敗復帰、`dist/` 非変更を確認する。
- 011ケースREADMEに、実行したリメイク版コマンド、URL、HTTP status、変更ファイル、invalidate結果、現行版との差分を記録する。

## 含めるもの

- `serve` / `s` のrouting。
- `--port <port>` option。
- port validation。
- localhost listen。
- HTTP server。
- Phase 2のbuild処理を再利用するserve用build service。
- 一時出力ディレクトリへのbuild相当生成物出力。
- `/` の最小Stanza一覧。
- `/{id}.html` とbuild相当ファイルの配信。
- 静的asset、metadata、共有チャンクの配信。
- watchとdebounce。
- 変更後の再ビルド。
- ビルド失敗中のHTTP 500エラーページ。
- 修正後復帰。
- 011ケースのリメイク版観測更新。

## 含めないもの

- HMR。
- 自動ブラウザreload。
- 外部originからのmodule script読み込み保証。
- CORS保証。
- 外部Webアプリ向けの汎用静的ファイルサーバ契約。
- GitHub Pages workflowの変更。
- npm公開metadata、tarball install、live deploy確認。
- React、Vue固有のcompatibility。
- `togostanza-utils` compatibility。
- watch性能や差分ビルド最適化の外部互換固定。
- ヘルププレビューUIの完全復元。
- `index.html` や `-togostanza/` を公開用build生成物として復活させること。

## 実装順

### 3-0 serve build service

3-0では、Phase 2のbuild処理を `serve` から再利用できる形へ整える。

対象:

- `handleBuild()` から、Stanza検出、設定読み込み、Vite build、Sass build、asset copy、HTML生成を内部関数として分離する。
- 通常の `build` は、これまでどおり `--output-path` の安全ガードとoutput markerを使う。
- `serve` は、Stanzaリポジトリ外の一時出力ディレクトリを明示的に渡してbuild相当生成物を作る。
- 一時出力ディレクトリは `dist/` と同じファイル構造を持つ。
- `serve` 用buildでは、公開用 `dist/` のoutput markerやclean安全ガードを外部契約にしない。
- build失敗時は、stack traceではなく既存の `Build failed: ...` 形式に寄せた診断をserver stateへ保持する。

Phase 3では、ViteやSassをメモリ出力へ置き換えない。既存のfile based buildを一時ディレクトリへ出すことで、Phase 2で確認したURL解決とasset配置を保つ。

### 3-1 static serve shell

3-1では、watchを入れる前に、起動済みのbuild相当生成物をHTTPで配信する。

対象:

- `handleServe()` を追加し、routerから `serve` / `s` を配線する。
- `--port <port>` を受け付ける。
- 未指定時は `8080` を使う。
- portは1から65535の整数として扱う。
- listen hostは `127.0.0.1` に固定する。
- 起動後、listen URLをstdoutへ出す。
- `/` はStanza一覧と `/{id}.html` へのリンクを持つ最小HTMLを返す。
- `/{id}.html` は一時出力ディレクトリ内のHTMLを返す。
- build相当ファイル、asset、metadata、共有チャンクは一時出力ディレクトリから配信する。
- path traversalを拒否する。
- MIME typeは、HTML、JavaScript、CSS、JSON、SVG、PNG、JPEG、WebP、text、fontを最小対応にする。
- 実在するファイルは、未知拡張子でもHTTP 404や拒否にせず、`application/octet-stream` で配信する。
- server shutdown時にHTTP serverを閉じ、一時出力ディレクトリを削除する。

`serve` のCLIは長時間動く。実装では、CLI entryからserverが参照され続ける形にする。testでは、server instanceまたはclose callbackを取得できる注入点を用意し、終了時に `closeAllConnections()` 相当の後始末を行う。

### 3-2 watch / invalidate

3-2では、変更検知と再ビルドを追加する。

対象:

- Node.js標準の `fs.watch` を基本にし、Phase 3では新しいwatch依存を追加しない。
- Stanzaリポジトリrootを再帰的に監視する。
- `.git/`、`node_modules/`、公開用 `dist/`、一時出力ディレクトリ、その他明らかなcontrol directoryはwatch対象から除外する。
- 短いdebounceを入れ、連続変更を1回の再ビルドへまとめる。
- metadata、template、stylesheet、entrypoint、stanza別assetの変更は、対象stanzaの変更として記録する。
- 共有ソース、root asset、設定、package情報、stanza追加削除、安全に特定できない変更は、全体invalidateとして記録する。
- Phase 3の実装では、まず全体rebuildを許容する。差分invalidateは、どの変更がどの範囲へ影響したかを観測・記録できることを優先し、build性能の最適化は外部互換にしない。
- 再ビルド成功後は、新しい一時出力ディレクトリへ切り替える。
- 古い一時出力ディレクトリは、切り替え後に削除する。

`serve` はHMRを提供しない。変更後の反映は、Stanza開発者がブラウザを再読み込みすることで確認する。

### 3-3 error state / recovery

3-3では、失敗中もserverを維持し、修正後に復帰する挙動を固める。

対象:

- 初回ビルド失敗時もserverをlistenさせる。
- 初回ビルド失敗中の `/` とbuild相当URLは、HTTP 500エラーページを返す。
- 再ビルド失敗時は、最後に成功した生成物を開発者へ見せ続けるのではなく、失敗中であることが分かるHTTP 500を返す。
- エラーページには、失敗したcommand種別、対象pathが分かる場合はpath、エラーメッセージを含める。
- stack traceや絶対pathをどこまで出すかは、localhost開発サーバであることを前提に扱う。Phase 3では詳細診断を優先してよいが、不要な環境情報を増やしすぎない。
- 修正後に再ビルドが成功した場合、通常の `/`、`/{id}.html`、build相当URLへ復帰する。

エラー状態は、Phase 3ではserver全体の状態として扱ってよい。将来、stanzaごとの部分成功を扱う場合は、watch / invalidateの詳細化と合わせて後続判断にする。

### 3-4 verification / case update

3-4では、testと011ケース更新を行う。

対象:

- unit testで、port parsing、invalid port、path traversal、MIME type、error page formattingを確認する。
- integration testで、bin entry経由の `serve --port <port>` 起動、stdoutのlisten URL、HTTP response、process shutdownを確認する。
- browser testで、`/{id}.html` からcustom elementがupgradeされることを確認する。
- browser testまたはintegration testで、変更後の再読み込み反映を確認する。
- browser testまたはintegration testで、ビルド失敗中のHTTP 500と修正後復帰を確認する。
- testでは固定port競合を避けるため、明示portまたはNodeが割り当てたportを観測できる注入点を使う。
- 011ケースREADMEに、リメイク版の起動コマンド、配信URL、HTTP status、変更反映、失敗復帰、現行版との差分を記録する。

## serve build方針

`serve` は、Phase 2で作った公開用buildと同じ生成物構造をHTTPで配信する。ただし、公開用ファイルを作る責務は `build` に残し、`serve` は `dist/` を変更しない。

実装上は、一時出力ディレクトリへbuild相当生成物を作る。これにより、Vite、Sass、asset copy、HTML生成、metadata出力、相対URL契約をPhase 2と共有できる。

`serve` の一時出力ディレクトリは、Stanzaリポジトリrootの外に作る。これにより、watch対象とbuild出力が循環しないようにする。server終了時には削除する。異常終了で残った一時ディレクトリの清掃方針は、Phase 3では外部互換にしない。

## watch / invalidate方針

Phase 3では、watchの正確な最適化よりも、変更後に正しく復帰できることを優先する。

stanza固有入力の変更は対象stanzaのinvalidateとして記録する。共有ソース、root asset、設定、依存関係解決へ影響する変更、stanza追加削除、安全に分類できない変更は全体invalidateとして扱う。

ただし、Phase 3の初期実装ではrebuild処理は全体rebuildでよい。これは開発サーバの性能最適化を後回しにし、観測契約である「変更が反映される」「失敗しても復帰できる」を先に満たすためである。後続で必要になれば、Phase 2のimport graph情報やViteのwatcher情報を使った部分buildへ広げる。

## HTTP方針

`serve` はlocalhost開発サーバである。`127.0.0.1` にlistenし、外部公開用のhost指定optionはPhase 3では追加しない。

`/` と `/{id}.html` は、Stanza開発者がブラウザで確認できる最小UIにする。ヘルププレビューUIの完全復元やカスタマイズUIはPhase 3の対象にしない。

静的配信では、path traversalを拒否する。見つからないURLはHTTP 404を返す。実在するファイルは、MIME typeの固定リスト外の拡張子でも拒否せず、`application/octet-stream` で返す。これはPhase 2で任意assetをbuild / copyできるため、`serve` だけが未知拡張子を理由に壊れないようにするためである。ビルド失敗中は、build相当URLとプレビューURLでHTTP 500を返す。

## 検証計画

Unit test:

- `serve --port` の値検証。
- 未指定時port `8080`。
- invalid portの診断。
- root外実行の診断。
- path traversal拒否。
- MIME typeの最小判定。
- 未知拡張子の実在ファイルを `application/octet-stream` として配信するfallback。
- error page formatting。
- watch変更分類。

Integration test:

- bin entry経由で `serve --port <port>` が起動する。
- stdoutにlisten URLが出る。
- `/`、`/{id}.html`、`/{id}.js`、`/{id}.css`、`/{id}/metadata.json`、asset URLが読める。
- `serve` が `dist/` を作成・変更しない。
- `s` aliasが同じ挙動になる。
- processを終了でき、一時出力ディレクトリが片付く。

Browser test:

- `/{id}.html` でcustom elementがupgradeされる。
- stylesheet、metadata、asset、共有チャンクがserve経由で解決される。
- Stanza source変更後、ページ再読み込みで表示が変わる。
- 再ビルド失敗中にHTTP 500エラーページを確認できる。
- 修正後に通常表示へ復帰する。

Documentation:

- 011ケースREADMEにリメイク版観測結果を追記する。
- Phase 3完了後にhandoffを作る。

## 後続へ送る事項

- HMR。
- 自動ブラウザreload。
- host指定option。
- CORS保証。
- watch性能最適化。
- stanzaごとの部分build。
- エラー状態のstanza単位管理。
- ヘルププレビューUIの完全復元。
- `index.html` と `-togostanza/` を公開用build生成物として復活させるかどうか。
- React、Vue、`togostanza-utils` 互換。

## 確認コマンド

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、sandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
