# 008 Real project regression

## 目的

`metastanza` と `TogoMedium Stanza` を使い、実プロジェクトで重要な互換性を確認する。

## 対応する方針

- 実プロジェクト群は互換性判断の強い根拠として扱う。
- `metastanza` は可能な限り固定点として扱うが、must ではない。
- `TogoMedium Stanza` は検証と発見のための実プロジェクトとして扱う。
- 既存 Stanza source は可能な限り変更しない。

## 入力条件

- `references/metastanza` と `references/togomedium-web` は直接汚さない。
- 実プロジェクト全体は、このケース配下へ丸ごとコピーしない。
- 必要な場合は、このケースの `current/` と `remake/` に、対象 Stanza または埋め込み条件の最小再現だけを作る。
- 実プロジェクト側の build / serve 手順は、各リポジトリの調査メモと照合する。

## 現行版で観測すること

- `metastanza` の Stanza source、metadata、設定、生成物。
- `TogoMedium Stanza` の React / TSX、alias、埋め込み側との関係。
- 実プロジェクトで `this.root`、`main`、`togostanza--menu` 周辺に依存している箇所。
- asset、style、help page、metadata の利用実態。

## 最初に確認する観点

### metastanza

- `references/metastanza/stanzas/*` のうち、まず `text`、`pagination-table`、`barchart`、`scroll-table` を優先して見る。
- `this.root.querySelector("main")` に依存する描画先の構造。
- `importWebFontCSS()` の利用。
- `stanza:type` の種類と `this.params` への反映。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、`-togostanza/*` の生成物配置。
- root asset と stanza-local asset の参照。

### TogoMedium Stanza

- `references/togomedium-web/@packages/stanza` を主対象とする。
- `components/providers/StanzaReactProvider.tsx` の `importWebFontCSS()`、`this.root.querySelector("main")`、`handleAttributeChange()`。
- TSX Stanza と React runtime を配布物へ含める前提。
- `togostanza-build.js` は、現行版で実際に読まれるかを別途確認する。読まれない場合は、設定互換ではなく migration note 候補として扱う。
- Web 側から Stanza 生成物を読む経路と、querySelector など DOM 構造への依存。

## コピー方針

- `references/` は読み取り専用の観測対象とする。
- `current/` には、現行版で観測した結果、対象リスト、最小 fixture の作り方を置く。
- `remake/` には、リメイク版で同じ観点を確認するための fixture または migration note 候補を置く。
- 実プロジェクトの `node_modules/`、`dist/`、巨大な source tree はコピーしない。
- 必要になった場合のみ、対象 Stanza 1つから数個分の source、metadata、fixture HTML、最小 package をコピーする。
- コピーした場合は、README に元パス、コピー理由、削った範囲を記録する。

## リメイク版で観測すること

- 既存 Stanza source の変更量。
- 必要な migration note。
- build / runtime / embedding の通過可否。
- 見た目と DOM の regression。
- TogoMedium 側で調整可能な範囲と、TogoStanza側で吸収すべき範囲。

## 合格条件

- `metastanza` が大きな手修正なしで通る、または外す理由が明確である。
- `TogoMedium Stanza` の主要 Stanza が、説明可能な調整範囲で通る。
- 実プロジェクトで観測された重要な依存が、仕様または migration note に反映される。
- 一般 Web サイトから `<script type="module">` と custom element で読み込める前提が崩れていない。
- フレームワークや Stanza 内部依存を、埋め込み先 Web サイトへ npm install させない。

## 記録する差分

- 対象 Stanza 一覧。
- source 変更の有無。
- build 結果。
- runtime 確認結果。
- DOM / style / menu の差分。
- migration note 候補。

## 許容する source 変更

- 既存 Stanza source は可能な限り変更しない。
- 小規模な import path 調整、設定ファイル移行、明らかな toolchain 起因の修正は許容候補とする。
- runtime API の欠落、DOM 構造の破壊、`this.params` 互換の不足、`this.query()` 互換の不足を Stanza source 側の大きな書き換えで吸収しない。
- TogoMedium 側で自然に調整できる内容でも、TogoStanza 側で吸収すべき互換性かどうかを migration note に分けて記録する。

## 想定コマンド

現行版の重い build は、このケースでは最初から必須にしない。まず読み取り専用の観測と最小 fixture 化を行い、必要になったら個別に実行する。

```sh
rg -n "this\\.root|querySelector|importWebFontCSS|handleAttributeChange|this\\.query\\(|stanza:type" references/metastanza references/togomedium-web/@packages/stanza references/togomedium-web/@packages/web/src
find references/metastanza/stanzas -maxdepth 2 -type f
find references/togomedium-web/@packages/stanza/stanzas -maxdepth 3 -type f
```

最小 fixture を作った後の build / runtime 確認は、`current/README.md` と `remake/README.md` にケース別に記録する。

## 未決定事項

- 実プロジェクトをどこまで自動回帰テストに入れるか。
- visual regression の導入時期。
- TogoMedium 側で調整する範囲。
- metastanza から最初に fixture 化する Stanza。
- TogoMedium Stanza のうち、最初に fixture 化する TSX Stanza。
