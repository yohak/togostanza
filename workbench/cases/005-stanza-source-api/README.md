# 005 Stanza source API

## 目的

既存 Stanza source が依存している Stanza base API を確認する。

## 対応する方針

- 既存 Stanza source は、可能な限り変更しない。
- `import Stanza from "togostanza/stanza"` と `export default class Xxx extends Stanza` を維持する。
- `this.params`、`this.root`、`this.element`、`this.renderTemplate`、`this.query`、`this.importWebFontCSS`、`this.handleAttributeChange` を維持する。
- Handlebars template を維持する。

## 入力条件

- 代表的な Stanza source を用意する。
- `templates/*.hbs`、`style.scss`、`index.js` を使う。
- 必要に応じて `index.ts`、`index.tsx` の検証 stanza を追加する。

## 現行版で観測すること

- `this.root.querySelector("main")` が使えること。
- `this.element` が custom element を指すこと。
- `this.renderTemplate({ template, parameters })` が使えること。
- method 未指定の `this.query()` が `POST` になること。
- `this.importWebFontCSS(cssUrl)` の注入結果。
- `this.handleAttributeChange(name, oldValue, newValue)` の呼ばれ方。

## リメイク版で観測すること

- 同じ Stanza source が小規模な手修正なし、または説明可能な手修正だけで動くこと。
- `this.root` と `main` 参照が実プロジェクトで壊れないこと。
- `this.query()` の既定 method が `POST` であること。
- lifecycle hook と template rendering が維持されること。

## 合格条件

- 既存 Stanza source API が同じ名前で利用できる。
- `this.query()` の既定 method が維持される。
- `renderTemplate` と Handlebars template が動く。
- `importWebFontCSS()` と `handleAttributeChange()` が呼び出し可能である。

## 記録する差分

- Stanza source の変更有無。
- API ごとの観測結果。
- browser console / network request。
- template rendering の出力。
- lifecycle hook の呼び出し順。

## 未決定事項

- `importWebFontCSS()` の link 注入先と重複制御。
- `handleAttributeChange()` の既定再描画や debounce の詳細。
