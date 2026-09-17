# リファレンスセットアップ

`references/` は、調査・比較に使うリファレンスリポジトリを置くGit管理外の領域。

## 読む順番

1. `references/` の役割と想定レイアウトを確認する。
2. 初回セットアップで3つのリポジトリを取得する。
3. 調査対象に応じて、次の順に必要なセットアップを行う。
    - 現行版リポジトリまたは **metastanza** を調べる場合は、Node設定を行う。
    - 現行版リポジトリを調べる場合は、セットアップとCLIの確認を行う。
    - **metastanza** を調べる場合は、セットアップとCLIの確認を行う。
    - **TogoMedium Stanza** を調べる場合は、セットアップとCLIの確認を行う。
4. 調査結果はリファレンスリポジトリ側ではなく、`docs/v4-migration/investigation/` に記録する。

## 想定レイアウト

```text
references/
  togostanza/
  metastanza/
  togomedium-web/
```

## 初回セットアップで取得するリポジトリ

| 配置先 | 取得元 | 確認する文脈 |
| ------ | ------ | ------------ |
| `references/togostanza` | `https://github.com/togostanza/togostanza.git` | 現行版リポジトリの実装、ドキュメント、テスト |
| `references/metastanza` | `https://github.com/togostanza/metastanza.git` | **metastanza** の挙動とStanza側のCLI |
| `references/togomedium-web` | `https://github.com/dbcls/togomedium-web.git` | **TogoMedium Stanza** のセットアップとStanza側のCLI |

## 初回セットアップ手順

このセットアップは環境ごとに行う。

### リポジトリ取得

```sh
mkdir -p references
git clone https://github.com/togostanza/togostanza.git references/togostanza
git clone https://github.com/togostanza/metastanza.git references/metastanza
git clone https://github.com/dbcls/togomedium-web.git references/togomedium-web
```

`references/` はGit管理外の領域なので、取得した中身はこのリポジトリにはコミットしない。

### Node設定

現行版リポジトリとmetastanzaの実行確認ではNode 18系を使う。どちらも `engines.node` は `>=14` だが、依存パッケージの中にはNode 18以上を要求するものがあるため、調査用にはNode 18系を選ぶ。

ルートには `mise.toml` を置かず、対象リファレンスリポジトリの直下にローカル調査用の `mise.toml` を置く。

| 対象 | ローカル調査用ファイル |
| ---- | ---------------------- |
| 現行版リポジトリ | `references/togostanza/mise.toml` |
| **metastanza** | `references/metastanza/mise.toml` |

これらの `mise.toml` は、リメイク版リポジトリにもリファレンスリポジトリにもコミットしない。`mise` 自体はグローバルに利用できる前提とする。

`mise.toml` は次の内容で作成する。

```toml
[tools]
node = "18.20.4"
```

### 現行版リポジトリのセットアップ

セットアップには次を使う。

```sh
mise trust references/togostanza/mise.toml
cd references/togostanza
mise exec -- node -v
mise exec -- npm -v
mise exec -- npm ci
```

CLIの確認には次を使う。

```sh
mise exec -- node bin/togostanza.mjs --version
mise exec -- node bin/togostanza.mjs --help
```

### metastanzaのセットアップ

セットアップには次を使う。

```sh
mise trust references/metastanza/mise.toml
cd references/metastanza
mise exec -- node -v
mise exec -- npm -v
mise exec -- npm ci
```

Stanza側でCLIを確認するときは次を使う。

```sh
mise exec -- npx togostanza --version
mise exec -- npx togostanza --help
mise exec -- npx togostanza build
```

### TogoMedium Stanzaのセットアップ

TogoMedium Stanzaは、`references/togomedium-web` に含まれる `mise.toml` と `pnpm-lock.yaml` を使ってセットアップする。

```sh
mise trust references/togomedium-web/mise.toml
cd references/togomedium-web
mise exec -- node -v
mise exec -- pnpm -v
mise exec -- pnpm install --frozen-lockfile
```

Stanza側でCLIを確認するときは次を使う。

```sh
mise exec -- pnpm --filter @packages/stanza exec togostanza --version
mise exec -- pnpm --filter @packages/stanza exec togostanza --help
mise exec -- pnpm --filter @packages/stanza stanza:build
```

`references/` に置くリポジトリは、この3つに限定しない。追加のリファレンスリポジトリが必要になった場合は、用途が分かる名前で `references/` 配下に追加し、取得元と用途をこの文書に追記する。

## 方針

- `references/` 配下のファイルは、このリメイク版リポジトリのソースとして扱わない。
- リファレンスリポジトリの中身はコミットしない。
- 観測結果はリファレンスリポジトリを編集せず、`docs/v4-migration/investigation/` に記録する。
- リファレンスリポジトリを動かすために環境変更が必要になりそうな場合は、Node/npm/pnpmのバージョン、依存関係、lockfile、ソースを変更する前に人間へ相談する。
