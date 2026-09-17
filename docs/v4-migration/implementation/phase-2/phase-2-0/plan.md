# Phase 2-0: preflight / repo detection 設計

Phase 2-0は、Phase 1で後続送りにした `init` 周辺の必須follow-upと、`build` 前提のStanzaリポジトリ検出を整えるサブフェーズである。

このサブフェーズでは、`build` の生成物やランタイムは実装しない。後続のPhase 2-1で `build` 実装に入る前に、CLIがどのディレクトリをStanzaリポジトリとして扱うか、どのパッケージマネージャーを使うか、どの入力を分かりやすく拒否するかを固定する。

## 目的

- `init .` と空ディレクトリ再利用の扱いを決める。
- 既存ディレクトリへのmergeや上書きをPhase 2-0の対象にするかを明確にする。
- `init .` の対象rootで、lockfileからのパッケージマネージャー推定を実装できる状態にする。
- lockfile同時存在や `--package-manager` 指定矛盾を診断できる状態にする。
- `build`、`generate stanza`、将来の `serve` が共有できるStanzaリポジトリroot判定を用意する。
- Phase 2-1へ渡すStanza repo contextの最小形を決める。

## 完了条件

- `init .` が、空ディレクトリまたは許容済みpreflight markerだけを持つディレクトリをStanzaリポジトリとして初期化できる。
- `init --name <dir>` の既存挙動を壊さない。
- 許容済みpreflight marker以外の既存pathを持つディレクトリに対しては、mergeや上書きをせず分かりやすく失敗する。
- `package-lock.json` がある場合は `npm`、`pnpm-lock.yaml` がある場合は `pnpm` と推定できる。
- `package-lock.json` と `pnpm-lock.yaml` が同時に存在する場合は失敗する。
- `--package-manager` と既存lockfileが矛盾する場合は失敗する。
- `npm_config_user_agent` による推定は、lockfileがない場合の後続候補として維持される。
- Stanzaリポジトリroot判定が、`build` と `generate stanza` から使える形で切り出されている。
- `build` はPhase 2-0では生成物を作らず、root判定に失敗した場合はpreflight診断、root判定に成功した場合は未実装診断としてnon-zeroを返す。
- unit test / integration testで診断と分岐を確認できる。

## 含めるもの

- `init .`。
- 空ディレクトリ、または許容済みpreflight markerだけを持つディレクトリへのscaffold。
- `init --name <dir>` の既存挙動維持。
- `init .` の対象rootにある既存lockfileによるパッケージマネージャー推定。
- lockfile同時存在の診断。
- `--package-manager` と既存lockfileの矛盾診断。
- Stanzaリポジトリroot判定。
- Stanza repo contextの最小型または内部データ構造。
- `generate stanza` 実行前のStanzaリポジトリroot確認。
- `build` 実行前のStanzaリポジトリroot確認。
- 診断のunit test / integration test。

## 含めないもの

- 既存ファイルがあるディレクトリへのmerge。
- 上書きoption。
- 非空ディレクトリの一部だけを補完するscaffold。
- `.gitignore`、`README.md`、`LICENSE` などを既存ファイルとして許容するmerge。
- bare `init` のprompt対応。
- `build` の生成物作成。
- Stanza検出、metadata検証、entrypoint解決。
- `togostanza.config.ts` の生成や読み込み。
- 実インストール確認。
- GitHub Pages workflow placeholderの実deploy workflow化。

## `init .` の方針

`init .` は、現在の作業ディレクトリをStanzaリポジトリとして初期化する入口として扱う。

Phase 2-0では、対象ディレクトリが空、または許容済みpreflight markerだけを持つ場合に成功させる。許容済みpreflight markerは、パッケージマネージャー推定に使うlockfileと、既存git初期化を示す `.git/` とする。

`.git/` だけが存在する場合は、`--skip-git` がない場合も既存 `.git/` を壊さない。lockfileだけが存在する場合は、パッケージマネージャー推定と矛盾診断に使い、scaffoldの衝突とは扱わない。

`init .` では、`package.json.name` をディレクトリ名から作る。`init . --name <name>` が指定された場合は、現在のディレクトリへscaffoldし、`--name` の値を `package.json.name` として使う。`init . --name <name>` の `--name` は生成先ディレクトリではなくpackage名の上書きとして扱う。

ディレクトリ名がpackage名として不正で、`--name` も指定されていない場合はエラーにする。`--name` が指定されている場合は、その値をPhase 1と同じpackage名validationに通す。

