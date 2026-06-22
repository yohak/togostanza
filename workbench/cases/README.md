# 検証ケース

このディレクトリでは、現行版とリメイク版に対して同じ確認を行うための検証ケースを管理する。

各検証ケースは、ケース定義と、そのケース専用の現行版 / リメイク版検証環境を同じディレクトリに置く。

## 目的

- [リメイク方針](../../docs/spec/remake-policy.md) の `必須` / `再設計` / `破棄` / `機能改善` を、観測可能な確認方法へ落とす。
- 現行版とリメイク版の差分を、実装都合ではなく契約単位で説明できるようにする。
- 実装開始後に、何を壊してはいけないかを確認できるようにする。

## 実行対象

検証ケースは、原則としてケースごとに次の検証環境を持つ。

- `current/`: 現行版CLIを確認するための、そのケース専用の検証環境。
- `remake/`: リメイク版CLIを確認するための、そのケース専用の検証環境。

package manager や実行条件を分けて観測する必要がある場合は、`current-npm/`、`current-pnpm/` のように目的が分かる検証環境名を使ってよい。

`README.md` はケース定義の正本として扱う。各検証環境には、必要になった時点で `package.json`、Stanza source、検証用HTMLなどを置く。

`init` 自体の挙動を確認するケースでは、検証環境の中で `init --name <name>` を実行し、その生成先 directory を Stanza repository として扱う。検証環境直下に `mise.toml` を置き、`generated-repo/` のような生成先 directory に `package.json` や Stanza source を置く形を標準とする。

`node_modules/`、`dist/`、一時ログ、cache は Git 管理外とする。

## ケース構造

```text
workbench/cases/
  001-cli-scaffold-and-generate/
    README.md
    current-npm/
      mise.toml
      generated-repo/
        package.json
        node_modules/
    current-pnpm/
      mise.toml
      generated-repo/
        package.json
        node_modules/
    remake/
      package.json
      node_modules/
```

## ケース一覧

| Case | 主な対象 | 契約 | 目的 |
| ---- | -------- | ---- | ---- |
| [001-cli-scaffold-and-generate](./001-cli-scaffold-and-generate/) | `init` / `generate stanza` | 開発契約 | Stanza repository と Stanza source の入口を確認する。 |
| [002-build-artifacts](./002-build-artifacts/) | `build` / `dist` | 利用契約 / 開発契約 | runtime artifact と生成物配置を確認する。 |
| [003-runtime-embedding](./003-runtime-embedding/) | module script / custom element | 利用契約 | 一般Webサイトへの直接埋め込みを確認する。 |
| [004-runtime-parameters](./004-runtime-parameters/) | `this.params` / `stanza:type` | 利用契約 / 開発契約 | HTML attributes から Stanza source への値変換を確認する。 |
| [005-stanza-source-api](./005-stanza-source-api/) | Stanza base API | 開発契約 | 既存 Stanza source 互換のAPIを確認する。 |
| [006-inter-stanza-coordination](./006-inter-stanza-coordination/) | `togostanza--container` など | 利用契約 | Stanza 間連携の維持・再設計対象を確認する。 |
| [007-config-and-resolution](./007-config-and-resolution/) | config / alias / assets | 開発契約 | build設定、import解決、asset参照の扱いを確認する。 |
| [008-real-project-regression](./008-real-project-regression/) | 実プロジェクト群 | 利用契約 / 開発契約 | `metastanza` と `TogoMedium Stanza` で回帰を確認する。 |

## ケースの書き方

各ケースは次の項目を持つ。

- 目的
- 対応する方針
- 入力条件
- 現行版で観測すること
- リメイク版で観測すること
- 合格条件
- 記録する差分
- 未決定事項

## 検証ケースの作成手順

各検証ケースは、次の順で作る。

1. まずケースの `README.md` に、確認したい契約、入力条件、合格条件を明記する。
2. `current/` などの検証環境に現行版での最小入力を作る。
3. 必要な場合だけ、その検証環境で採用した package manager の install を行う。
4. 現行版の観測結果をケースの `README.md` に記録する。
5. `remake/` は、リメイク版CLIが実装されるまで空の検証環境として残す。
6. リメイク版実装後、同じ入力意図を `remake/` に作り、差分をケースの `README.md` に記録する。

