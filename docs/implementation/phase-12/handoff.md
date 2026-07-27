# Phase 12: distribution 引き継ぎ

この文書では、Phase 12で実施したlocal distribution smoke、GitHub dependency release ref、外部公開前に残す作業を記録する。

Phase 12では短期方針をnpm publishではなくGitHub dependency distributionへ切り替えた。その再計画は [Phase 12: GitHub dependency distribution 設計](./plan.md) を正とする。

その後の整理で、正式版の生成repo仕様は現行版に寄せ、タグ無しGitHub dependencyを既定にする方針にした。Phase 12で確認した `github:yohak/togostanza#yohak-github-20260723` は、開発中の検証と固定点のためのrefとして扱う。

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
  - npm / pnpmからGit refのCLIを直接起動し、`init --skip-install` できることを確認する。
  - install後のCLIで `--version`、`init --name`、`generate stanza`、`build` を確認する。
  - install後のCLIから `TOGOSTANZA_DEPENDENCY_SPEC` を使って具体refを注入し、`init` の既定installが通ることを確認する。
  - install後に `togostanza/stanza` と `togostanza/config` の実行時解決と型解決を確認する。
  - install対象に `docs/`、`references/`、`src/`、`test/`、`workbench/` が混入していないことを確認する。
- 生成repoの `dependencies.togostanza` をGitHub dependency運用へ寄せた。
  - 通常生成では `github:yohak/togostanza` を書く。
  - 生成READMEには、GitHub dependencyとlockfileの関係を書く。
  - `TOGOSTANZA_DEPENDENCY_SPEC` で、release手順やlocal smoke用の具体dependency specを注入できるようにした。
  - `test:github-dependency:local` は `git+file://...#ref` を注入し、生成repoのdependencyに反映されることを確認する。
  - overrideに `<tag-or-sha>` のようなplaceholderが残ったまま `init` の既定installへ進もうとした場合は、scaffold作成前に明示診断で失敗するようにした。
- TogoMedium実リポジトリでGitHub dependency経路を人間確認した。
  - `dependencies.togostanza` を `github:yohak/togostanza#yohak-github-20260723` へ変更し、意図通り動くことを確認した。
- Phase 12後の残作業を整理した。
  - [Phase 12後の残作業](./remaining-work.md)

## package surface判断

| 項目 | 判断 |
| ---- | ---- |
| `private` | `true` を維持する。publish直前まで外さない。 |
| `version` | `0.0.0` はlocal pack smoke用として維持する。公開前に実versionへ更新する。 |
| `files` | `bin/` と `dist/` のみ。 |
| `exports` | `./config` と `./stanza` を維持する。 |
| root export | 追加しない。 |
| `main` / top-level `types` | 追加しない。 |
| generated repo `dependencies.togostanza` | 通常生成では `github:yohak/togostanza` を生成する。正式版マージ後は `github:togostanza/togostanza` へ切り替える候補として扱う。 |
| concrete dependency spec injection | release手順やlocal smokeでは `TOGOSTANZA_DEPENDENCY_SPEC` で具体tagまたはcommit SHAを注入できる。 |
| generated repo `packageManager` field | 生成しない。pnpm workflow側でpnpm 11系を明示する。 |
| `engines.node` | `>=24.5.0` を維持する。公開直前に利用者環境と再確認する。 |
| branch roles | local `develop` branchを作成し、通常開発branchとして `dist/` を追跡対象から外した。`main` はinstall可能な公開入口、tagは検証・固定refとして扱う。公開remoteのdefault branchは `main` であることを2026-07-27に確認した。remote `develop` のpush、branch protection、反映手順の実行は後続で実装する。 |
| GitHub dependency release ref | Phase 12では `git add -f dist/` でbuild済み `dist/` を含めるrefを確認した。タグ無しGitHub dependencyが読む `main` もinstall可能にする方針で、`develop` から `main` への反復可能な公開反映手順はrelease checklistに記録済み。実際の `main` 反映は後続で行う。 |
| release branch / tag | `release/yohak-github-dependency-20260723` と `yohak-github-20260723` を使った。今後の修正では既存tagを上書きせず、新しいrelease branch / tagを作る。 |

## 確認結果

確認日: 2026-07-23

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
  - unit test: 85 passed, 2 skipped
  - integration test: 23 passed
  - browser test: 10 passed