`init --name <dir>` は、Phase 1と同じく新規子ディレクトリを作る入口として維持する。既存ディレクトリがある場合は、空ディレクトリでも失敗する。既存ディレクトリを使いたい場合は `cd <dir>` して `init .` を使う。

## 既存ディレクトリの扱い

Phase 2-0では、既存ファイルとのmergeや上書きは行わない。

次の状態では失敗する。

- `package.json` がすでにある。
- `stanzas/` がすでにある。
- `.github/workflows/publish.yml` がすでにある。
- `assets/`、`lib/`、`common.scss`、`README.md` など、scaffoldが作るpathと衝突する。

`package-lock.json`、`pnpm-lock.yaml`、`.git/` は、Phase 2-0ではpreflight markerとして扱う。ただし、lockfile同時存在や `--package-manager` との矛盾は別途診断する。

`.gitignore`、`README.md`、`LICENSE` だけがある「ほぼ空」のディレクトリでも、Phase 2-0ではmergeせず失敗する。これは `init .` の利用時に摩擦になるが、既存ファイルの本文維持、追記、上書き、差分表示の方針を決める必要があるため、Phase 2-0では既知制約として残す。

この失敗は、後続でmergeや補完を検討できるように、衝突したpathを診断へ含める。

## package manager推定

Phase 2-0では、パッケージマネージャー推定の優先順をリメイク版仕様に合わせる。

1. `--package-manager npm|pnpm`
2. 対象Stanzaリポジトリ内のlockfile
3. `npm_config_user_agent`
4. `npm`

lockfileは次のように扱う。

| lockfile | 推定 |
| -------- | ---- |
| `package-lock.json` のみ | `npm` |
| `pnpm-lock.yaml` のみ | `pnpm` |
| 両方あり | エラー |
| どちらもなし | `npm_config_user_agent` へ進む |

`--package-manager npm` が指定されていて `pnpm-lock.yaml` がある場合はエラーにする。`--package-manager pnpm` が指定されていて `package-lock.json` がある場合もエラーにする。

`init --name <dir>` は新規子ディレクトリ生成入口として扱うため、親ディレクトリのlockfileを推定材料にしない。lockfile推定と矛盾診断は、対象rootが現在のディレクトリである `init .` で行う。

## Stanzaリポジトリroot判定

Phase 2-0では、Stanzaリポジトリrootを次の最小条件で判定する。

- `package.json` がある。
- `package.json.dependencies.togostanza` または `package.json.devDependencies.togostanza` がある。

`stanzas/` の存在は、Phase 2-0では必須にしない。`generate stanza` は、まだstanzaがないリポジトリに最初のstanzaを作る入口でもあるためである。

このroot判定は宣言ベースであり、`node_modules/` 内で `togostanza` が実際に解決できるかは見ない。依存の実利用可能性、workspace / link / file参照の解決、`togostanza/stanza` runtime exportの確認は、Phase 2-1以降の `build` 実装で扱う。

`build` では、Stanzaリポジトリrootでない場合に分かりやすく失敗する。Phase 2-0では、Stanza検出や生成物作成へ進まず、root判定と診断だけを確認する。

Stanza repo contextは、少なくとも次の情報を持つ。

- root directory
- package.json path
- package name
- detected package manager
- lockfile path
- dependency spec for `togostanza`

このcontextは内部APIであり、外部仕様にはしない。

## commandごとの扱い

| command | Phase 2-0の扱い |
| ------- | --------------- |
| `init --name <dir>` | Phase 1の新規子ディレクトリ生成入口として維持する。親ディレクトリのlockfileは推定材料にせず、lockfile矛盾診断も行わない。 |
| `init .` | 空ディレクトリ、または許容済みpreflight markerだけを持つディレクトリをscaffoldする。 |
| `generate stanza <id>` | Stanzaリポジトリrootで実行されていることを確認してから生成する。 |
| `build` / `b` | Stanzaリポジトリroot判定を行う。root判定に成功しても生成物作成はPhase 2-1へ送り、Phase 2-0では未実装診断としてnon-zeroを返す。 |
| `serve` / `s` | Phase 3対象のため、Phase 2-0では変更しない。 |

## 診断方針

診断はstderrへ出す。文言の完全一致は互換対象にしないが、次の情報は含める。

- Stanzaリポジトリrootではないこと。
- 不足している `package.json`。
- `togostanza` dependencyがないこと。
- lockfileが同時存在していること。
- `--package-manager` とlockfileが矛盾していること。
- `init .` で衝突したpath。

CLIは成功時にexit code `0` を返す。失敗時はnon-zeroを返す。細かいerror code分類はPhase 2-0では扱わない。

## 実装メモ