現行版の検証環境は、ケースの目的に必要な最小構成にする。すべてのケースで `init` から作り直す必要はない。`build`、runtime、parameter、Stanza source API など、Stanza repository が必要なケースでは、001 で作った scaffold の構成を参考にしてよい。

ただし、`init` 自体の挙動を確認するケースでは、手作業で構成を作らず、検証環境内で現行版CLIの `init` を実行して生成 repository を作る。

## Node と依存の扱い

現行版確認では、必要に応じて検証環境ごとに Node version を固定する。001 では `current-npm/mise.toml` と `current-pnpm/mise.toml` で Node 18 系を指定している。

Node version の差分が確認対象ではない場合、Node engine warning は記録に留め、warning だけを理由にケースを止めない。実際に command が失敗する場合だけ、失敗内容を観測結果として扱う。

package manager の install で作られる `node_modules/` は Git 管理しない。lockfile は、現行版依存の解決結果を固定したい場合はケース入力として Git 管理してよい。

Node version はケース直下ではなく、原則として `current/mise.toml`、`current-npm/mise.toml`、`remake/mise.toml` のように検証環境ごとに分ける。ケース直下に `mise.toml` を置くと複数の検証環境へ効くため、複数環境で同じ Node version に固定したい場合だけ使う。

## Git 管理するもの

Git 管理する候補は次の通り。

- ケースの `README.md`
- `mise.toml`
- `package.json`
- `package-lock.json`
- Stanza source
- metadata
- templates
- stylesheet
- 検証用HTML
- 小さな fixture data

Git 管理しないものは次の通り。

- `node_modules/`
- `dist/`
- cache
- 一時ログ
- サーバ実行中に生成される一時ファイル

## ケース別の初期方針

- 002 build artifacts: 001 の scaffold に近い最小 Stanza repository を `current-pnpm/generated-repo/` に置き、`build --output-path dist` の生成物を観測する。`dist/` は Git 管理せず、tree と重要ファイルだけ README に記録する。
- 003 runtime embedding: 002 の build 結果を前提にするか、同等の current を作る。help preview ではない最小HTMLを current に置く。
- 004 runtime parameters: parameter 観測用 Stanza を current に置く。値と型が画面またはログで分かるようにする。
- 005 Stanza source API: APIごとに最小 Stanza source を作る。`this.query()` など外部通信が絡むものは、観測用の最小 endpoint またはモック方針を README に書く。
- 006 inter stanza coordination: sender / receiver / container を含む最小HTMLを current に置く。`togostanza--container` は Stanza 間連携の入口として維持対象、`togostanza--event-map` は outgoing event を receiver attribute へ渡す概念を維持しつつ詳細挙動は再設計候補、`togostanza--data-source` は外部データを receiver attribute へ渡す目的を維持しつつAPI詳細は再設計候補、`togostanza--data-container` は旧ドキュメント内の誤記として破棄対象として扱う。再設計候補は現行挙動の観測と移行メモを分けて書く。
- 007 config and resolution: 設定ファイル、alias、asset import を分けて小さく確認する。旧設定ファイルは無条件実行しない方針を確認対象に含める。
- 008 real project regression: 実プロジェクトを直接汚さず、必要な最小再現または検証用コピーだけを current / remake に置く。

## 判断の扱い

`必須` は、現行版とリメイク版で同じ外部契約を満たすことを確認する。

`再設計` は、現行版との差分を許容する。ただし、目的、影響範囲、移行メモ、Stanza開発者向けの修正手順を確認対象に含める。

`破棄` は、リメイク版に持ち込まないことを確認する。現行版に存在する場合は、破棄理由と代替の有無を記録する。

`機能改善` は、既存の正しい入力や主要契約を壊していないことを確認したうえで、改善された診断や品質を確認する。

## 実行時の注意

現行版の `build` / `serve` は、Codex managed exec の sandboxed 実行で `EMFILE` になる場合がある。AI が確認するときは、許可済みの unsandboxed 実行として扱う。

`serve` を起動した場合は、使用ポート、作業ディレクトリ、停止方法、ブラウザで確認したURLをケースの `README.md` に記録する。

`references/` は汚さない。試行錯誤は `sandbox/` で行い、再現可能になった確認だけを対象ケースの `current/` / `remake/` と `README.md` へ移す。
