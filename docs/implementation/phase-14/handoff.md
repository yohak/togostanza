# Phase 14: Menu UI polish 引き継ぎ

## 完了したこと

- runtime組み込みcustom elementとして `<togostanza--menu>` を復元した。
- `<main>` とmenuを同じ `position: relative` のコンテナへ置き、`this.root.querySelector("main")` と `main.parentNode instanceof HTMLElement` を維持した。
- `top-left`、`top-right`、`bottom-left`、`bottom-right`、`none` のplacementを扱う。
- `metadata["stanza:menu-placement"]` と `togostanza-menu-placement` を扱い、`togostanza-menu_placement` は復活させていない。
- 固定SVGのinfo icon、popup、再クリック、`Escape`、外側clickによる開閉を実装した。`Escape` は開いているpopupだけを閉じ、そのmenu buttonへfocusを戻す。
- `this.menu()` のitem / dividerを表示し、item click後にhandlerを呼び出してpopupを閉じる。
- Copy HTML snippetに、registration由来のmodule script URLと現在のcustom element `outerHTML` を使う。
- About linkを `${id}.html`、`target="_blank"`、`rel="noopener noreferrer"` で出力する。
- Lit、Popper、Primer Octicons packageは追加していない。

info iconはPrimer Octiconsの `info-16` を固定SVGとしてruntimeへ同梱した。出典、MIT License、copyrightはSVG pathの近くに記録している。

## 検証したこと

- hermetic browser test:
  - custom element登録と重複登録安全性。
  - `<main>` とmenuの同一コンテナ配置。
  - 4 placementと `none`。
  - 対角2配置の実座標。
  - 外側 `togostanza--menu` styleの適用。
  - info icon、popup開閉、`Escape`、外側click。複数Stanzaで開いていたmenu buttonへのfocus復帰と、閉状態でのfocus非干渉。
  - item / divider、handler、menu再評価。
  - Copy HTML snippetのbundle URLとcurrent `outerHTML`。
  - About link。
- `test:compat:local`:
  - `references/togostanza-utils` の実packageが返すdownload itemの表示とhandler呼び出し。
  - metastanza `linechart` のDownload SVG / PNG / JSON / CSV / TSV item表示。
  - metastanza全10 Stanza、TogoMedium Stanza全15件、TogoMedium Web routeの既存smoke。

## 実装上の境界

- popupはCSSで配置し、画面端の自動flipは行わない。
- menu内部のDOM構造、class名、id、見た目は外部契約として固定しない。
- Clipboard APIが利用できない場合はwarningを出してmenuを閉じ、Stanza描画は継続する。
- download helperはhandler呼び出しまで確認し、保存ファイルの内容比較は行っていない。

## 確認コマンド

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
git diff --check
```
