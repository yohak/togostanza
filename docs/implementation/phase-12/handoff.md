# Phase 12: distribution 引き継ぎ

この文書では、Phase 12で確認した配布前状態と、外部公開前に残す作業を記録する。

この文書では、Phase 12で実施したlocal distribution smokeと、外部公開前に残す作業を記録する。

Phase 12では短期方針をnpm publishではなくGitHub dependency distributionへ切り替えた。その再計画は [Phase 12: GitHub dependency distribution 設計](./plan.md) を正とする。

## 完了したこと

- ローカルtarballを使った `pack -> install -> 実行` smokeを追加した。
  - script: `mise exec -- pnpm run test:distribution:local`
  - npm環境とpnpm環境の両方へtarballをインストールする。
  - install後のCLIで `--version`、`init --name`、`generate stanza`、`build` を確認する。
  - tarball install後に `togostanza/stanza` と `togostanza/config` の実行時解決と型解決を確認する。
- `package.json.files` を `bin/` と `dist/` に絞った。
  - `src/`、test、設定ファイル、workbench、referencesはtarballに含めない。
- 最小のnpm package metadataを追加した。
  - `description`
  - `license: MIT`
  - `keywords`
- `./config` と `./stanza` subpath exportを維持し、package metadata testで固定した。
- 配布前チェックリストを追加した。
  - [Phase 12 release checklist](./release-checklist.md)
- 品質確認手順に `test:distribution:local` を追加した。
- root package layoutへ移行した。
  - `package.json`、`pnpm-lock.yaml`、`mise.toml` はrootへ移した。
  - `bin/` はroot直下に置いた。
  - 実装、test、scriptは `src/` 配下へ集約した。
  - `src/test/**` と `src/scripts/**` はbuild出力から除外した。
- GitHub dependency local smokeを追加した。
  - script: `mise exec -- pnpm run test:github-dependency:local`
  - 一時git repositoryにrelease refを作り、`git+file://...#ref` でnpm / pnpm installする。
  - release refには `git add -f dist/` でbuild済み `dist/` を含める。
  - install後のCLIで `--version`、`init --name`、`generate stanza`、`build` を確認する。
  - install後に `togostanza/stanza` と `togostanza/config` の実行時解決と型解決を確認する。
  - install対象に `docs/`、`references/`、`src/`、`test/`、`workbench/` が混入していないことを確認する。

## package surface判断

| 項目 | 判断 |
| ---- | ---- |
| `private` | `true` を維持する。publish直前まで外さない。 |
| `version` | `0.0.0` はlocal pack smoke用として維持する。公開前に実versionへ更新する。 |
| `files` | `bin/` と `dist/` のみ。 |
| `exports` | `./config` と `./stanza` を維持する。 |
| root export | 追加しない。 |
| `main` / top-level `types` | 追加しない。 |
| generated repo `dependencies.togostanza` | `^<package version>` を維持する。`0.0.0` のまま公開しない。 |
| generated repo `packageManager` field | 生成しない。pnpm workflow側でpnpm 10系を明示する。 |
| `engines.node` | `>=24.5.0` を維持する。公開直前に利用者環境と再確認する。 |
| GitHub dependency release ref | `git add -f dist/` でbuild済み `dist/` を含める。 |
| release branch / tag | 外部pushやtag作成はまだ行わない。人間承認後に行う。 |

## 確認結果

確認日: 2026-07-02

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
mise exec -- pnpm run test:compat:local
```

結果:

- `check-all`: pass
  - format
  - lint
  - type-check
  - build
  - unit test: 79 passed, 2 skipped
  - integration test: 21 passed
  - browser test: 10 passed
- `test:distribution:local`: pass
  - npm tarball install smoke: pass
  - pnpm tarball install smoke: pass
- `test:github-dependency:local`: pass
  - local release ref smoke: pass
  - npm Git dependency install smoke: pass
  - pnpm Git dependency install smoke: pass
- `test:compat:local`: pass
  - local compatibility unit: 3 passed
  - local compatibility browser: 5 passed

## 実行しなかったこと

次は外部副作用または公開後環境に関わるため、Phase 12通常作業では実行していない。

- `npm publish`
- tag作成
- GitHub release作成
- npm registry上の `latest` packageを使った確認
- `github:...#<tag-or-sha>` を使った公開GitHub経由のinstall確認
- 公開GitHub Pages環境へのlive deploy

## 公開前に残すこと

- `version` を公開する値へ更新する。
- `private` を外すタイミングを人間が確認する。
- repository、homepage、bugsのURLを実際の公開リポジトリに合わせて設定する。
- 公開GitHub dependency用のrelease branchを作り、`git add -f dist/` でbuild済み `dist/` を含める。
- tagまたはcommit SHAを生成repoの `dependencies.togostanza` へ反映する。
- 公開GitHub refを使ったnpm / pnpm install確認を行う。
- npm publishへ進む場合のみ、`npm publish --dry-run` 相当でtarball内容を再確認する。
- GitHub Actions live deployを行う場合は、対象リポジトリ、公開先、権限、cleanup方針を確認する。

## 注意点

- `references/` 依存確認はローカルcompatibility確認であり、CI再現性は保証しない。
- Sass `@import` 非推奨警告は既知制約であり、Phase 12では失敗扱いにしない。
- `engines.node >=24.5.0` は現状維持だが、公開前にStanza開発者の実環境と照合する。
