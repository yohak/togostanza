# 品質確認

この文書では、リメイク版実装パッケージで使うformat、lint、type-check、build、testの入口を扱う。

## 対象範囲

品質確認の対象は、リポジトリルートのリメイク版実装パッケージに閉じる。

`docs/`、`references/`、`workbench/` は、この品質確認scriptの通常対象にしない。

## 実行環境

ルートの `mise.toml` でNode.jsとpnpmを固定する。
Node.js / pnpmコマンドは、裸の `node` や `pnpm` ではなく `mise exec -- ...` 経由で実行する。

```sh
mise exec -- node -v
mise exec -- pnpm --version
```

## 標準script

リポジトリルートで次のscriptを使う。

| script | 目的 |
| ------ | ---- |
| `pnpm clean` | `dist/` のcompiled JS生成物を削除する。 |
| `pnpm format` | `oxfmt` で整形する。 |
| `pnpm format:check` | 整形差分がないことを確認する。 |
| `pnpm lint` | `oxlint` でlintを実行する。 |
| `pnpm type-check` | `tsc --noEmit` で型チェックを実行する。 |
| `pnpm build` | `dist/` をcleanしてから、TypeScriptソースからcompiled JSを出力する。 |
| `pnpm test:unit` | Vitestのunit testを実行する。 |
| `pnpm test:integration` | CLI integration testを実行する。 |
| `pnpm test:browser` | Playwrightのbrowser smoke testを実行する。 |
| `pnpm test:distribution:local` | ローカルtarballをnpm / pnpmへインストールし、配布物としての最小動作を確認する。 |
| `pnpm test:github-dependency:local` | 一時release refを作り、Git dependencyとしてnpm / pnpmへインストールする確認を行う。 |
| `pnpm check-all` | 上記の主要確認をまとめて実行する。 |

コード変更を含む作業では、原則として次を完了前確認に使う。

```sh
mise exec -- pnpm run check-all
```

エージェントが品質確認を行う場合は、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。browser testを個別に確認する場合も、同じ実行環境で次を使う。

```sh
mise exec -- pnpm run test:browser
```

CLI integration testはbuild後のcompiled JS入口を確認する。`pnpm test:integration` は事前にbuildを実行するため、単独実行でも最新の `dist/` を確認する。

## CLI手元確認

リメイク版CLIを手元で確認する場合は、裸の `togostanza` commandではなく、package内の `bin` 入口を明示して実行する。裸の `togostanza` commandは、PATH上にある現行版を起動する可能性がある。

```sh
mise exec -- pnpm build
mise exec -- node ./bin/togostanza.mjs --version
mise exec -- node ./bin/togostanza.mjs --help
```

この確認は、`bin/togostanza.mjs` からbuild後のcompiled JSへ接続される経路を確認するためのものとする。PATH上の `togostanza` command名解決や、package manager経由の実行確認は配布確認の範囲で扱う。

## 配布手元確認

配布物としての最小確認は、ローカルtarballを一時ディレクトリへpackし、npm / pnpmそれぞれへインストールして行う。

```sh
mise exec -- pnpm run test:distribution:local
```

GitHub dependencyとしての最小確認は、一時git repositoryにbuild済み `dist/` を含むrelease refを作り、`git+file://...#ref` 経由でnpm / pnpmそれぞれへインストールして行う。

```sh
mise exec -- pnpm run test:github-dependency:local
```

この確認は外部公開を行わない。`npm publish`、tag作成、GitHub release作成、公開npm registry上の `latest` 確認は、別途明示承認を受けてから扱う。

## 整形対象

整形は `oxfmt` を使う。初期状態ではTS、JS、JSON、SCSSを主対象とし、MarkdownとHandlebars templateは対象外とする。

`oxfmt` が対応していないファイル種別がある場合は、別formatterを追加せず、対象外として扱う。
