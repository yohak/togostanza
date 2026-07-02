# Phase 1: scaffold生成 設計

Phase 1は、Stanza開発者が `init` と `generate stanza` で作業を開始できる状態を作るフェーズである。

このフェーズでは、雛形生成とStanzaソース生成の入口を成立させる。`build`、`serve`、ランタイム、React、Vue、`togostanza-utils` 互換は後続フェーズで扱う。

## 目的

- `togostanza init --name <dir>` で新しいStanzaリポジトリを生成できる。
- `togostanza generate stanza <id>` と `togostanza g stanza <id>` でStanzaソース一式を生成できる。
- npmとpnpmのinstall command組み立てを、実インストールとは分けて検証できる。
- 生成直後のStanzaリポジトリが、後続フェーズの `build` / `serve` 実装へ進める入力になる。

## 完了条件

- `init`、`generate stanza`、`g stanza` の実挙動がある。
- `init` は `--name <dir>` 必須の非対話CLIとして動く。
- `init` はnpmとpnpmのinstall commandを組み立て、`--skip-install` でinstall runner呼び出しを抑止できる。
- `init` は既定でgit初期化を行い、`--skip-git` で抑止できる。
- `generate stanza` はidをkebab-case化し、主要optionから現行寄りのStanzaソースを生成する。
- `package.json` に意図した `dependencies.togostanza` が生成される。
- npmとpnpmのinstall command組み立てを確認できる。
- `--skip-install` ではlockfileが生成されないことを確認できる。
- Phase 1で後続へ送る仕様が、この文書か引き継ぎメモに明記されている。

## 含めるもの

- `togostanza init --name <dir>`。
- `togostanza generate stanza <id>` / `togostanza g stanza <id>`。
- `--package-manager npm|pnpm`、`--skip-install`、`--skip-git`、`--license`。
- npmとpnpmのinstall command組み立て確認。
- 生成先とStanza IDの最小validation。
- 既存パスに対する上書き拒否。
- GitHub Pages workflow placeholder生成。
- 生成物と診断のunit test / integration test。

## 含めないもの

- `togostanza init .`。
- 既存ディレクトリへのmerge、上書き、空ディレクトリ再利用。
- 親ディレクトリや既存Stanzaリポジトリのlockfileを使った推定や矛盾検出。
- `--git-url`。
- `togostanza.config.ts` 生成。
- 初期stanzaの自動生成。
- `package.json` の `scripts` 生成。
- 実際にdeployできるGitHub Pages workflow。
- `build` / `serve` の実挙動。
- `togostanza/stanza` のランタイム実装。

`init .` や既存ファイルとのmergeは、便利だが衝突検出や上書き方針を細かく決める必要がある。Phase 1では、全体の実装フローに影響しない細部として後続判断へ回す。

`--git-url` は現行版にあるoptionだが、Phase 1では受け付けない。渡された場合は未知optionとしてstderrへ診断を出し、non-zeroで終了する。

## `init` の方針

Phase 1の `init` は、`--name <dir>` を必須にする。bare `init` は入力不備としてstderrへ診断を出し、non-zeroで終了する。

`--name` は、パス区切りを含まない単一のpackage名として扱う。`.`、`foo/bar`、空文字、package名として不正な値は受け付けない。受け付けた値は生成先ディレクトリ名と `package.json.name` に使う。

生成先ディレクトリが存在する場合は、空ディレクトリでも失敗する。Phase 1では既存ファイルを変更しない。生成途中でインストールが失敗した場合は、生成済みファイルを残し、インストール失敗としてstderrへ診断を出してnon-zeroで終了する。

### 生成する雛形

`init` は次の最小雛形を生成する。

```text
generated-repo/
  .github/
    workflows/
      publish.yml
  .gitignore
  README.md
  assets/
    .keep
  common.scss
  lib/
    .keep
  package.json
```

`togostanza.config.ts` はPhase 2以降で扱う。初期stanzaは生成せず、`generate stanza` の責務として分ける。

`package.json` には `scripts` を生成しない。Stanzaリポジトリ内の標準導線は、`npm exec togostanza ...` または `pnpm exec togostanza ...` とする。

`dependencies.togostanza` は、通常生成ではCLI自身の `package.json` のversionから `^<version>` を使う。Phase 1時点でversionが `0.0.0` でも、生成方針はCLI自身のversionを単一の正本として扱う。

`--license <text>` は、生成する `package.json` の `license` に書く。未指定時は `MIT` を使う。

`package.json` の `packageManager` fieldは、リメイク版仕様に従ってPhase 1でも書き込まない。

ローカルtarballを作って `npm install` / `pnpm install` できることは、Phase 1の完了条件にしない。実インストール確認はPhase 5で棚卸しし、配布前検証としてはPhase 12へ送る。

