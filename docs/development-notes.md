# 開発用ノート

この文書では、仕様やリメイク方針ではなく、このリポジトリで作業するときの考え方や注意点を扱う。

記録が増えた場合は、中期的に `docs/development-notes/` ディレクトリへ分割する。

## 基本方針

本プロジェクトは Node.js ベースで進める。検証手順、README、作業メモに書くコマンドは、原則として Node.js / npm / mise / 対象 CLI に揃える。

Python 系のツールは、ローカルで手軽に使える場合でも標準手順にしない。標準手順は、README や検証ケースを読む人が同じ実行環境を再現できることを優先する。

## 実行環境は mise で揃える

Node.js や npm の実行は、原則として `mise` を通す。現行版確認では `current/mise.toml`、リメイク版確認では `remake/mise.toml` のように、対象環境ごとに Node version を固定する。

case 直下に `mise.toml` を置くと `current/` と `remake/` の両方へ影響する。両者で同じ Node version に固定したい場合以外は、対象環境ごとの `mise.toml` を使う。

コマンド例を書くときは、対象ディレクトリの `mise.toml` を前提に、次の形を基本にする。

```sh
mise exec -- node -v
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

`node`、`npm`、`npx` を直接実行する例は、Node version や環境差分が確認対象でない限り書かない。

## Python 系ツールを標準手順にしない

次のようなコマンドは標準手順として書かない。

```sh
python3 -m http.server 4173
```

代替手段は、確認したい対象に合わせて選ぶ。

- 現行版CLIの確認入口として `mise exec -- npx togostanza serve` を使う。
- build artifact だけを静的配信したい場合は `mise exec -- node ...` で Node.js の簡易HTTPサーバを使う。
- 同じ確認が繰り返し必要になったら、長い one-liner ではなく Node.js の小さな補助スクリプト化を検討する。

## コマンド例を書くときの注意

- `current/` と `remake/` で Node version が変わりうるため、Node 固定が必要なコマンドは対象ディレクトリ内で実行する。
- `references/` は読み取り対象として扱い、試行錯誤で汚さない。
- `node_modules/`、`dist/`、cache、一時ログは Git 管理しない。
