# 001 CLI scaffold and generate

## 目的

`togostanza init` と `togostanza generate stanza` が、Stanza開発者にとって自然な入口として機能することを確認する。

## 対応する方針

- `togostanza init` は Stanza repository を作る入口として維持する。
- `generate stanza` は既存 Stanza source 互換を優先し、必要最小限の再設計に留める。
- 主要 command 名と短縮 alias は入口として維持する。
- `togostanza upgrade` は破棄する。

## 入力条件

- 空の作業ディレクトリから開始する。
- 現行版では `npx togostanza init` を使い、手作業で Stanza repository 構成を作らない。
- `references/` は変更しない。

## 現行版で観測すること

- `init` が作る repository scaffold。
- `generate stanza` が作る `stanzas/{id}/` 配下のファイル。
- id の kebab-case 化。
- `build` / `serve` / `generate stanza` へ進める初期状態かどうか。
- 短縮 alias `g stanza` の入口。

## リメイク版で観測すること

- `init` と `generate stanza` が同じ入口として使えること。
- 生成物が既存 Stanza source 互換を大きく外していないこと。
- 生成後に `build`、`serve`、追加の `generate stanza` が自然に動くこと。
- `upgrade` が提供されない、または明確に非対応として扱われること。

## 合格条件

- Stanza開発者が、既存の入口名で Stanza repository と Stanza source を作れる。
- 生成された Stanza source が `build` 対象になる。
- `stanzas/{id}/metadata.json`、`index.js`、`style.scss`、`templates/stanza.html.hbs` が確認できる。
- 生成内容の差分がある場合、理由と移行メモの要否が説明できる。

## 記録する差分

- 生成ファイル一覧。
- `package.json` の依存、script、package manager 周辺。
- README、workflow、git 初期化など、開発支援寄りの差分。
- stdout / stderr の代表ログ。

## 未決定事項

- リメイク版 generator で `index.ts` / `index.tsx` 生成 option を用意するか。
- README 生成内容をどこまで維持するか。
