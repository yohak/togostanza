# Phase 2-6: GitHub Pages workflow 設計

Phase 2-6は、Phase 1で生成していたGitHub Pages workflow placeholderを、Phase 2で成立した `dist/` 生成物を公開する実deploy workflowへ置き換えるサブフェーズである。

このサブフェーズでは、`init` が生成する `.github/workflows/publish.yml` を扱う。`build` 生成物、ランタイム、asset解決、Stanza間連携はPhase 2-5までの成果を前提にし、workflow内でそれらを再実装しない。

## 目的

- `init` 直後のStanzaリポジトリから、GitHub Pagesへ公開する導線を成立させる。
- Phase 1のplaceholder workflowを、依存インストール、`togostanza build`、Pages artifact upload、deployを持つworkflowへ置き換える。
- `--package-manager npm|pnpm` に応じて、GitHub Actions上のインストール手順とbuild実行手順を切り替える。
- Phase 2で確認した `dist/` 生成物を、Pages artifactとしてそのまま公開対象にする。
- 001ケースREADMEに、Phase 2-6で確認したリメイク版workflow観測結果を記録する。

## 完了条件

- `init --name <dir> --package-manager npm` が、npm向けの実deploy workflowを生成する。
- `init --name <dir> --package-manager pnpm` が、pnpm向けの実deploy workflowを生成する。
- `init . --package-manager pnpm` と、既存 `pnpm-lock.yaml` がある `init .` でもpnpm向けworkflowが生成される。
- workflow生成は、`--skip-install` と `--skip-git` の有無に依存しない。
- npm向けworkflowには、Node.js setup、`npm ci`、`npm exec togostanza build`、`dist/` のPages artifact upload、Pages deployの流れがある。
- pnpm向けworkflowには、Node.js setup、pnpm setup、`pnpm install --frozen-lockfile`、`pnpm exec togostanza build`、`dist/` のPages artifact upload、Pages deployの流れがある。
- workflowは、`pages: write` と `id-token: write` を含むPages deploy用permissionsを持つ。
- workflowは、`dist/` をartifact pathとして使う。
- workflowは、GitHub Pages側のサブパス配信を前提にし、生成物側の相対URL契約を壊す追加変換を行わない。
- workflowは、GitHub repository設定、Pages有効化、custom domain、CNAME生成を自動化しない。
- packageのunit testで、npm / pnpmそれぞれのworkflow内容を確認する。
- bin entry経由のintegration testで、npm / pnpmそれぞれのworkflowが生成されることを確認する。
- 001ケースREADMEに、実行したリメイク版コマンド、workflow内容、現行版との差分、後続へ送る事項を記録する。

## 含めるもの

- `formatWorkflowPlaceholder()` の実deploy workflow化。
- npm向けworkflow生成。
- pnpm向けworkflow生成。
- `init --name <dir>` と `init .` のworkflow生成確認。
- `--skip-install` / `--skip-git` とworkflow生成が独立していることの確認。
- workflow内のinstall command、build command、artifact path、deploy actionの確認。
- 001ケースのリメイク版観測更新。

## 含めないもの

- GitHub Actions上での実deploy実行。
- GitHub repository設定やPages有効化の自動変更。
- custom domain、CNAME、Pages build source設定の自動変更。
- GitHub APIや `gh` CLIを使ったlive確認。
- ローカルtarballを使ったnpm/pnpm実インストール確認。
- 公開npm packageとしての `togostanza` 解決確認。
- `node_modules/` や実install結果としてのlockfile生成確認。
- GitHub Actionsのjob名、trigger、Actionバージョン、YAML構造の外部互換固定。
- `build` 生成物の再設計。
- `serve` の実装。
- Phase 2全体のhandoff。

## 実装順

### 2-6a workflow contract

2-6aでは、生成するworkflowの最小契約を固定する。

対象:

- `push` to `main` と `workflow_dispatch` のtrigger。
- Pages deployに必要なpermissions。
- 同時deployを避けるconcurrency。
- `build` jobと `deploy` job。
- `dist/` をPages artifactとしてuploadする流れ。
- deploy jobがupload済みartifactをGitHub Pagesへdeployする流れ。

workflowの細部は外部互換として固定しない。ただし、Phase 2-6の実装とテストでは、Stanza開発者が生成直後のリポジトリをGitHub Pagesへ公開する導線として読める程度の具体性を持たせる。

Phase 2-6時点では、GitHub公式のcustom workflow例に寄せて、次のActionを使う方針にする。

- `actions/checkout`
- `actions/setup-node`
- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`
- pnpm向けには `pnpm/action-setup`

Actionのmajor tagは、Phase 2-6実装直前にGitHub上で実在と解決可能性を確認してから固定する。文字列テストだけでは存在しないAction versionを検出できないため、実装時には各Action repositoryのtag一覧、またはGitHub APIで想定する `owner/repo@major` が存在することを確認し、その確認結果を001ケースREADMEまたはhandoffに記録する。

2026-06-30時点で確認した候補は次の通りである。

- `actions/checkout@v7`
- `actions/setup-node@v6`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`
- `pnpm/action-setup@v6`