- Phase 1の `handleInit` から、scaffold先の決定、package manager解決、lockfile診断を小さく分離する。
- `resolvePackageManager` は、対象rootと明示指定を受け取る関数へ広げる。
- Stanzaリポジトリroot判定は、`generate stanza` と `build` の両方から使えるモジュールに置く。
- `init --name <dir>` は既存ディレクトリを作る前にlockfileを見ない。新規子ディレクトリにはlockfileがないため、親ディレクトリのlockfileを推定材料にしない。
- `init .` は現在のディレクトリを対象rootとしてlockfileを見る。
- `generate stanza` は、Phase 1では任意のcwdに生成できたが、Phase 2-0以降はStanzaリポジトリrootでない場合に失敗させる。
- 既存の `generate stanza` 成功テストは、bareな一時ディレクトリではなく、Stanzaリポジトリrootを用意したうえで実行する形へ更新する。
- `build` handlerを追加する場合も、Phase 2-0ではroot判定後に「まだ生成物作成は未実装」と分かる診断に留め、exit codeはnon-zeroにする。

## 検証計画

### unit test

- `init .` が空ディレクトリをscaffoldする。
- `init . --name <name>` が現在のディレクトリへscaffoldし、`package.json.name` に `--name` の値を使う。
- `init .` が不正なディレクトリ名で、`--name` 未指定の場合に失敗する。
- `init .` が既存 `.git/` を壊さずscaffoldする。
- `init .` が既存lockfileをpackage manager推定に使う。
- `init .` が衝突pathを含む診断で失敗する。
- `init .` が既存 `.gitignore`、`README.md`、`LICENSE` をmergeせず衝突として扱う。
- `init --name <dir>` の既存挙動が維持される。
- `package-lock.json` だけなら `npm` を推定する。
- `pnpm-lock.yaml` だけなら `pnpm` を推定する。
- lockfileが両方ある場合は失敗する。
- `--package-manager npm` と `pnpm-lock.yaml` の矛盾で失敗する。
- `--package-manager pnpm` と `package-lock.json` の矛盾で失敗する。
- lockfileがない場合は `npm_config_user_agent` を見る。
- Stanzaリポジトリrootでない場所で `generate stanza` が失敗する。
- Stanzaリポジトリrootで `generate stanza` が成功する。
- 既存の `generate stanza` 成功テストは、Stanzaリポジトリrootを用意する形に更新されている。
- Stanzaリポジトリrootでない場所で `build` が失敗する。
- Stanzaリポジトリrootで `build` がroot判定を通った後、未実装診断としてnon-zeroで失敗する。

### integration test

- build後の `bin/togostanza.mjs` 経由で `init . --skip-install --skip-git` を空ディレクトリで実行し、雛形ファイルを確認する。
- `init . --name explicit-name --skip-install --skip-git` が、現在のディレクトリへ雛形を作り、`package.json.name` に `explicit-name` を書くことを確認する。
- `init . --skip-install` が既存 `.git/` を壊さないことを確認する。
- `init . --skip-install --skip-git` が既存lockfileをpackage manager推定に使うことを確認する。
- `init .` で既存 `package.json` がある場合に失敗する。
- `init . --package-manager npm --skip-install --skip-git` と既存 `pnpm-lock.yaml` の矛盾を確認する。
- `init . --package-manager pnpm --skip-install --skip-git` と既存 `package-lock.json` の矛盾を確認する。
- Stanzaリポジトリ外から `generate stanza` を実行すると失敗する。
- `init .` 後のStanzaリポジトリ内で `generate stanza` が成功する。
- Stanzaリポジトリ外から `build` を実行すると失敗する。
- `init .` 後のStanzaリポジトリ内で `build` を実行すると、root判定後に未実装診断として失敗する。

### 完了前確認

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。

## 後続へ送る事項

| 項目 | 回収先 |
| ---- | ------ |
| 非空ディレクトリへのmerge | 後続判断 |
| 上書きoption | 後続判断 |
| bare `init` のprompt対応 | Phase 2-0後のhandoff |
| lockfileだけがあるディレクトリをpreflight markerとして許容した制約の記録 | Phase 2-0後のhandoff |
| `.gitignore`、`README.md`、`LICENSE` などのmerge許容 | 後続判断 |
| `build` の生成物作成 | Phase 2-1 |
| Stanza検出とmetadata検証 | Phase 2-1 |
| `togostanza` dependencyの実利用可能性確認 | Phase 2-1 |
| `togostanza.config.ts` の生成と読み込み | Phase 2-4 |
| GitHub Pages workflowの実deploy化 | Phase 2-6 |
