# Phase 12 release checklist

この文書では、Phase 12で確認した配布前項目と、外部公開前に人間が最終判断する項目を整理する。

## 現在の判断

| 項目 | 状態 | 判断 |
| ---- | ---- | ---- |
| package name | `togostanza` | 維持する。 |
| version | `0.0.0` | local pack smokeでは維持する。公開前には実versionへ更新する。 |
| private | `true` | accidental publish防止のため、publish直前まで維持する。 |
| files | `bin/`, `dist/` | tarballに実行入口とcompiled JSだけを含める。 |
| bin | `togostanza` -> `./bin/togostanza.mjs` | 維持する。 |
| exports | `./config`, `./stanza` | Stanza開発者向けの開発契約として維持する。 |
| root export | なし | Phase 12時点では追加しない。 |
| main / top-level types | なし | Phase 12時点では追加しない。 |
| license | `MIT` | 現行版package metadataと生成雛形の既定licenseに合わせる。 |
| engines.node | `>=24.5.0` | Phase 12時点では維持する。公開直前に利用者環境と再確認する。 |
| packageManager | `pnpm@10.28.2` | 開発パッケージの固定として維持する。 |
| generated repo `dependencies.togostanza` | `^<package version>` | package versionを正本にする。`0.0.0` のまま公開しない。 |
| generated repo `packageManager` field | なし | `init` は生成しない。pnpm workflowはpnpm 10系を明示する。 |

## 公開前に必ず確認すること

- `version` を公開する値へ更新する。
- 生成repoの `dependencies.togostanza` が、公開後に解決できるversion specになることを確認する。
  - package versionを正本にして `^<version>` を生成する。
  - `0.0.0` のまま公開しない。
- `private` を外すタイミングを決める。
- repository、homepage、bugsのURLを、実際の公開リポジトリに合わせて設定する。
- `npm publish --dry-run` 相当でtarball内容を再確認する。
- GitHub Actions live deployを実行する場合は、対象リポジトリ、公開先、権限、cleanup方針を確認する。

## 外部副作用があるためPhase 12通常作業では実行しないこと

- `npm publish`
- tag作成
- GitHub release作成
- npm registry上の `latest` packageを使った確認
- 公開GitHub Pages環境へのlive deploy