リメイク版仕様の公式手順例は `init --name <dir>` を前提にする。Phase 1では非対話promptを持たないため、bare `init` は入力不備として扱う。bare `init` を将来prompt付き入口として追加するかどうかは、Phase 1完了後の引き継ぎで判断する。

### package manager

`--package-manager npm|pnpm` が指定された場合は、その値を使う。未指定の場合は `npm_config_user_agent` から `npm` / `pnpm` を推定する。推定できない場合は `npm` を使う。

Phase 1の `init --name <dir>` は新規ディレクトリ生成だけを扱うため、親ディレクトリの `package-lock.json` や `pnpm-lock.yaml` は推定材料にしない。lockfile同時存在や `--package-manager` 指定との矛盾診断は、`init .` や既存ディレクトリ対応と合わせて後続で扱う。

lockfile同時存在や `--package-manager` 指定矛盾の診断は、リメイク版仕様としては確定契約である。Phase 1では新規子ディレクトリ生成だけに絞るため実装しないが、Phase 1完了後、Phase 2着手前の必須follow-upで回収する。

`--skip-install` がない場合は、選択したパッケージマネージャーで実行するinstall commandを組み立てる。`npm` では `npm install`、`pnpm` では `pnpm install` を使う。Phase 1のテストでは、実際の依存取得成功やlockfile生成を完了条件にせず、組み立てたcommandとinstall runner呼び出しまでを確認する。

`--skip-install` がある場合は、install commandを実行せず、lockfileも生成しない。

### git

`--skip-git` がない場合は、生成リポジトリ内で `git init -b main` を実行する。`--skip-git` がある場合は `.git/` を生成しない。

GitHub Pages workflow placeholderは、git初期化の有無とは独立して生成する。

### GitHub Pages workflow

Phase 1では `.github/workflows/publish.yml` を生成するが、実deploy可能なworkflowは実装しない。

placeholder workflowは、有効なYAMLとして生成する。triggerは `workflow_dispatch` のみとし、jobはPhase 2以降でdeploy workflowを有効化する旨を出力するだけにする。

placeholder workflowには、`--package-manager` で選んだpackage managerが分かる最小の文言を含める。実deploy手順は持たせない。

`push` で起動するworkflow、`actions/upload-pages-artifact`、`actions/deploy-pages`、npm/pnpm別の再現可能インストール手順は、Phase 2で扱う。

実deploy可能なGitHub Pages workflowは、Phase 2で `build` と `dist/` 生成物が成立した後にplaceholderから置き換える。Phase 1では、workflowファイルの存在とpackage manager差分だけを確認する。

## `generate stanza` の方針

Phase 1では、`generate stanza` の `id` を必須にする。未指定時のpromptや既定idは実装しない。

入力idはkebab-caseへ正規化する。たとえば `helloWorld` は `hello-world` にする。正規化後のidが空、またはStanza IDとして使えない場合は、stderrへ診断を出してnon-zeroで終了する。

生成先 `stanzas/{id}/` が存在する場合は失敗する。既存Stanzaソースへのmergeや上書きは行わない。

### option

`generate stanza` / `g stanza` は次のoptionを受け付ける。

| option | Phase 1の扱い |
| ------ | ------------- |
| `--label <text>` | 未指定時はidからTitle Caseで生成する。 |
| `--definition <text>` | 未指定時は定型文を使う。 |
| `--license <text>` | 未指定時は `MIT` を使う。 |
| `--author <text>` | 未指定時は空文字を使う。 |
| `--timestamp <date>` | 未指定時は実行日のISO日付を使う。 |

テストでは `--timestamp` を明示し、生成物を安定させる。

### 生成するStanzaソース

`generate stanza` は次のファイルを生成する。

```text
stanzas/
  {id}/
    README.md
    assets/
      .keep
    index.js
    metadata.json
    style.scss
    templates/
      stanza.html.hbs
```

`metadata.json` は現行版に近い構造にし、`@context`、`@id`、`stanza:label`、`stanza:definition`、`stanza:license`、`stanza:author`、`stanza:contributor`、`stanza:created`、`stanza:updated`、`stanza:parameter`、`stanza:menu-placement`、`stanza:style`、`stanza:incomingEvent`、`stanza:outgoingEvent` を含める。

`index.js` は `import Stanza from "togostanza/stanza"` と `renderTemplate()` を使う最小例にする。Phase 1では `togostanza/stanza` の実行可能なランタイムを完成させないが、Phase 2以降の入力として自然に使える形を生成する。

## 診断方針

CLIは成功時にexit code `0` を返す。失敗時はnon-zeroを返す。細かいerror code分類はPhase 1では扱わない。

