# 検証ケース

このディレクトリでは、現行版とリメイク版に対して同じ確認を行うための検証ケースを管理する。

各検証ケースは、ケース定義と、そのケース専用の現行版 / リメイク版検証プロジェクトを同じディレクトリに置く。

## 目的

- [リメイク方針](../../docs/spec/remake-policy.md) の `必須` / `再設計` / `破棄` / `機能改善` を、観測可能な確認方法へ落とす。
- 現行版とリメイク版の差分を、実装都合ではなく契約単位で説明できるようにする。
- 実装開始後に、何を壊してはいけないかを確認できるようにする。

## 実行対象

検証ケースは、原則としてケースごとに次の両方を持つ。

- `current/`: 現行版CLIで作る、そのケース専用の Stanza群プロジェクト。
- `remake/`: リメイク版CLIで作る、そのケース専用の Stanza群プロジェクト。

`README.md` はケース定義の正本として扱う。`current/` と `remake/` には、必要になった時点で `package.json`、Stanza source、検証用HTMLなどを置く。

`node_modules/`、`dist/`、一時ログ、cache は Git 管理外とする。

## ケース構造

```text
workbench/cases/
  001-cli-scaffold-and-generate/
    README.md
    current/
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

## 判断の扱い

`必須` は、現行版とリメイク版で同じ外部契約を満たすことを確認する。

`再設計` は、現行版との差分を許容する。ただし、目的、影響範囲、移行メモ、Stanza開発者向けの修正手順を確認対象に含める。

`破棄` は、リメイク版に持ち込まないことを確認する。現行版に存在する場合は、破棄理由と代替の有無を記録する。

`機能改善` は、既存の正しい入力や主要契約を壊していないことを確認したうえで、改善された診断や品質を確認する。

## 実行時の注意

現行版の `build` / `serve` は、Codex managed exec の sandboxed 実行で `EMFILE` になる場合がある。AI が確認するときは、許可済みの unsandboxed 実行として扱う。

`serve` を起動した場合は、使用ポート、作業ディレクトリ、停止方法、ブラウザで確認したURLをケースの `README.md` に記録する。

`references/` は汚さない。試行錯誤は `sandbox/` で行い、再現可能になった確認だけを対象ケースの `current/` / `remake/` と `README.md` へ移す。
