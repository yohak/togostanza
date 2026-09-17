# Follow-ups

この文書では、現行版調査や仕様判断の途中で挙がった改善案を記録する。

ここにある項目は、リメイク版の今回のスコープへ自動的に入るものではない。採用する場合は、別途仕様判断を行う。

## 改善案の扱い

- 互換維持がシンプルで不具合がないものは、原則として現行挙動を維持する。
- 改善目的だけの変更は、今回の主スコープにしない。
- 非採用になる可能性が高い案も、後から判断材料にできるように残す。
- 採用する場合は、目的、影響範囲、migration noteの要否を確認する。

## メタデータ検証の強化

- 種別: 機能改善
- 背景: `metadata.json` はcustom element名、パラメーター変換、menu、ヘルププレビューに影響する。
- 改善案: `build`/`serve` 開始時に `metadata.json` を検証し、Stanza IDとファイルパスを含む分かりやすいエラーを出す。
- 採用候補:
  - `metadata["@id"]` とstanzaディレクトリ名の不一致をエラーにする。
  - `stanza:parameter` のkey/type/exampleを検査する。
  - boolean/number/jsonなど、runtime変換に関わるtypeを検査する。
- 注意: 既存の正しいmetadataは壊さない。現行で曖昧に通っていた不正入力は、警告またはエラーになる可能性がある。
- 今回のスコープ: 必要性が明確な検証だけを採用し、広範なschema整備は後続判断にする。

## 診断メッセージの整理

- 種別: 機能改善
- 背景: 現行版ではSass deprecation警告、ヘルププレビューのfetch失敗、環境由来エラーが分かりにくい場合がある。
- 改善案: エラーや警告に対象Stanza ID、ファイルパス、修正すべき内容を含める。
- 採用候補:
  - validationエラー
  - migration警告
  - preview警告
  - environment警告
- 注意: CLI出力文言そのものは互換対象にしない。
- 今回のスコープ: ツールチェーン更新で自然に改善される範囲を優先し、独自診断の作り込みは後続判断にする。

## framework supportの拡張

- 種別: 機能改善
- 背景: 現行TipsにはReact/Vue/Svelteの例がある。
- 改善案: Vite 8ベースでframework supportを整理する。
- 採用候補:
  - React/TSXは `TogoMedium Stanza` 互換のため重点対応する。
  - Vueは `metastanza` 互換のため重点対応する。
  - Svelteなど、実プロジェクトで未確認のframeworkはfollow-upとして扱う。
- 注意: 新規公式対応を広げることは今回の主目的ではない。

## 旧設定ファイルの有効性確認

- 種別: 追加調査
- 背景: `metastanza` には `togostanza-build.mjs` があり、`TogoMedium Stanza` には `togostanza-build.js` がある。旧調査では、現行版は `.mjs` 固定で読み、`.js` は有効ではなかった可能性が指摘されている。
- 確認案:
  - 現行版が実際に読む設定ファイル名を、実装と実行観測で確認する。
  - `metastanza` の `togostanza-build.mjs` が現行buildに影響しているか確認する。
  - `TogoMedium Stanza` の `togostanza-build.js` が現行buildで有効だったか確認する。
- 注意: リメイク版では旧設定ファイルを無条件実行しない。検出したうえで、migration noteへ誘導する。
- 今回のスコープ: 詳細な変換仕様やcodemodは実装時判断にする。

## `stanza:include` の扱い

- 種別: 追加調査
- 背景: 現行版には、メタデータの共通パラメーター定義を `stanza:include` で展開する仕組みがある。
- 確認案:
  - 実プロジェクトでの使用有無を確認する。
  - 現行docs/testsでの使用例を確認する。
  - 相対パス、package解決、include後のmetadata出力の現行挙動を必要に応じて観測する。
- 注意: 現時点では `必須` / `再設計` / `破棄` を確定しない。
- 今回のスコープ: 現行機能として認識し、扱いは追加調査後に決める。

## alias互換の扱い

- 種別: 実装時判断
- 背景: 現行版にはalias的挙動があり、実プロジェクトではtsconfig pathsや独自import prefixも観測されている。
- 確認案:
  - 既存Stanzaソースが使っているaliasを実プロジェクトごとに確認する。
  - Viteの標準 `resolve.alias` やtsconfig pathsで吸収できる範囲を確認する。
  - 互換layerが必要か判断する。
- 注意: 独自alias全廃は現時点では採用しない。既存Stanzaソースが壊れないことを優先する。
- 今回のスコープ: alias合成順やVite設定の詳細は固定しない。

## serveの埋め込み検証

- 種別: 実装時確認
- 背景: StanzaのWeb Componentは、一般的なWebサイトへ直接埋め込めることを前提にする。`serve` はヘルププレビューだけでなく、別のローカルページや別アプリからランタイムscriptを読み込む確認にも使える必要がある。
- 確認案:
  - 一般Webサイトに近いHTMLから `<script type="module" src=".../{id}.js">` と `<togostanza-{id}>` で動くことを確認する。
  - ローカルの別ページや別アプリから `serve` 中の `{id}.js` を読み込めることを確認する。
  - TogoMediumのようなWebアプリ埋め込みをregression testに含める。
- 注意: CORS、HMR、watch、livereload、Vite dev serverの使い方は今決めない。

## asset処理の詳細

- 種別: 実装時判断
- 背景: 現行版には、公開assetsのコピーとStanzaソースからのasset importがある。
- 確認案:
  - 既存Stanzaソースからのasset importが壊れないことを確認する。
  - リポジトリルート `assets/` とstanza個別 `assets/` の公開pathを確認する。
  - metastanza/TogoMediumのasset使用状況を見て実装方式を判断する。
- 注意: data URL inline、別ファイルemit、hash名、size thresholdなどの詳細は今固定しない。既存ソースやHTMLが参照するpathを壊す場合は移行メモが必要。

## ヘルププレビューの改善

- 種別: 機能改善
- 背景: 現行ヘルププレビューはメタデータ例からcustom elementを生成する。存在しないexample URLをfetchすると、ブラウザコンソールのJSON parseエラーになる場合がある。
- 改善案: preview上でexampleの読み込み失敗を分かりやすく表示する。
- 改善案: `README.md` 本文を安全に読み込み、Markdownとしてヘルププレビューへ表示する。Phase 13の初回実装では見送った。
- 注意: ヘルププレビューはランタイム埋め込みとは別物であり、UIや実装技術は再設計可能。
- 今回のスコープ: `serve` がローカルpreviewを提供する目的は維持し、UI改善は後続判断にする。

## 細かいCLIエラーコード

- 種別: 機能改善
- 背景: 現行は成功 `0`、失敗 `1` が基本。
- 改善案: validationエラー、configエラー、buildエラーなどにエラーコードを分ける。
- 注意: CI互換として重要なのは、成功 `0` / 失敗non-zeroを維持すること。
- 今回のスコープ: 細かいエラーコード分類は扱わない。
