# Phase 2-6: GitHub Pages workflow 引き継ぎ

この文書では、Phase 2-6完了後にPhase 3以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-6の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- Phase 1で生成していたGitHub Pages workflow placeholderを、実deploy flowを持つworkflowへ置き換えた。
- `init` が生成する `.github/workflows/publish.yml` に、`push` to `main` と `workflow_dispatch` のtriggerを持たせた。
- workflowに `contents: read`、`pages: write`、`id-token: write` のpermissionsを持たせた。
- workflowにPages deploy用のconcurrency設定を持たせた。
- workflowを `build` jobと `deploy` jobに分けた。
- `build` jobで依存インストール、`togostanza build`、`dist/` のPages artifact uploadを行うようにした。
- `deploy` jobでupload済みartifactをGitHub Pagesへdeployするようにした。
- npm向けworkflowでは `npm ci` と `npm exec togostanza build` を使うようにした。
- pnpm向けworkflowでは `pnpm/action-setup` でpnpm 10系を用意し、`pnpm install --frozen-lockfile` と `pnpm exec togostanza build` を使うようにした。
- npm向けworkflowにpnpm固有stepが混ざらないことを確認した。
- pnpm向けworkflowに `npm ci` が混ざらないことを確認した。
- `init --name <dir> --package-manager npm` でnpm向けworkflowを生成することを確認した。
- `init --name <dir> --package-manager pnpm` でpnpm向けworkflowを生成することを確認した。
- `init . --package-manager pnpm` でpnpm向けworkflowを生成することを確認した。
- 既存 `pnpm-lock.yaml` がある `init .` でpnpm向けworkflowを生成することを確認した。
- `--skip-install` / `--skip-git` の有無に関わらずworkflowを生成することを確認した。
- Phase 1のplaceholder文言が生成workflowに残らないことを確認した。
- 生成workflowで使うAction tagが、実装時点でGitHub上のtagとして存在することを確認した。
- 001ケースREADMEに、Phase 2-6で確認したリメイク版workflow観測、Action tag、lockfile前提、現行版との差分を記録した。

## 意図的に残したこと

- GitHub Actions上でのlive deploy確認。
- 公開npm packageとしての `dependencies.togostanza` 解決確認。
- GitHub repository設定やPages有効化の自動変更。
- Pages source設定、custom domain、CNAME生成。
- README内のGitHub Pages有効化手順。
- `init --skip-install` 直後にlockfileが無い場合の案内改善。
- `package.json` への `scripts.build` 生成。
- `package.json` への `packageManager` field生成。
- GitHub ActionsのAction version更新方針の運用化。
- GitHub Actionsのjob名、trigger、Actionバージョン、YAML構造の外部互換固定。
- Phase 2全体のhandoff。

## Phase 3以降で使う前提

- `init` が生成するStanzaリポジトリには、GitHub Pages公開用workflowが含まれる。
- workflowは、生成されたリポジトリの依存をインストールし、ローカル依存として入る `togostanza` 経由で `togostanza build` を実行する。
- workflowは、global installされた `togostanza` やGitHub Actions runnerに偶然存在するCLIには依存しない。
- workflowは `dist/` をそのままPages artifactにする。
- workflowは `dist/` 内のURLを書き換えない。
- `dist/` 生成物のサブパス安全性は、Phase 2-1からPhase 2-5で成立させたbuild / runtime側の責務である。
- npm向けworkflowは `package-lock.json` がcommitされている前提で `npm ci` を使う。
- pnpm向けworkflowは、pnpm 10系で生成した `pnpm-lock.yaml` がcommitされている前提で `pnpm install --frozen-lockfile` を使う。
- `--skip-install` で初期化した場合、Stanza開発者が後から `npm install` またはpnpm 10系の `pnpm install` を実行し、lockfileをcommitしてからpushする必要がある。
- live deploy成功は、公開npm package解決が必要になるためPhase 5で棚卸しし、配布前検証としてはPhase Xの責務である。

## Phase 3以降で注意すること

- Phase 2-6のworkflowは、公開後のdependency解決を前提にした正しいinstall / build / upload / deploy手順を生成するところまでを完了条件にしている。GitHub Actions上での成功までは確認していない。
- `dependencies.togostanza` はPhase 2-6時点では `^0.0.0` で生成される。公開npm packageとして解決できる状態はPhase 5で棚卸しし、Phase Xで扱うか判断する。
- pnpm向けworkflowはpnpm 10系を明示する。別versionのpnpmで生成したlockfileがGitHub Actions上のpnpm 10系で読めるかどうかは、Phase 2-6では互換契約として広げていない。
- Action major tagは実装時点で確認済みだが、外部互換契約ではない。GitHub Actions側の推奨が変わった場合は保守更新として扱ってよい。
- GitHub repositoryのPages設定やcustom domainはworkflow生成の範囲外である。後続でREADME案内を追加する場合は、この制約を明記する。
- `test:browser` を含む完了前確認は、引き続き `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認する。

## 後続判断として残すこと

- GitHub Actions上でのlive deploy確認をいつ行うか。
- 公開npm packageとしての `togostanza` 解決確認。
- npm公開metadata、`exports`、`files`、`private` 解除をPhase 5で棚卸しし、Phase Xで扱うか判断すること。
- README内のGitHub Pages有効化手順。
- lockfileが無い状態でpushした場合の案内改善。
- `package.json` に `scripts.build` を生成するかどうか。
- `package.json` に `packageManager` fieldを生成するかどうか。
- Action version更新の運用方針。
- Phase 2全体のhandoff。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `mise exec -- pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは62件、integration testは18件、browser testは6件が通った。
- GitHub Actions上でのlive deployは、Phase 2-6の対象外として未確認。

## 関連commit

- `a026607 docs: add phase 2-6 workflow plan`
- `844df52 feat: implement phase 2-6 pages workflow`
