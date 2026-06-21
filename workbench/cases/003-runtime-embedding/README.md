# 003 Runtime embedding

## 目的

Stanza Web Component が、一般的なWebサイトへ直接埋め込めることを確認する。

## 対応する方針

- `type="module"` script と `<togostanza-{id}>` custom element による埋め込み形式は利用契約として必須。
- 埋め込み先Webサイトに Vite、React、Vue、npm install、追加 build step を要求しない。
- help preview の実装やUIは runtime 埋め込み形式とは別物として扱う。
- `serve` はローカル確認の入口として維持する。

## 入力条件

- build 済みの `dist/` を静的に配信できる状態にする。
- help preview ではない、最小のHTMLページを用意する。
- HTML は `<script type="module" src="./{id}.js">` と `<togostanza-{id}>` を直接書く。

## 現行版で観測すること

- module script が読み込まれること。
- custom element が定義されること。
- shadow root が `open` で作られること。
- Stanza ごとの CSS が shadow root 内に適用されること。
- help preview と直接埋め込みで挙動を混同しないこと。

## リメイク版で観測すること

- 同じHTMLで custom element が動くこと。
- 埋め込み先が追加 build step を持たなくても動くこと。
- framework runtime が必要な場合も Stanza 配布物側に含まれていること。
- shared chunk がある場合、静的ホスティング上の相対 import で動くこと。

## 合格条件

- `<togostanza-{id}>` がブラウザ上で描画される。
- shadow root と stylesheet が確認できる。
- console に致命的な module load error が出ない。
- help preview のUIに依存せず確認できる。

## 記録する差分

- 確認URL。
- HTML snippet。
- network request の主要 path。
- browser console の warning / error。
- shadow root と描画結果の観測メモ。

## 未決定事項

- `serve` の CORS、HMR、watch、livereload の詳細。
- in-app browser 以外のブラウザ検証をどの段階で行うか。
