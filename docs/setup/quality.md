# 品質確認

この文書では、リメイク版実装パッケージで使うformat、lint、type-check、build、testの入口を扱う。

## 対象範囲

品質確認の対象は `package/` 配下のリメイク版実装パッケージに閉じる。

リポジトリルートには `package.json` を置かない。`docs/`、`references/`、`workbench/` は、この品質確認scriptの対象にしない。

## 実行環境

`package/mise.toml` でNode.jsとpnpmを固定する。

```sh
cd package
mise exec -- node -v
mise exec -- pnpm --version
```

## 標準script

`package/` で次のscriptを使う。

| script | 目的 |
| ------ | ---- |
| `pnpm format` | `oxfmt` で整形する。 |
| `pnpm format:check` | 整形差分がないことを確認する。 |
| `pnpm lint` | `oxlint` でlintを実行する。 |
| `pnpm type-check` | `tsc --noEmit` で型チェックを実行する。 |
| `pnpm build` | TypeScriptソースから `dist/` へcompiled JSを出力する。 |
| `pnpm test:unit` | Vitestのunit testを実行する。 |
| `pnpm test:integration` | CLI integration testを実行する。 |
| `pnpm test:browser` | Playwrightのbrowser smoke testを実行する。 |
| `pnpm check-all` | 上記の主要確認をまとめて実行する。 |

コード変更を含む作業では、原則として次を完了前確認に使う。

```sh
cd package
mise exec -- pnpm check-all
```

CLI integration testはbuild後のcompiled JS入口を確認する。完了前確認では、`pnpm check-all` の中で `pnpm build` の後に実行する。

## 整形対象

整形は `oxfmt` を使う。初期状態ではTS、JS、JSON、SCSSを主対象とし、MarkdownとHandlebars templateは対象外とする。

`oxfmt` が対応していないファイル種別がある場合は、別formatterを追加せず、対象外として扱う。
