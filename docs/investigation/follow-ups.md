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