- `test:distribution:local`: pass
  - npm tarball install smoke: pass
  - pnpm tarball install smoke: pass
- `test:github-dependency:local`: pass
  - local release ref smoke: pass
  - local release repositoryのdefault branch `main` をref指定なし `git+file://...` でinstallするsmoke: pass
  - ref指定なし `git+file://...` のlockfileなしfresh install / lockfileありfrozen install / 明示更新smoke: pass
  - npm / pnpm Git ref bootstrap smoke: pass
  - bootstrapしたCLIが生成するrepoのタグ無しGitHub dependency: pass
  - npm Git dependency install smoke: pass
  - pnpm Git dependency install smoke: pass
  - concrete dependency specを注入した `init` 既定install: pass
  - overrideなしの `init` 既定installが、公開 `github:yohak/togostanza` をnpm / pnpm双方で解決できることを確認した。
- public GitHub ref smoke: pass
  - `github:yohak/togostanza#yohak-github-20260723` からnpmでCLIを起動し、`init` の既定installが通ることを確認した。
  - `github:yohak/togostanza#yohak-github-20260723` からpnpm dlxでCLIを起動し、`init` の既定installが通ることを確認した。
- generated repo tagless dependency smoke: pass
  - ローカルCLIから `init --package-manager npm` を実行し、生成repoの既定installが `github:yohak/togostanza` で通ることを確認した。
  - ローカルCLIから `init --package-manager pnpm` を実行し、生成repoの既定installが `github:yohak/togostanza` で通ることを確認した。
- `test:compat:local`: pass
  - local compatibility unit: 3 passed
  - local compatibility browser: 5 passed
    - Emotion style in Shadow DOM smoke
    - metastanza全10 Stanza direct embed smoke
    - TogoMedium全15 Stanza direct embed smoke
    - TogoMedium Web local serve連携 smoke
    - 実 `togostanza-utils` package smoke
- TogoMedium実リポジトリ確認: pass
  - 人間確認として、`dependencies.togostanza` を `github:yohak/togostanza#yohak-github-20260723` へ変更し、意図通り動くことを確認した。

追加確認日: 2026-07-27

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
git diff --check
```

結果:

- `check-all`: pass
  - unit test: 85 passed, 2 skipped
  - integration test: 23 passed
  - browser test: 10 passed
- `test:distribution:local`: pass
- `test:github-dependency:local`: pass
  - local release repositoryのdefault branch `main` をref指定なし `git+file://...` でinstallするsmoke: pass
  - ref指定なし `git+file://...` のlockfileなしfresh install / lockfileありfrozen install / 明示更新smoke: pass
- `git diff --check`: pass

確認時に、既知制約であるSass `@import` deprecation warningは再度出た。Phase 12では失敗扱いにしない。

## 実行しなかったこと

次は外部副作用または公開後環境に関わるため、Phase 12通常作業では実行していない。

- `npm publish`
- GitHub release作成
- npm registry上の `latest` packageを使った確認
- 公開GitHub Pages環境へのlive deploy

## 公開前に残すこと

残作業の一覧は [Phase 12後の残作業](./remaining-work.md) を正とする。

- `version` を公開する値へ更新する。
- `private` を外すタイミングを人間が確認する。
- repository、homepage、bugsのURLを実際の公開リポジトリに合わせて設定する。
- npm publishへ進む場合のみ、`npm publish --dry-run` 相当でtarball内容を再確認する。
- GitHub Actions live deployを行う場合は、対象リポジトリ、公開先、権限、cleanup方針を確認する。

## 注意点

- `references/` 依存確認はローカルcompatibility確認であり、CI再現性は保証しない。
- GitHub dependencyのtagは不変として扱う。修正版を出す場合は新しいtagを作り、Stanzaリポジトリ側のdependency spec更新とlockfile再生成を案内する。
- `pnpm store prune` と `~/Library/Caches/pnpm/dlx` の削除は、過去の初期調整や切り分けで古いcacheを疑う場合のローカル対処であり、公開済みtagの更新手順としては扱わない。
- Sass `@import` 非推奨警告は既知制約であり、Phase 12では失敗扱いにしない。
- `engines.node >=24.5.0` は現状維持だが、公開前にStanza開発者の実環境と照合する。
