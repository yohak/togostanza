# Phase 12: distribution 設計

Phase 12は、リメイク版パッケージを配布物として扱えるかを確認し、公開前に必要なpackage surface、生成repo、GitHub Pages導線を最終整理するフェーズである。

このフェーズでは、まずローカルtarballによる `pack -> install -> 実行` smokeを行う。`npm publish`、tag作成、GitHub release作成、`latest` として公開されたpackageの実利用確認は、この計画の実行対象にしない。外部副作用がある操作は、別途人間の明示承認を受けてから扱う。

## 前提

Phase 12へ入る前の再確認として、次が完了している。

- `cd package && mise exec -- pnpm run check-all`: pass。
- `cd package && mise exec -- pnpm run test:compat:local`: pass。
- git working treeはclean。
- Phase 11-2で観測された低頻度build flakeは、直近再実行では再現していない。
- `references/` 依存確認はローカルcompatibility確認であり、CI再現性はPhase 12の前提にしない。

## 目的

- ローカルtarballで、配布物としてCLIをinstallして実行できることを確認する。
- `bin`、`exports`、型定義、`files`、runtime path、dependency分類がtarball install後も成立することを確認する。
- 生成repoの `dependencies.togostanza` version spec、`packageManager` field、GitHub Pages workflowの運用制約を最終判断する。
- npm公開metadata、`private` の扱い、`engines.node` の下限を公開前の判断材料として整理する。
- Phase 12後に残す外部操作、release手順、rollback、権限管理を明確にする。

## 完了条件

- `pnpm pack` で作成したtarballの内容を確認し、不要なtest / docs / workbench / referencesを含めていない。
- tarballを別ディレクトリのnpm環境へinstallし、`npm exec -- togostanza --version` 相当のCLI起動ができる。
- tarballを別ディレクトリのpnpm環境へinstallし、`pnpm exec togostanza --version` 相当のCLI起動ができる。
- tarball install後のCLIで、少なくとも `init`、`generate stanza`、`build` を実行できる。
- tarball install後のStanzaリポジトリで、`import Stanza from "togostanza/stanza"` と `import { defineTogoStanzaConfig } from "togostanza/config"` の型解決と実行時解決を確認している。
- 生成repoの `dependencies.togostanza` version specを、公開後の解決に使える形として最終判断している。
- `private`、`files`、`exports`、root export / `main` / top-level `types`、`engines.node`、npm公開metadataの扱いを記録している。
- `npm` と `pnpm` のlockfile、pnpm 10系、`packageManager` field、GitHub Pages workflowの運用制約をREADMEまたはhandoffへ記録している。
- GitHub Actions live deploy確認を実施するか、公開後または別承認作業へ残すかを明記している。
- Phase 12完了後にhandoffを作る。

## 含めるもの

- `docs/implementation/phase-12/plan.md` の追加。
- `docs/implementation/index.md` のPhase 12着手状態への更新。
- ローカルtarballを使ったnpm / pnpm install smoke。
- package公開面の最終整理。
- 生成repo dependency specとworkflow運用制約の判断。
- 必要に応じた `workbench/cases/014-distribution-smoke/` の追加。
- 必要に応じたpackage側testまたは手順化されたdistribution smoke scriptの追加。
- Phase 12完了後の `docs/implementation/phase-12/handoff.md`。

## 含めないもの

- `npm publish` の実行。
- tag作成。
- GitHub release作成。
- npm registry上の `latest` packageを使った確認。
- CI化。
- `references/` の自動取得、更新、submodule化。
- ヘルププレビューUIのリッチ化。
- CLI status / result messagesの全面整理。

CLI status / result messagesは、Phase 12で通常利用の観測として不足が見つかった場合だけ、配布前に必要な最小修正を行う。全体の文言体系や診断スタイルの整理はFuture扱いにする。

## サブフェーズ

### Phase 12-0: distribution preflight

目的は、Phase 12の入力状態を固定することである。

確認すること:

- `package/package.json` の現状。
- `package/bin/togostanza.mjs` のshebangと `dist/cli.js` 参照。
- `package/dist/` がclean buildで生成されること。
- `exports["./config"]` と `exports["./stanza"]` が公開用wrapperへ向いていること。
- dependencies / devDependenciesの分類。
- `private: true`、`version: 0.0.0`、`engines.node >=24.5.0` の現状。

この段階では公開metadataを先に直し切らない。まずtarball smokeで、何が実際に不足するかを見る。

### Phase 12-1: minimal pack-install smoke

目的は、`pack -> install -> 実行` 未検証を閉じることである。

確認すること:

- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm pack --pack-destination <tmp>`
- tarball内に、少なくとも次が含まれること:
  - `bin/togostanza.mjs`
  - `dist/cli.js`
  - `dist/config.js` / `dist/config.d.ts`
  - `dist/stanza.js` / `dist/stanza.d.ts`
  - build実行時に必要なruntime files
  - `package.json`
- tarball内に、不要な `src/`、`test/`、`workbench/`、`references/` を含めないこと。
- npm環境でtarballをinstallし、CLIを起動すること。
- pnpm環境でtarballをinstallし、CLIを起動すること。
- tarball install後のCLIで `init --name <dir>`、`generate stanza <id>`、`build` を実行すること。

ローカルtarball smokeでは、生成repoの `dependencies.togostanza` が公開npm registryを見に行く問題がある。Phase 12-1では、次の2つを分けて確認する。

- 公開後の生成repoが書くversion specとして正しいか。
- ローカルtarball smokeで同じ生成repoを動かすために、一時的にtarball pathへ差し替える必要があるか。

一時差し替えを行う場合は、その差分を検証手順として明記し、生成repoの通常仕様として扱わない。

### Phase 12-2: package surface and metadata

目的は、公開packageとして読まれる面を整理することである。

判断すること:

- `private` をいつ `false` にするか。
  - accidental publish防止を優先する場合、実際のpublish直前まで `private: true` を維持する。
  - Phase 12中に `private` を外す場合は、publishしないことを検証手順で担保する。
- `files` に含める範囲。
- `exports` の最終形。
  - `./config`
  - `./stanza`
  - root exportを提供するか。
- `main` とtop-level `types` を提供するか。
- npm公開metadata。
  - `description`
  - `license`
  - `repository`
  - `keywords`
  - `homepage`
  - `bugs`
- `engines.node >=24.5.0` を維持するか。
- dependencies / devDependenciesの最終分類。

`togostanza/stanza` はStanzaソースの開発契約であるため、型解決と実行時解決の両方をpack-install smokeで確認する。

### Phase 12-3: generated repo dependency and workflow readiness

目的は、`init` が生成するStanzaリポジトリが公開後に自然に使える状態を確認することである。

判断すること:

- `dependencies.togostanza` のversion spec。
  - 現状は `^0.0.0` 由来であり、publish後の通常解決には不適切な可能性がある。
  - `0.0.0` のまま公開前検証だけを進めるか、公開前にversionを上げるかを決める。
  - `^<version>`、exact version、tag付きpre-releaseのどれを使うかを決める。
- generated repoに `packageManager` fieldを書くか。
- pnpm workflowのpnpm 10系前提を維持するか。
- `--skip-install` で生成したrepoをpushした場合、lockfileなしでworkflowが失敗することをREADMEで十分案内しているか。
- GitHub Actions workflowのAction major tagをこの時点で更新するか。

GitHub Actions live deploy確認は、外部状態を変更する可能性がある。Phase 12で実行する場合は、対象repository、権限、公開先、cleanup方針を別途確認する。実行しない場合は、公開後またはrelease前手順としてhandoffに残す。

### Phase 12-4: distribution documentation and release checklist

目的は、公開直前の人間判断に必要な手順を残すことである。

作成または更新すること:

- package公開前チェックリスト。
- local tarball smoke手順。
- npm publish前に確認するmetadata一覧。
- GitHub Pages live deploy確認手順。
- rollback方針。
- tag / releaseを作る場合の順序。
- Phase 12で実行しなかった外部操作の一覧。

### Phase 12-5: final verification and handoff

目的は、Phase 12の実装・文書・検証結果を閉じることである。

確認すること:

```sh
cd package && mise exec -- pnpm run check-all
cd package && mise exec -- pnpm run test:compat:local
```

加えて、Phase 12で追加したpack-install smokeを実行する。

handoffには次を記録する。

- pack-install smokeの結果。
- npm / pnpmそれぞれの確認結果。
- package surfaceの最終判断。
- version specの最終判断。
- live deployを実行したかどうか。
- 実行しなかった外部操作と、その理由。
- publishする場合に人間が行う最後の手順。

## 検証コマンド

package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。

基本確認:

```sh
cd package && mise exec -- pnpm run check-all
cd package && mise exec -- pnpm run test:compat:local
```

pack smokeの具体コマンドは、Phase 12-1で実装する手順またはscriptを正とする。sandbox環境ではなく、ユーザーのローカル環境で承認付き通常実行を優先する。

Phase 12-1で追加したpack smoke:

```sh
cd package && mise exec -- pnpm run test:distribution:local
```

## 残す論点

- `private` をPhase 12中に外すか、publish直前まで維持するか。
- `version` を `0.0.0` のままpack smokeだけ行うか、公開前提のversionへ更新するか。
- generated repoの `dependencies.togostanza` を `^<version>` のままにするか、pre-releaseやexact versionを使うか。
- root export、`main`、top-level `types` を提供するか。
- GitHub Actions live deployをPhase 12中に実行するか、release前手順として残すか。
- `engines.node >=24.5.0` を維持するか。
