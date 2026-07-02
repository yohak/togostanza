# Phase 12: GitHub dependency distribution 設計

Phase 12は、リメイク版パッケージを短期的にGitHub dependencyとしてインストールできる形へ寄せるフェーズである。

このフェーズでは `npm publish` を行わない。Stanza開発者が自分の `package.json` に次のようなdependencyを書き、`npm install` または `pnpm install` で `togostanza` を解決できることを主なゴールにする。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza#<tag-or-sha>"
  }
}
```

## 前提

Phase 12の前半では、ローカルtarballによる `pack -> install -> 実行` smokeをすでに確認している。この確認結果は [Phase 12: distribution 引き継ぎ](./handoff.md) に記録している。

ただし、その時点の計画は将来のnpm配布を主な想定にしていた。現在の短期方針では、npm registryへの公開ではなく、GitHub dependency installを先に成立させる。そのため、Phase 12の後半ではpackage layoutとrelease運用を見直す。

Phase 12へ入る前の再確認として、次が完了している。

- `mise exec -- pnpm run check-all`: pass。
- `mise exec -- pnpm run test:compat:local`: pass。
- ローカルtarball install smoke: pass。
- Phase 11-2で観測された低頻度build flakeは、直近再実行では再現していない。
- `references/` 依存確認はローカルcompatibility確認であり、CI再現性はPhase 12の前提にしない。

## 目的

- 本リポジトリのmain側も、リリースを意識したroot package layoutへ移行する。
- GitHub dependency install時に、repo rootがそのまま `togostanza` packageとして成立する状態にする。
- `npm publish` やinstall時buildに依存せず、release branch / tagでbuild済み `dist/` を提供する運用を決める。
- 通常開発branchでは `dist/` を持たず、release branch / tagだけに `dist/` を含める境界を明確にする。
- `docs/`、`workbench/`、`references/` は本リポジトリに残しつつ、install対象と通常品質確認対象から外す。
- Phase 12完了後に、Stanza開発者がGitHub dependencyでインストールして `togostanza` を使える確認結果と手順を残す。

## 完了条件

- root package layoutへ移行している。
  - `package/package.json` はrootの `package.json` へ移っている。
  - `package/pnpm-lock.yaml` はrootの `pnpm-lock.yaml` へ移っている。
  - `package/mise.toml` はrootの `mise.toml` へ移っている。
  - 実装、test、scriptsは `src/` 配下へ集約されている。
  - `bin/` はroot直下に残り、GitHub dependency install後のCLI入口として機能する。
- root packageはNode workspaceとして扱わない。
- 通常の品質確認はrootで `mise exec -- pnpm run check-all` を実行する形へ移っている。
- 品質確認対象は原則として `src/` と `bin/`、必要な設定ファイルに限定されている。
- `docs/`、`workbench/`、`references/` は通常の `check-all` に含めない。
- GitHub dependency install用のrelease branch / tag運用が文書化されている。
- install時buildは使わない方針が文書化されている。
- release branch / tagにはbuild済み `dist/` を含める方針が文書化されている。
- install対象は `package.json.files` で最小化されている。
- npm / pnpmの一時Stanzaリポジトリから、GitHub dependencyとして `togostanza` をインストールできることを確認している。
- GitHub dependency install後に、少なくとも `togostanza --version`、`init`、`generate stanza`、`build` を確認している。
- 生成repoの `dependencies.togostanza` が、GitHub dependency specを扱える形になっている。
- Phase 12完了後にhandoffを更新する。

## 含めるもの

- root package layout migration。
- `package/` 直下にあった実パッケージのroot移行。
- `src/` 配下への実装、test、scripts集約。
- root実行の品質確認手順。
- `docs/setup/package-layout.md`、`docs/setup/quality.md`、`docs/UBIQUITOUS_LANGUAGE.md`、`AGENTS.md` の方針更新。
- GitHub dependency install smoke。
- release branch / tag運用の文書化。
- 生成repoの `dependencies.togostanza` spec方針の更新。
- 必要に応じた `test:distribution:local` のGitHub dependency対応。

## 12-0実装上の注意

Phase 12-0は、Phase 12の中で最も破壊的なファイル移動を含む。
このサブフェーズは単独コミット、単独レビュー対象として扱い、GitHub dependency smokeやrelease branch/tag運用には進まない。

## 含めないもの

- `npm publish` の実行。
- npm registry上の `latest` packageを使った確認。
- GitHub Packages npm registryへの公開。
- CI化。
- `references/` の自動取得、更新、submodule化。
- ヘルププレビューUIのリッチ化。
- CLI status / result messagesの全面整理。
- root package化に合わせたワークスペース化。

CLI status / result messagesは、Phase 12で通常利用の観測として不足が見つかった場合だけ、配布前に必要な最小修正を行う。全体の文言体系や診断スタイルの整理はFuture扱いにする。

## 基本方針

### root package layout

Phase 12-0以降、本リポジトリのrootをインストール可能な `togostanza` packageとして扱う。

想定レイアウト:

```text
package.json
pnpm-lock.yaml
mise.toml
tsconfig.json
tsconfig.build.json
playwright.config.ts
bin/
src/
  cli/
  runtime/
  test/
  scripts/
docs/
workbench/
references/
```

`docs/`、`workbench/`、`references/` は本リポジトリに残す。ただし、root packageはworkspace化しない。これらの配下にある `package.json` は、リファレンスまたは検証環境の入力として扱い、root packageの管理対象に含めない。

### 品質確認対象

root package化後の標準確認はrootで実行する。

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
```

ただし、対象範囲は原則として `src/`、`bin/`、設定ファイルに限定する。`docs/`、`workbench/`、`references/` は通常の `check-all` には含めない。

### GitHub dependency release

短期的な配布経路はGitHub dependencyとする。

```json
{
  "dependencies": {
    "togostanza": "github:yohak/togostanza#<tag-or-sha>"
  }
}
```

GitHub dependency install時にbuildを行わない。`prepare` やinstall scriptで `dist/` を作る設計は採用しない。

通常開発branchでは `dist/` をcommitしない。GitHub dependency向けのrelease branch / tagにだけ、build済み `dist/` を含める。

### install対象

install対象は最小化する。

```json
{
  "files": [
    "bin/",
    "dist/"
  ]
}
```

`docs/`、`workbench/`、`references/`、`src/`、test、scripts、設定ファイルは通常のinstall対象に含めない。ただし、GitHub repository dependencyでは取得元repo自体にこれらのファイルが存在するため、package managerが実際にどの範囲をpack/installするかはPhase 12-1のsmokeで確認する。

## サブフェーズ

### Phase 12-0: root package layout migration

目的は、本リポジトリのmain側をreleaseを意識したroot package layoutへ移行することである。

実施すること:

- `package/package.json` をrootの `package.json` へ移す。
- `package/pnpm-lock.yaml` をrootの `pnpm-lock.yaml` へ移す。
- `package/mise.toml` をrootの `mise.toml` へ移す。
- `package/bin/` をrootの `bin/` へ移す。
- `package/src/` 配下の実装をrootの `src/` へ移す。
- `package/test/` と `package/scripts/` は、品質確認対象を明確にするため `src/test/` と `src/scripts/` へ集約する。
- `tsconfig`、Playwright、Vitest、formatter、lint設定のパスを更新する。
- `tsconfig.build.json` は、配布物にtest helperや開発用scriptをemitしないようにする。
  - `src/test/**` はbuild出力から除外する。
  - `src/scripts/**` はinstall対象に含める必要がない限りbuild出力から除外する。
  - `*.spec.ts` の除外だけに依存しない。
- `bin/togostanza.mjs` から `dist/cli.js` への参照がroot基準で成立するようにする。
- `check-all` と個別scriptをroot実行に切り替える。
- `docs/setup/package-layout.md` と `docs/setup/quality.md` を新しい前提へ更新する。
- `AGENTS.md` の `package/` 前提をroot package前提へ更新する。
- `test:distribution:local` はtarball smokeとして残し、root移行後も通るようにする。
  - tarball smokeでは、`dist/test/` やtest supportがpack/install対象に混入していないことを確認する。

完了確認:

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
mise exec -- pnpm run test:distribution:local
git diff --check
```

このサブフェーズでは、GitHub dependency install smokeには踏み込まない。ファイル移動と品質確認経路の再配線だけを扱う。

### Phase 12-1: GitHub dependency install smoke

目的は、Stanza開発者の `package.json` からGitHub dependencyとして `togostanza` をインストールできることを確認することである。

確認すること:

- GitHub dependencyとして参照するspec。
  - 例: `github:yohak/togostanza#<tag-or-sha>`
  - `main` 直指定ではなく、tagまたはcommit SHAを優先する。
- npm環境でGitHub dependencyをinstallし、CLIが起動すること。
- pnpm環境でGitHub dependencyをinstallし、CLIが起動すること。
- GitHub dependency install後のCLIで、少なくとも次を確認する。
  - `togostanza --version`
  - `togostanza init`
  - `togostanza generate stanza`
  - `togostanza build`
- `import Stanza from "togostanza/stanza"` と `import { defineTogoStanzaConfig } from "togostanza/config"` が、GitHub dependency install後に解決できること。

必要に応じて、既存の `test:distribution:local` をGitHub dependency smokeへ拡張する。ただし、外部GitHubへpushやtag作成が必要な確認は、人間の明示承認を受けてから扱う。

`test:distribution:local` はGitHub dependency smokeへ置き換えない。tarball smokeはpush不要でpackage surface、`files`、`exports`、型解決、実行時解決をローカルで守れるため、Phase 12後も維持する。GitHub dependency smokeは別の確認として追加する。

