# Phase 11: compatibility verification 引き継ぎ

Phase 11では、Phase 9で作ったlocal compatibility baselineを、全Stanza browser smoke、TogoMedium Webアプリ本体の最小E2E、runtime edge semantics確認へ広げた。references依存確認は引き続きdefault `check-all` には含めず、ローカルcompatibility確認として `test:compat:local` に閉じている。

## 完了したこと

- `test:compat:local` 用の共通helperを整えた。
  - `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` の存在診断。
  - metastanza 10件とTogoMedium Stanza 15件の対象名再照合。
  - per-Stanza fixture dataの論理path規約。
  - browser console、pageerror、failed requestを含む失敗診断bundle。
- metastanza全10 Stanzaのdirect embed browser smokeを実行した。
  - `barchart`、`hash-table`、`linechart`、`pagination-table`、`piechart`、`scatterplot`、`scorecard`、`scroll-table`、`text`、`tree`。
  - module script、custom element upgrade、open Shadow DOM、`main`、local fixture data、最小描画を確認した。
- TogoMedium Stanza全15件のdirect embed browser smokeを実行した。
  - React / TSX、TogoMedium provider stack、MUI / Emotion、TanStack Query、Jotai / Reduxを含むStanza単体の直接埋め込み確認が通った。
- TogoMedium Webアプリ本体の最小E2Eを実行した。
  - `/find-media-by-components` で、TogoMedium Webのローカルサーバーから別ポートのリメイク版 `togostanza serve` が配信するStanza bundleを読み込めることを確認した。
  - `togostanza serve` はloopback CORSを許可するようにした。
- `main.parentNode.style` 依存をリメイク版ランタイムで吸収した。
  - `main` をHTMLElement containerの内側へ置く。
  - `this.root` はShadowRootのまま維持する。
  - `this.root.querySelector("main")` の経路も維持する。
- Runtime edge semanticsを現行版ソース読解とリメイク版確認で整理した。
  - 集約索引は [runtime edge semantics](./runtime-edge-semantics.md) に置いた。
  - 004、005、013、012の各検証ケースにも関連する観測結果を記録した。

## 修正した互換差分

- boolean以外の未指定parameterは `this.params` にkeyを持ち、値を `null` にする。
- invalid JSON parameterは `JSON.parse()` 由来の例外に寄せる。
- `handleAttributeChange()` の既定動作は50ms debounce後に `render()` を呼ぶ。
- `importWebFontCSS()` はShadow DOMだけでなく `document.head` にもlinkを追加する。
- `query()` は `Content-Type: application/x-www-form-urlencoded` を明示する。
- `togostanza serve` はloopback originからのCORSを許可する。
- `build` 成功時は簡易的な所要時間を表示する。

## 変更しなかったこと

- references依存確認はdefault `check-all` に含めない。
- `references/` は直接変更しない。
- TogoMedium固有aliasは自動吸収しない。必要なaliasは `togostanza.config.ts` の `vite.resolve.alias` で扱う。
- `tsconfig paths` の自動解決はしない。
- React / Vue / Emotion / MUIの広いversion matrixは広げない。
- Direct embed smokeは、UI操作網羅、実API接続、pixel-level比較、全画面E2Eではない。
- TogoMedium Webアプリ本体E2Eは1ルートのlocal smokeに留めた。
- `render()` 例外は現行版同様の未捕捉へ戻さない。リメイク版ではconsole errorとして報告し、ランタイム全体の停止を避ける。
- menuの内部DOM、keyboard interaction、Copy HTML snippet相当のUIは固定しない。
- CSS source mapのbyte-level / column-level精度は外部契約にしない。

## Phase 12へ送ること

- pack install smoke。
- npm package公開面の最終整理。
- GitHub Actions上でのlive deploy確認。
- `dependencies.togostanza` のversion spec確定。
- 公開環境でのStanza hosting URL設計。
- hermetic browser suiteの低頻度build flakeが再現した場合の原因調査。
  - Phase 11-2中に一度だけ `togostanza build` の間欠失敗が観測され、再実行で解消した。
  - 次に再現した場合は、Vite / esbuildが出すエラー全文、対象fixture、一時出力先を捕捉する。

## 後続へ送ること

- TogoMedium Webアプリ本体の追加E2E。
  - Phase 11-3では `/find-media-by-components` の1ルートだけを確認した。
- ヘルププレビューUIのリッチ化。
  - menuのリッチなUI、keyboard interaction、Copy HTML snippet相当の導線も近い領域で扱う。
  - 本開発では不要だが、後続優先度は中から高寄りとする。
- CLI status / result messagesの整理。
- `stanza:parameter` / `stanza:style` の広範なschema validationを行うかどうかの判断。

## 再実行手順

Phase 12着手前または互換性に関わるランタイム変更後は、少なくとも次を再実行する。

```sh
cd package && mise exec -- pnpm run check-all
cd package && mise exec -- pnpm run test:compat:local
```

`test:compat:local` は、ローカルの `references/` と各references側の `node_modules/` に依存する。CIや他マシンでの再現性を保証する入口ではない。

## 確認結果

Phase 11-4完了時点で次を確認した。

- `git diff --check`: pass
- `cd package && mise exec -- pnpm run test:unit`: pass
- `cd package && mise exec -- pnpm run test:browser`: pass
- `cd package && mise exec -- pnpm run test:compat:local`: pass
- `cd package && mise exec -- pnpm run check-all`: pass

`test:unit` はsandbox内ではlocalhost listen制限により `EPERM` が出る場合がある。完了確認は、承認付き通常実行でユーザーのローカル環境を優先する。
