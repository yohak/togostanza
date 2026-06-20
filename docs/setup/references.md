# リファレンスセットアップ

`references/` は、調査・比較に使うリファレンスリポジトリを複数置くGit管理外領域。

## 想定レイアウト

```text
references/
  togostanza/
  metastanza/
  togomedium-web/
```

## 初期セットアップで取得するリポジトリ

| 配置先 | 取得元 | 用途 |
| ------ | ------ | ---- |
| `references/togostanza` | `https://github.com/togostanza/togostanza.git` | 現行版リポジトリの実装、ドキュメント、テストの調査 |
| `references/metastanza` | `https://github.com/togostanza/metastanza.git` | **metastanza** の確認 |
| `references/togomedium-web` | `https://github.com/dbcls/togomedium-web.git` | **TogoMedium Stanza** の確認 |

## 初回セットアップ手順

このセットアップは環境ごとに行う。

### リポジトリ取得

```sh
mkdir -p references
git clone https://github.com/togostanza/togostanza.git references/togostanza
git clone https://github.com/togostanza/metastanza.git references/metastanza
git clone https://github.com/dbcls/togomedium-web.git references/togomedium-web
```

`references/` はGit管理外領域なので、cloneした中身はこのリポジトリにはコミットしない。

### 現行版のNode設定

現行版リポジトリの実行確認ではNode 18系を使う。現行版の `engines.node` は `>=14` だが、依存パッケージの中にはNode 18以上を要求するものがあるため、調査用にはNode 18系を選ぶ。

ルートには `mise.toml` を置かず、`references/togostanza/mise.toml` をローカル調査用に置く。

`references/togostanza/mise.toml` は現行版リポジトリ側のローカル補助ファイルとして扱い、リメイク版リポジトリにも現行版リポジトリにもコミットしない。`mise` 自体はグローバルに利用できる前提とする。

`references/togostanza/mise.toml` は次の内容で作成する。

```toml
[tools]
node = "18.20.4"
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

Stanza側のCLI確認には次を使う。

```sh
mise exec -- pnpm --filter @packages/stanza exec togostanza --version
mise exec -- pnpm --filter @packages/stanza exec togostanza --help
mise exec -- pnpm --filter @packages/stanza stanza:build
```

ここに置くリポジトリは、この3つに限定しない。追加のリファレンスリポジトリが必要になった場合は、用途が分かる名前で `references/` 配下に追加し、この文書に取得元と用途を追記する。

## リポジトリの役割

- `references/togostanza`: 現行版リポジトリの実装、ドキュメント、テストの参照元。
- `references/metastanza`: **metastanza** の参照元。
- `references/togomedium-web`: **TogoMedium Stanza** の参照元。

## 方針

- `references/` 配下のファイルは、このリメイク版リポジトリのソースとして扱わない。
- リファレンスリポジトリの中身はコミットしない。
- 観測結果はリファレンスリポジトリを編集せず、`docs/investigation/` に記録する。
- リファレンスリポジトリを動かすために環境変更が必要になりそうな場合は、Node/npm/pnpmのバージョン、依存関係、lockfile、ソースを変更する前に人間へ相談する。

## セットアップ時に記録すること

- `togostanza` のローカルパス:
- `metastanza` のローカルパス:
- `togomedium-web` のローカルパス:
- セットアップ日:
- 既知の環境メモ:
