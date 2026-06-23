# 開発用ノート

この文書では、仕様やリメイク方針ではなく、このリポジトリで作業するときの考え方や注意点を扱う。

記録が増えた場合は、中期的に `docs/development-notes/` ディレクトリへ分割する。

## 基本方針

本プロジェクトはNode.jsベースで進める。検証手順、README、作業メモに書くコマンドは、原則としてNode.js、npm、pnpm、mise、対象CLIに揃える。

Python系のツールは、ローカルで手軽に使える場合でも標準手順にしない。READMEや検証ケースを読む人が、同じ実行環境を再現できることを優先する。

## 実行環境はmiseで揃える

Node.js、npm、pnpmの実行は、原則として `mise` を通す。現行版確認では `current/mise.toml` や `current-npm/mise.toml`、リメイク版確認では `remake/mise.toml` のように、対象環境ごとにNode.jsバージョンとパッケージマネージャーバージョンを固定する。

case直下に `mise.toml` を置くと、そのcase内の複数の検証環境へ影響する。複数環境で同じNode.jsバージョンに固定したい場合以外は、対象環境ごとの `mise.toml` を使う。

`mise exec node@18 -- ...` のように、コマンド側でツールバージョンを指定する形は標準手順にしない。Node.jsバージョンやpnpmバージョンは、検証環境の `mise.toml` に書いてから `mise exec -- ...` で実行する。

コマンド例を書くときは、対象ディレクトリの `mise.toml` を前提に、次の形を基本にする。

```sh
mise exec -- node -v
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

`node`、`npm`、`npx` を直接実行する例は、Node.jsバージョンや環境差分が確認対象でない限り書かない。

### `mise trust` の扱い

対象ディレクトリの `mise.toml` は、通常の `mise trust` で信頼済みにできるべきものとして扱う。権限周りは `.codex/rules` とCodex側のwritable root設定で解決する前提にする。

`mise trust` が権限エラーで失敗する場合は、観測対象のCLI挙動ではなく、Codex実行環境の設定不備として切り分ける。次のような迂回は標準手順にしない。

- `MISE_STATE_DIR=/private/tmp/...` で今回だけtrust storeを逃がす。
- `mise` を通さず `node` / `npm` / `npx` を直接実行する。
- 毎回unsandboxed実行またはescalated実行で `mise trust` を通す。

`mise exec` が次の警告を出しても、コマンド自体が成功している場合は現行版CLIの挙動として扱わない。

```text
tracking config: failed to ln -sf ... /Users/.../.local/state/mise/tracked-configs/...: Operation not permitted
```

これはCodex sandboxからmiseのuser stateへtracking symlinkを作れないことによる警告として扱う。

## Codexで現行版を観測するときの注意

Codexのmanaged execと、ユーザーの通常ターミナルまたはCodexのunsandboxed実行では、同じコマンドでも環境差が出ることがある。差分が出た場合は、まず「現行版CLIの一般的な挙動」か「Codex実行環境の制約」かを分ける。

### `build` / `serve` のwatcherエラー

現行版CLIの `build` / `serve` はBroccoli watcherを初期化する。Codexのsandboxed execでは、1回限りの `build` でも次のエラーで失敗する場合がある。

```text
Error: EMFILE: too many open files, watch
```

このエラーが出た場合は、sandboxed execで粘らず、同じコマンドを許可済みのunsandboxed実行で切り分ける。unsandboxed実行で成功した場合は、現行版CLIの一般的な失敗ではなく、Codex実行環境差として記録する。

### `npm install` の失敗

`npm install` がnpmのキャッシュ、store、設定ディレクトリ、権限、network sandboxなどの理由で失敗した場合は、現行版CLIや観測補助の失敗と混同しない。

```text
Your cache folder contains root-owned files
```

このような失敗が出た場合、キャッシュpath、store、設定ディレクトリ、環境変数、実行場所をその場だけ変えて通常手順の代替にしない。まず次を確認する。

- 実行したコマンド。
- 実行場所。
- 対象caseの `package.json` / lockfile / `mise.toml`。
- npmキャッシュやuser stateの権限問題かどうか。
- network sandboxによる名前解決や外部通信の失敗かどうか。

原因切り分けのために通常手順外の一時実験を行った場合でも、その結果だけで成功、完了、検証済みとして扱わない。完了前の確認は、リポジトリに定義された通常の開発手順で行う。

途中で失敗した `npm install` は、`node_modules/` を中途半端な状態にすることがある。対象に `package-lock.json` がある場合は、lockfileを基準に `node_modules` を作り直す `npm ci` を有力な復旧候補として扱う。

`npm ci` は、キャッシュ、store、設定ディレクトリ、環境変数、実行場所をその場だけ変える迂回とは別に扱う。lockfileがあるケースで `npm ci` を使った場合は、「lockfileからのクリーンインストール」として記録する。

lockfileがない場合は、`npm ci` を使えない。通常手順をどう整えるか、またはlockfileをcase入力として追加するかを確認する。

### `npx` が待ち続ける場合

`node_modules` が中途半端な状態で `mise exec -- npx togostanza ...` を実行すると、local install済みの `togostanza` が見つからず、`npx` が解決や取得を試みて待ち続ける場合がある。

この場合は `node_modules/.bin/togostanza` の有無を確認し、依存関係を復元してから再実行する。

### localhostサーバ

ブラウザ観測のためにNode.jsの一時HTTPサーバを起動すると、sandboxed execでは `listen EPERM` になる場合がある。

```text
Error: listen EPERM: operation not permitted 0.0.0.0:4173
```

この場合は、ブラウザ確認に必要なlocalhostサーバとして、許可済みのunsandboxed実行に切り替える。起動したサーバは、確認後に必ず停止する。

### in-app browserのread-only評価

in-app browserの `evaluate` はDOM読み取りには使えるが、任意のDOM mutationやpage globalへの書き込みは制限される場合がある。

次のような操作は、観測手段として安定しない。

- `document.querySelector(...).setAttribute(...)` を `evaluate` 内で直接呼ぶ。
- `window.__lastActionName = ...` のようにpage globalを追加する。
- `window.parameterProbeObserver` のようなページ側global helperを `evaluate` から呼ぶ。
- `javascript:` URLでmutationを起こす。

属性変更をブラウザで観測したい場合は、観測補助HTMLに操作ボタンを置き、実ページ上のユーザー操作として変更を発火できるようにする。

## Python系ツールを標準手順にしない

次のようなコマンドは標準手順として書かない。

```sh
python3 -m http.server 4173
```

代替手段は、確認したい対象に合わせて選ぶ。

- 現行版CLIの確認入口として `mise exec -- npx togostanza serve` を使う。
- ビルド成果物だけを静的配信したい場合は、`mise exec -- node ...` でNode.jsの簡易HTTPサーバを使う。
- 同じ確認が繰り返し必要になったら、長いone-linerではなくNode.jsの小さな補助スクリプト化を検討する。

## コマンド例を書くときの注意

- 検証環境ごとにNode.jsバージョンが変わりうるため、Node.js固定が必要なコマンドは対象ディレクトリ内で実行する。
- `references/` は読み取り対象として扱い、試行錯誤で汚さない。
- `node_modules/`、`dist/`、キャッシュ、一時ログはGit管理しない。
