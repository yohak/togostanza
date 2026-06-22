# 開発用ノート

この文書では、仕様やリメイク方針ではなく、このリポジトリで作業するときの考え方や注意点を扱う。

記録が増えた場合は、中期的に `docs/development-notes/` ディレクトリへ分割する。

## 基本方針

本プロジェクトは Node.js ベースで進める。検証手順、README、作業メモに書くコマンドは、原則として Node.js / npm / pnpm / mise / 対象 CLI に揃える。

Python 系のツールは、ローカルで手軽に使える場合でも標準手順にしない。標準手順は、README や検証ケースを読む人が同じ実行環境を再現できることを優先する。

## 実行環境は mise で揃える

Node.js、npm、pnpm の実行は、原則として `mise` を通す。現行版確認では `current/mise.toml` や `current-npm/mise.toml`、リメイク版確認では `remake/mise.toml` のように、対象環境ごとに Node version と package manager version を固定する。

case 直下に `mise.toml` を置くと、その case 内の複数の検証環境へ影響する。複数環境で同じ Node version に固定したい場合以外は、対象環境ごとの `mise.toml` を使う。

`mise exec node@18 -- ...` のように command 側で tool version を指定する形は標準手順にしない。Node version や pnpm version は、検証環境の `mise.toml` に書いてから `mise exec -- ...` で実行する。

コマンド例を書くときは、対象ディレクトリの `mise.toml` を前提に、次の形を基本にする。

```sh
mise exec -- node -v
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

`node`、`npm`、`npx` を直接実行する例は、Node version や環境差分が確認対象でない限り書かない。

### `mise trust` の扱い

対象ディレクトリの `mise.toml` は、通常の `mise trust` で信頼済みにできるべきものとして扱う。権限周りは `.codex/rules` と Codex 側の writable root 設定で解決する前提にする。

`mise trust` が権限エラーで失敗する場合は、観測対象の CLI 挙動ではなく、Codex 実行環境の設定不備として切り分ける。次のような迂回は標準手順にしない。

- `MISE_STATE_DIR=/private/tmp/...` で今回だけ trust store を逃がす。
- `mise` を通さず `node` / `npm` / `npx` を直接実行する。
- 毎回 unsandboxed または escalated 実行で `mise trust` を通す。

`mise exec` が次の warning を出しても、command 自体が成功している場合は現行版CLIの挙動として扱わない。

```text
tracking config: failed to ln -sf ... /Users/.../.local/state/mise/tracked-configs/...: Operation not permitted
```

これは Codex sandbox から mise の user state へ tracking symlink を作れないことによる warning として扱う。

## Codexで現行版を観測するときの注意

Codex の managed exec と、ユーザーの通常ターミナルまたは Codex の unsandboxed 実行では、同じ command でも環境差が出ることがある。差分が出た場合は、まず「現行版CLIの一般的な挙動」か「Codex実行環境の制約」かを分ける。

### `build` / `serve` の watcher error

現行版CLIの `build` / `serve` は Broccoli watcher を初期化する。Codex の sandboxed exec では、1回限りの `build` でも次の error で失敗する場合がある。

```text
Error: EMFILE: too many open files, watch
```

この error が出た場合は、sandboxed exec で粘らず、同じ command を許可済みの unsandboxed 実行で切り分ける。unsandboxed 実行で成功した場合、現行版CLIの一般的な失敗ではなく、Codex実行環境差として記録する。

### `npm install` の失敗

`npm install` が npm の cache、store、設定ディレクトリ、権限、network sandbox などの理由で失敗した場合は、現行版CLIや観測補助の失敗と混同しない。

```text
Your cache folder contains root-owned files
```

このような失敗が出た場合、cache path、store、設定ディレクトリ、環境変数、実行場所をその場だけ変えて通常手順の代替にしない。まず次を確認する。

- 実行した command。
- 実行場所。
- 対象 case の `package.json` / lockfile / `mise.toml`。
- npm cache や user state の権限問題かどうか。
- network sandbox による名前解決や外部通信の失敗かどうか。

原因切り分けのために通常手順外の一時実験を行った場合でも、その結果だけで成功、完了、検証済みとして扱わない。完了前の確認は、リポジトリに定義された通常の開発手順で行う。

途中で失敗した `npm install` は `node_modules/` を中途半端な状態にすることがある。対象に `package-lock.json` がある場合は、lockfile を正として `node_modules` を作り直す `npm ci` を有力な復旧候補として扱う。

`npm ci` は cache、store、設定ディレクトリ、環境変数、実行場所をその場だけ変える迂回とは別に扱う。lockfile がある case で `npm ci` を使った場合は、「lockfile からの clean install」として記録する。

lockfile がない場合は、`npm ci` を使えない。通常手順をどう整えるか、または lockfile を case 入力として追加するかを確認する。

### `npx` が待ち続ける場合

`node_modules` が中途半端な状態で `mise exec -- npx togostanza ...` を実行すると、local install 済みの `togostanza` が見つからず、`npx` が解決や取得を試みて待ち続ける場合がある。

この場合は `node_modules/.bin/togostanza` の有無を確認し、依存関係を復元してから再実行する。

### localhost サーバ

ブラウザ観測のために Node.js の一時HTTPサーバを起動すると、sandboxed exec では `listen EPERM` になる場合がある。

```text
Error: listen EPERM: operation not permitted 0.0.0.0:4173
```

この場合は、ブラウザ確認に必要な localhost server として許可済みの unsandboxed 実行に切り替える。起動した server は、確認後に必ず停止する。

### in-app browser の read-only 評価

in-app browser の `evaluate` は DOM 読み取りには使えるが、任意の DOM mutation や page global への書き込みは制限される場合がある。

次のような操作は、観測手段として安定しない。

- `document.querySelector(...).setAttribute(...)` を `evaluate` 内で直接呼ぶ。
- `window.__lastActionName = ...` のように page global を追加する。
- `window.parameterProbeObserver` のような page 側 global helper を `evaluate` から呼ぶ。
- `javascript:` URL で mutation を起こす。

attribute mutation をブラウザで観測したい場合は、観測補助HTMLに操作ボタンを置き、実ページ上の user interaction として mutation を発火できるようにする。

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

- 検証環境ごとに Node version が変わりうるため、Node 固定が必要なコマンドは対象ディレクトリ内で実行する。
- `references/` は読み取り対象として扱い、試行錯誤で汚さない。
- `node_modules/`、`dist/`、cache、一時ログは Git 管理しない。
