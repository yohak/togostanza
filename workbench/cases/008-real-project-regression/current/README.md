# Current fixture plan

このディレクトリは、現行版 TogoStanza で実プロジェクト回帰を確認するための軽量な計画と最小 fixture を置く場所。

`references/metastanza` と `references/togomedium-web` は読み取り専用として扱い、ここへ実プロジェクト全体をコピーしない。

## 最初に見る対象

### metastanza

- `references/metastanza/stanzas/text`
  - `importWebFontCSS()` と `this.root.querySelector("main")` の基本確認。
- `references/metastanza/stanzas/pagination-table`
  - boolean を含む `stanza:type`、table UI、`togostanza--menu` 周辺 style の確認。
- `references/metastanza/stanzas/barchart`
  - 多数の number / color / single-choice parameter と chart asset の確認。
- `references/metastanza/stanzas/scroll-table`
  - scroll table と多数 parameter の確認。

### TogoMedium Stanza

- `references/togomedium-web/@packages/stanza/components/providers/StanzaReactProvider.tsx`
  - React mount target、`importWebFontCSS()`、`handleAttributeChange()` の確認。
- `references/togomedium-web/@packages/stanza/stanzas/gmdb-component-detail`
  - 小さめの TSX Stanza 候補。
- `references/togomedium-web/@packages/stanza/stanzas/gmdb-roundtree`
  - `stanza.root` と DOM event / generated HTML 依存の確認。
- `references/togomedium-web/@packages/stanza/stanzas/gmdb-medium-builder`
  - 大きい実運用 Stanza。最初から fixture 化せず、後段の負荷確認対象にする。

## コピーと最小化の方針

- 最初はコピーせず、参照元を `rg` / `find` / `sed` で観測する。
- fixture 化する場合は、対象 Stanza 単位で source、metadata、必要最小の shared component だけをコピーする。
- `node_modules/`、`dist/`、実プロジェクト全体、Storybook 一式はコピーしない。
- shared component や alias が多すぎる場合は、コピーで無理に解決せず、alias / workspace integration の migration note 候補として記録する。

## 期待する確認

- 現行版生成物に `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json` が存在すること。
- `-togostanza/` 配下の help / index runtime helper が存在すること。
- Stanza source が `this.root.querySelector("main")` を描画先として使えること。
- `importWebFontCSS()` と `handleAttributeChange()` が現行 Stanza source で使われていること。
- `stanza:type` が metadata に定義され、`this.params` の変換対象になること。
- TogoMedium の TSX / React runtime は、埋め込み先 Web サイトではなく Stanza 配布物側に閉じる必要があること。

## 保留中のコマンド

```sh
rg -n "this\\.root|querySelector|importWebFontCSS|handleAttributeChange|this\\.query\\(|stanza:type" references/metastanza references/togomedium-web/@packages/stanza references/togomedium-web/@packages/web/src
find references/metastanza/stanzas -maxdepth 2 -type f
find references/togomedium-web/@packages/stanza/stanzas -maxdepth 3 -type f
```

必要になった場合だけ、対象を絞って `current/` に最小 package と Stanza source を作る。

## source 変更の扱い

- 既存 Stanza source は可能な限り変更しない。
- 変更なしで通らない場合は、まず TogoStanza 側の互換不足か、実プロジェクト固有の移行対象かを分ける。
- import path や config 名の小規模変更は migration note 候補。
- runtime API の不足を個別 Stanza の大きな書き換えで回避しない。
