# Follow-ups

この文書では、現行版調査や仕様判断の途中で出た改善案を記録する。

ここにある項目は、リメイク版の今回スコープへ自動的に入るものではない。採用する場合は、別途仕様判断を行う。

## 改善案の扱い

- 互換維持がシンプルで不具合がないものは、原則として現行挙動を維持する。
- 改善目的だけの変更は、今回の主スコープにしない。
- 非採用になる可能性が高い案も、後から判断材料にできるように残す。
- 採用する場合は、目的、影響範囲、migration note の要否を確認する。

## metadata validation の強化

- 種別: 機能改善
- 背景: `metadata.json` は custom element 名、parameter 変換、menu、help preview に影響する。
- 改善案: build / serve 開始時に `metadata.json` を validate し、Stanza id と file path を含む分かりやすい error を出す。
- 採用候補:
  - `metadata["@id"]` と stanza directory 名の不一致を error にする。
  - `stanza:parameter` の key / type / example を検査する。
  - boolean / number / json など runtime 変換に関わる type を検査する。
- 注意: 既存の正しい metadata は壊さない。現行で曖昧に通っていた不正入力は warning/error になる可能性がある。
- 今回スコープ: 必要性が明確な validation だけ採用し、広範な schema 整備は後続判断にする。

## 診断メッセージの整理

- 種別: 機能改善
- 背景: 現行版では Sass deprecation warning、help preview の fetch 失敗、環境由来 error が分かりにくい場合がある。
- 改善案: error / warning に対象 Stanza id、file path、修正すべき内容を含める。
- 採用候補:
  - validation error
  - migration warning
  - preview warning
  - environment warning
- 注意: CLI 出力文言そのものは互換対象にしない。
- 今回スコープ: ツールチェーン更新で自然に改善される範囲を優先し、独自診断の作り込みは後続判断にする。

## framework support の拡張

- 種別: 機能改善
- 背景: 現行 Tips には React / Vue / Svelte の例がある。
- 改善案: Vite 8 ベースで framework support を整理する。
- 採用候補:
  - React / TSX は `TogoMedium Stanza` 互換のため重点対応する。
  - Vue は `metastanza` 互換のため重点対応する。
  - Svelte など実プロジェクトで未確認の framework は follow-up として扱う。
- 注意: 新規公式対応を広げることは今回の主目的ではない。

## 旧設定ファイルの有効性確認

- 種別: 追加調査
- 背景: `metastanza` には `togostanza-build.mjs` があり、`TogoMedium Stanza` には `togostanza-build.js` がある。旧調査では、現行版は `.mjs` 固定で読み、`.js` は有効ではなかった可能性が指摘されている。
- 確認案:
  - 現行版が実際に読む設定ファイル名を、実装と実行観測で確認する。
  - `metastanza` の `togostanza-build.mjs` が現行 build に影響しているか確認する。
  - `TogoMedium Stanza` の `togostanza-build.js` が現行 build で有効だったか確認する。
- 注意: リメイク版では旧設定ファイルを無条件実行しない。検出したうえで、migration note へ誘導する。
- 今回スコープ: 詳細な変換仕様や codemod は実装時判断にする。

## `stanza:include` の扱い

- 種別: 追加調査
- 背景: 現行版には、metadata の共通パラメータ定義を `stanza:include` で展開する仕組みがある。
- 確認案:
  - 実プロジェクトでの使用有無を確認する。
  - 現行 docs / tests での使用例を確認する。
  - 相対パス、package 解決、include 後の metadata 出力の現行挙動を必要に応じて観測する。
- 注意: 現時点では `必須` / `再設計` / `破棄` を確定しない。
- 今回スコープ: 現行機能として認識し、扱いは追加調査後に決める。

## alias 互換の扱い

- 種別: 実装時判断
- 背景: 現行版には alias 的挙動があり、実プロジェクトでは tsconfig paths や独自 import prefix も観測されている。
- 確認案:
  - 既存 Stanza source が使っている alias を実プロジェクトごとに確認する。
  - Vite の標準 `resolve.alias` や tsconfig paths で吸収できる範囲を確認する。
  - 互換 layer が必要か判断する。
- 注意: 独自 alias 全廃は現時点では採用しない。既存 Stanza source が壊れないことを優先する。
- 今回スコープ: alias 合成順や Vite 設定の詳細は固定しない。

## serve の埋め込み検証

- 種別: 実装時確認
- 背景: Stanza の Web Component は、一般的な Web サイトへ直接埋め込めることを前提にする。`serve` は help preview だけでなく、別のローカルページや別アプリから runtime script を読み込む確認にも使える必要がある。
- 確認案:
  - 一般 Web サイトに近い HTML から `<script type="module" src=".../{id}.js">` と `<togostanza-{id}>` で動くことを確認する。
  - ローカルの別ページや別アプリから `serve` 中の `{id}.js` を読み込めることを確認する。
  - TogoMedium のような Web アプリ埋め込みを regression test に含める。
- 注意: CORS、HMR、watch、livereload、Vite dev server の使い方は今決めない。

## asset 処理の詳細

- 種別: 実装時判断
- 背景: 現行版には、公開 assets のコピーと Stanza source からの asset import がある。
- 確認案:
  - 既存 Stanza source からの asset import が壊れないことを確認する。
  - repository root `assets/` と stanza 個別 `assets/` の公開 path を確認する。
  - metastanza / TogoMedium の asset 使用状況を見て実装方式を判断する。
- 注意: data URL inline、別ファイル emit、hash 名、size threshold などの詳細は今固定しない。既存 source や HTML が参照する path を壊す場合は migration note が必要。

## help preview の改善

- 種別: 機能改善
- 背景: 現行 help preview は metadata example から custom element を生成する。存在しない example URL を fetch すると、ブラウザ console の JSON parse error になる場合がある。
- 改善案: preview 上で example の読み込み失敗を分かりやすく表示する。
- 注意: help preview は runtime 埋め込みとは別物であり、UI や実装技術は再設計可能。
- 今回スコープ: `serve` がローカル preview を提供する目的は維持し、UI 改善は後続判断にする。

## 細かい CLI error code

- 種別: 機能改善
- 背景: 現行は成功 `0`、失敗 `1` が基本。
- 改善案: validation error、config error、build error などに error code を分ける。
- 注意: CI 互換として重要なのは、成功 `0` / 失敗 non-zero を維持すること。
- 今回スコープ: 細かい error code 分類は扱わない。
