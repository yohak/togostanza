# Remake fixture plan

このディレクトリは、008 の現行版観測をリメイク版へ持ち込むときの fixture と migration note 候補を置く場所。

現時点では、実プロジェクト source のコピーは行わない。`current/README.md` で対象を絞った後、同じ対象をリメイク版で確認する。

## 確認すること

- metastanza の代表 Stanza が、大きな source 変更なしで build / runtime 確認できるか。
- TogoMedium の TSX Stanza が、埋め込み先 Web サイトへ npm install や bundler を要求せずに配布物として動くか。
- `this.root`、`this.params`、`this.query()`、`importWebFontCSS()`、`handleAttributeChange()` が既存 source に対して維持されているか。
- `${id}.js`、`${id}.css`、`${id}.html`、`${id}/metadata.json`、`-togostanza/*` の扱いが説明可能か。
- `togostanza-build.js` や alias / workspace integration が、互換維持対象か migration note 対象か。

## migration note 候補

- 現行版で実際に読まれない設定ファイルは、自動実行せず検出と案内に寄せる。
- alias 解決は、既存 source をできるだけ変えない方向で確認し、過度な互換層が必要なら migration note に分ける。
- React / TSX runtime は Stanza 配布物側に含める。埋め込み先に framework install を要求する形にはしない。
- DOM 構造に依存する実プロジェクトが見つかった場合は、テスト対象として記録する。

## 保留中のコマンド

リメイク版実装が入ってから、`current/` と同じ対象に対して build / runtime 確認を行う。

```sh
# placeholder: remake CLI が利用可能になってから確定する
```