push済みGitHub refを使う前に、必要であれば `git+file://<local-clone>#<ref>` 形式でGitHub dependencyに近い経路をローカル確認する。真の `github:...#<tag-or-sha>` 解決、release branch push、tag作成は外部副作用を伴うため、人間の明示承認を受けてから扱う。

Phase 12-1では `test:github-dependency:local` を追加し、一時git repositoryにbuild済み `dist/` を含むrelease refを作って `git+file://...#ref` からnpm / pnpm installできることを確認する。

### Phase 12-2: release branch / tag operation

目的は、通常開発branchとGitHub dependency向けrelease refの違いを手順として固定することである。

方針:

- 通常開発branchでは `dist/` をcommitしない。
- GitHub dependency向けのrelease branch / tagにはbuild済み `dist/` を含める。
- install時buildは行わない。
- Stanza開発者にはtagまたはcommit SHA固定を推奨する。
- root移行後も `.gitignore` は通常開発branchの `dist/` を無視する。
- release branch / tagに `dist/` を含める具体機構を固定する。
  - 採用機構は `git add -f dist/` とする。
  - release branch用 `.gitignore` 差し替えやorphan release branchは、Phase 12時点では採用しない。
  - 採用した機構で、参照先refに `dist/` が実際に含まれることをGitHub dependency smokeで確認する。

文書化すること:

- release branchを作る手順。
- `dist/` を生成してrelease branchへ含める手順。
- `.gitignore` と `dist/` 同梱の関係。
- tagを作る場合の命名方針。
- tag / SHAを生成repoの `dependencies.togostanza` へ反映する方法。
- release branch / tag作成後のnpm / pnpm install確認。
- rollbackまたは差し替えが必要な場合の手順。

### Phase 12-3: generated repo dependency readiness

目的は、`init` が生成するStanzaリポジトリがGitHub dependency運用に乗れる状態にすることである。

採用する方針:

- generated repoの `dependencies.togostanza` は、通常生成では `github:yohak/togostanza#<tag-or-sha>` を書く。
  - 実release tagまたはcommit SHAが決まるまでは、人間が後から差し替えるplaceholderとして扱う。
  - `main` 直指定は推奨しない。
- local smoke、release手順、実GitHub ref確認では `TOGOSTANZA_DEPENDENCY_SPEC` で具体dependency specを注入できるようにする。
  - `git+file://...#ref` のlocal smokeでも同じ経路を使う。
  - このoverrideは配布検証とrelease運用のための入口であり、Stanza開発者向けの通常操作としてはREADMEのGitHub dependency specを正とする。
- READMEには、`<tag-or-sha>` をTogoStanzaのrelease tagまたはcommit SHAへ差し替えてからinstallすることを書く。
- GitHub Pages workflowがGitHub dependency installで通る前提をどう説明するか。
- pnpm 10系lockfile前提と、GitHub dependency specのlockfile再現性をREADMEで案内する。

### Phase 12-4: final verification and handoff

目的は、Phase 12のGitHub dependency distributionとしての結果を閉じることである。

確認すること:

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
```

加えて、Phase 12-1で決めたGitHub dependency install smokeを実行する。

handoffには次を記録する。

- root package layout migrationの結果。
- GitHub dependency install smokeの結果。
- npm / pnpmそれぞれの確認結果。
- release branch / tag運用。
- generated repoの `dependencies.togostanza` 判断。
- 実行しなかった外部操作と、その理由。
- 次に人間が行うrelease操作。

## 検証コマンド

Phase 12-0以降、Node.js / pnpmコマンドはrootの `mise.toml` を正として実行する。

基本確認:

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
git diff --check
```

GitHub dependency install smokeの具体コマンドは、Phase 12-1で実装する手順またはscriptを正とする。sandbox環境ではなく、ユーザーのローカル環境で承認付き通常実行を優先する。

## 決定済み事項

- `npm publish` は短期対象外。
- GitHub Packages npm registryは使わない。
- Stanza開発者向けの短期配布経路はGitHub dependencyとする。
- main側もroot package layoutへ移行する。
- root packageはworkspace化しない。
- 実装、test、scriptsは `src/` 配下へ集約する。
- `bin/` はroot直下に残す。
- 通常の品質確認対象は原則として `src/` と `bin/`、必要な設定ファイルに限定する。
- `docs/`、`workbench/`、`references/` は本リポジトリに残すが、通常の `check-all` とinstall対象には含めない。
- GitHub dependency install時のbuildは行わない。
- 通常開発branchでは `dist/` をcommitしない。
- GitHub dependency向けrelease branch / tagにはbuild済み `dist/` を含める。
- install対象は `files` で最小化する。

## 残す論点

- release branch名とtag名。
- 実releaseで使うtag名またはcommit SHA。
- GitHub dependency smokeを完全自動scriptにするか、手順化に留めるか。
- `private: true` をGitHub dependency運用で維持するか。npm publishしない限りaccidental publish防止としては維持できるが、GitHub dependency installへの影響は確認する。
- `engines.node >=24.5.0` を維持するか。
