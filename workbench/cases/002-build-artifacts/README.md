# 002 Build artifacts

## 目的

`togostanza build` が、Stanza利用者の埋め込みに必要な runtime artifact と、Stanza開発者が期待する生成物配置を作ることを確認する。

## 対応する方針

- `togostanza build` / `togostanza b` は入口として維持する。
- `build --output-path` は維持候補として扱う。
- runtime 用の主要 artifact 配置は利用契約として維持する。
- help preview 側生成物は再設計可能とする。

## 入力条件

- このケースの `current/` と `remake/` に同等の Stanza repository を用意する。
- 少なくとも1つの basic stanza と、runtime 観測用 stanza を含める。
- repository root の `assets/` と stanza 個別 `assets/` を含める。

## 現行版で観測すること

- `build --output-path dist` の成功 / 失敗。
- `dist/` 配下の主要 artifact。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、`${id}/assets/*`。
- repository root `assets/` から `dist/assets/` へのコピー。
- `${id}.js.map`、`index.html`、`-togostanza/help-app.js` など開発支援寄り生成物。

## リメイク版で観測すること

- 同じ入力から、利用契約上必要な artifact が生成されること。
- `{id}.js` と共有 chunk 一式が、`dist/` 内で相対 import により自己完結すること。
- `${id}.html` が存在すること。
- help preview 側生成物が変わる場合、runtime artifact との差分が説明できること。

## 合格条件

- 一般Webサイトから読み込むための module script と custom element 用 artifact が揃う。
- `${id}.css` が生成される。
- `${id}/metadata.json` が生成される。
- asset 参照が壊れていない。
- source map の有無は必須互換にしない。

## 記録する差分

- `dist/` tree の一覧。
- 主要 artifact の path。
- shared chunk の有無。
- help preview 関連生成物の差分。
- build 時の warning / error。

## 未決定事項

- asset の inline / emit / hash / threshold の詳細。
- help preview 生成物の最終構造。