診断はstderrへ出す。文言の完全一致は互換対象にしないが、次の情報は含める。

- 不足している引数やoption。
- 不正な `--name` またはStanza ID。
- 衝突したファイルまたはディレクトリのpath。
- インストールに失敗したパッケージマネージャーと終了状態。

## 実装メモ

- Phase 0のCLI routerに、`init` と `generate stanza` のhandlerを追加する。
- `generate stanza` と `g stanza` は同じcanonical commandへ寄せる。
- template文字列は、後でファイルtemplateへ分けやすい構成にする。
- 現行版のpnpm配置ではgeneratorのtemplate copyが失敗するケースがあるため、Phase 1では文字列生成でこの問題を避ける。
- JSONは文字列連結ではなく、objectから安定したformatで出力する。
- ファイル生成は、存在確認を先に行い、既存pathがある場合は書き込み前に失敗させる。
- install runnerは差し替え可能にする。
- unit testでは、runnerを直接注入してcommand組み立てと実行分岐を確認する。
- integration testでは、公開CLI optionを増やさず、テスト用runnerで外部package取得を伴わない確認を行う。

Phase 1ではNode標準APIベースのCLI parserを継続する。option解析が複雑になった時点で、`commander` などのCLIライブラリ採用を再検討できる余地は残す。

## 検証計画

### unit test

- `init` の `--name` 必須、単一package名制約、不正値。
- `--package-manager npm|pnpm` の受け付け。
- `--git-url` が未知optionとして失敗すること。
- `npm_config_user_agent` からのpackage manager推定。
- `--skip-install`、`--skip-git`。
- `dependencies.togostanza` の通常生成。
- `--license` が `package.json.license` に反映されること。
- `package.json` に `packageManager` fieldを書かないこと。
- npm/pnpmのinstall command組み立て。
- `--skip-install` でinstall runnerが呼ばれないこと。
- `--skip-install` ではlockfileが生成されないこと。
- 既存生成先への衝突。
- `generate stanza` / `g stanza` のrouting。
- idのkebab-case化と不正id。
- `generate stanza` のoption既定値。
- 既存 `stanzas/{id}/` への衝突。

### integration test

- build後の `bin/togostanza.mjs` 経由で `init --name generated-repo --skip-install --skip-git` を実行し、雛形ファイルと `package.json` を確認する。
- `init --name generated-repo --package-manager npm --skip-install` で、`package.json` の内容とnpm向けworkflow placeholderを確認する。install command組み立てはrunner注入が必要なためunit testで確認する。
- `init --name generated-repo --package-manager pnpm --skip-install` で、`package.json` の内容とpnpm向けworkflow placeholderを確認する。install command組み立てはrunner注入が必要なためunit testで確認する。
- `--skip-install` の場合、install commandが実行されず、lockfileも生成されないことを確認する。
- 生成リポジトリ内相当のcwdで `generate stanza helloWorld ...` を実行し、`stanzas/hello-world/` が生成されることを確認する。
- `g stanza` aliasでも同じ生成結果になることを確認する。
- `upgrade` が未知commandまたは非対応として失敗することを維持する。

Phase 1では、実インストールは完了条件にしない。ローカルtarballを作って `npm install` / `pnpm install` できること、`node_modules/` が生成されること、lockfileが実install結果として生成されること、生成リポジトリ内で `npm exec togostanza ...` / `pnpm exec togostanza ...` が実際に解決されることは、Phase 5で棚卸しし、配布前検証としてはPhase 12へ送る。

### 完了前確認

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。

## 後続へ送る事項

| 項目 | 回収先 |
| ---- | ------ |
| `init .` と既存ディレクトリへのscaffold | Phase 1完了後、Phase 2着手前の必須follow-up |
| lockfile同時存在や `--package-manager` 指定矛盾の診断 | Phase 1完了後、Phase 2着手前の必須follow-up |
| bare `init` をprompt付き入口として追加するかの判断 | Phase 1 follow-up / handoff |
| 実deploy可能なGitHub Pages workflow | Phase 2 |
| `togostanza.config.ts` の生成とschema | Phase 2 |
| `index.ts` / `index.tsx` 生成option | 後続判断 |
| `README.md` の本文詳細 | 後続判断 |
| `build` / `serve` の実挙動 | Phase 2 / Phase 3 |
| `togostanza/stanza` runtime | Phase 2 |
| ローカルtarballを使ったnpm/pnpmの実インストール確認 | Phase 5で棚卸し、Phase 12で配布前検証 |
| npm公開metadata、`exports`、`files`、`private` 解除 | Phase 5で棚卸し、Phase 12で最終判断 |