Actionのバージョンは、Phase 2-6実装時点の生成内容としてテストする。リメイク版仕様上の外部互換契約にはしない。

### 2-6b package manager specific generation

2-6bでは、npm / pnpm別のinstallとbuild commandを生成する。

npm向けworkflow:

- Node.js 24をセットアップする。
- npm cacheは使ってよいが、cache挙動は外部互換にしない。
- `npm ci` で依存をインストールする。
- `npm exec togostanza build` で `dist/` を生成する。

pnpm向けworkflow:

- Node.js 24をセットアップする。
- 実装時に確認した `pnpm/action-setup@<major>` でpnpmを用意する。
- `pnpm install --frozen-lockfile` で依存をインストールする。
- `pnpm exec togostanza build` で `dist/` を生成する。

リメイク版の `init` は `package.json` の `packageManager` fieldを書かない方針である。そのため、pnpm向けworkflowではGitHub Actions上でpnpmを明示的に用意する。Phase 2-6では、生成workflowのpnpm versionを `10` 系にする。

pnpm向けworkflowが `pnpm install --frozen-lockfile` を使う以上、Stanza開発者がcommitする `pnpm-lock.yaml` もpnpm 10系で生成する前提にする。別versionのpnpmで生成したlockfileがGitHub Actions上のpnpm 10系で読めるかどうかは、Phase 2-6では互換契約として広げない。将来 `packageManager` fieldを生成する判断をする場合は、その時点でworkflowとlockfile生成案内も見直す。

### 2-6c tests / case update

2-6cでは、生成workflowの確認と001ケース更新を行う。

対象:

- unit testで、npm向けworkflowに `npm ci`、`npm exec togostanza build`、`actions/upload-pages-artifact`、`actions/deploy-pages`、`path: dist` が含まれることを確認する。
- unit testで、pnpm向けworkflowに `pnpm/action-setup`、`pnpm install --frozen-lockfile`、`pnpm exec togostanza build`、`actions/upload-pages-artifact`、`actions/deploy-pages`、`path: dist` が含まれることを確認する。
- unit testで、placeholder文言が残っていないことを確認する。
- 実装前または実装時に、生成workflowで使うAction major tagがGitHub上に存在することを確認する。
- integration testで、bin entry経由の `init --package-manager npm` と `init --package-manager pnpm` が実deploy workflowを生成することを確認する。
- integration testで、bin entry経由の `init . --package-manager pnpm` がpnpm向けworkflowを生成することを確認する。
- integration testで、既存 `pnpm-lock.yaml` がある `init .` がpnpm向けworkflowを生成することを確認する。
- 001ケースREADMEに、Phase 2-6で確認したリメイク版workflow観測結果を追記する。
- 必要なら002ケースREADMEに、workflowが公開対象として使う `dist/` はPhase 2-1以降で確認済みの生成物であることを補足する。

YAML parserの導入は必須にしない。Phase 2-6では、生成workflowはTogoStanza側の固定テンプレートであり、unit / integrationでは主要な観測点を文字列として確認する。将来workflow生成が複雑化する場合は、YAML parserを導入して構造検証へ移行してよい。

## workflow方針

`init` が生成する `.github/workflows/publish.yml` は、Stanzaリポジトリの開発契約として扱う。Stanza利用者がWebページで見るランタイム契約ではない。

workflowは、生成されたリポジトリの依存をインストールし、ローカルに入った `togostanza` dependency経由で `togostanza build` を実行する。global installされた `togostanza` や、GitHub Actions runnerに偶然存在するCLIには依存しない。

Phase 2-6では、workflowの形を実deploy flowへ置き換える。ただし、GitHub Actions上で `dependencies.togostanza` が公開npm packageとして実際に解決できることはPhase 5 distributionの責務である。Phase 2-6の完了条件は、生成workflowが公開後のdependency解決を前提にした正しいinstall / build / upload / deploy手順を持つことであり、live deploy成功ではない。

`dist/` 生成物は、Phase 2-1からPhase 2-5で成立させた公開用生成物としてそのままartifactにする。workflow側で `dist/` 内のURLを書き換えたり、Pages用の追加buildを行ったりしない。

`actions/configure-pages`、`actions/upload-pages-artifact`、`actions/deploy-pages` を使うが、Actionの細部はリメイク版仕様として固定しない。後続でGitHub Actionsの推奨versionが変わった場合は、互換破壊ではなく保守更新として扱えるようにする。

GitHub Pagesを有効化するrepository setting、公開branch/source設定、custom domain、CNAMEはPhase 2-6では扱わない。Stanza開発者がGitHub側でPagesを有効化すれば、生成workflowが `dist/` をdeployする導線を持つことを完了条件にする。

## npm / pnpm方針

npmでは、lockfileが存在する前提の再現可能インストールとして `npm ci` を使う。`init --skip-install` 直後は `package-lock.json` が存在しない可能性があるが、Phase 1で決めたとおり、実インストールとlockfile生成はStanza開発者が後から行う。workflowは、GitHubへpushする前にlockfileを生成してcommitする前提にする。

pnpmでは、`pnpm-lock.yaml` が存在する前提の再現可能インストールとして `pnpm install --frozen-lockfile` を使う。`init --skip-install` 直後は `pnpm-lock.yaml` が存在しない可能性があるが、npmと同じく、Stanza開発者が後からpnpm 10系で `pnpm install` を実行してlockfileをcommitする前提にする。

Phase 2-6では、workflow内でlockfileが無い場合にinstall commandを緩める処理は入れない。これは、CI上の依存解決を再現可能にするためである。lockfile未生成時のREADME案内や初期setup手順は、必要なら後続で整える。

## 001ケース更新方針

001ケースでは、リメイク版で次を確認する。

- `init --name generated-repo --package-manager npm --skip-install --skip-git` がnpm向けworkflowを生成すること。
- npm向けworkflowに、Node.js setup、`npm ci`、`npm exec togostanza build`、Pages artifact upload、Pages deployが含まれること。
- `init --name generated-repo --package-manager pnpm --skip-install --skip-git` がpnpm向けworkflowを生成すること。
- pnpm向けworkflowに、pnpm setup、`pnpm install --frozen-lockfile`、`pnpm exec togostanza build`、Pages artifact upload、Pages deployが含まれること。
- `init . --package-manager pnpm` でpnpm向けworkflowが生成されること。
- 既存 `pnpm-lock.yaml` がある `init .` でpnpm向けworkflowが生成されること。
- Phase 1のplaceholder文言が残らないこと。
- default initでinstallまで実行した場合は、選択したパッケージマネージャーのlockfileが生成され、そのlockfileをcommitしてからpushする前提でworkflowが動くこと。
- pnpm向けworkflowではpnpm 10系を使うため、`pnpm-lock.yaml` もpnpm 10系で生成してcommitする前提であること。
- `--skip-install` の場合はlockfileが生成されないため、Stanza開発者が `npm install` またはpnpm 10系の `pnpm install` を実行し、lockfileをcommitしてからpushする必要があること。
- 実GitHub Actions実行やGitHub Pagesへのlive deployはPhase 2-6では行わないこと。

現行版との差分として、pnpm向けworkflowをリメイク版で正式に生成することを記録する。現行版では `init --package-manager` の選択肢がnpm/yarnであり、pnpm向けworkflowは観測対象外だった。

## 検証計画

### unit test

- npm向けworkflowが実deploy flowを含む。
- pnpm向けworkflowが実deploy flowを含む。
- npm向けworkflowにpnpm固有stepが混ざらない。
- pnpm向けworkflowに `npm ci` が混ざらない。
- workflowに `path: dist` が含まれる。
- workflowにPages deploy用permissionsが含まれる。
- workflowにplaceholder文言が残らない。
- `--skip-install` / `--skip-git` でもworkflow内容が変わらない。
- 生成workflowで使うAction major tagは、実装時点でGitHub上に存在するものにする。

### integration test

- bin entry経由の `init --package-manager npm` が実deploy workflowを生成する。
- bin entry経由の `init --package-manager pnpm` が実deploy workflowを生成する。
- bin entry経由の `init . --package-manager pnpm` がpnpm向け実deploy workflowを生成する。
- bin entry経由で、既存 `pnpm-lock.yaml` がある `init .` がpnpm向け実deploy workflowを生成する。
- 既存のbuild、runtime、asset、Stanza間連携のintegration / browser testが退行しない。

### documentation

- 001ケースREADMEにリメイク版観測結果を追記する。
- 必要なら002ケースREADMEに、workflowが `dist/` を公開対象にする前提を補足する。
- Phase 2-6完了後にhandoffを作る。

## 後続へ送る事項

- GitHub Actions上でのlive deploy確認。
- 公開npm packageとしての `togostanza` 解決確認。
- Pages repository設定、Pages source設定、custom domain、CNAME生成。
- README内のGitHub Pages有効化手順。
- `init --skip-install` 直後にlockfileが無い場合の案内改善。
- `package.json` に `scripts.build` や `packageManager` fieldを生成するかどうか。
- GitHub ActionsのAction version更新方針。
- Phase 2全体のhandoff。

## 確認コマンド

- `git diff --check`
- `cd package && mise exec -- pnpm run check-all`

packageの品質確認やbrowser testは、sandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
