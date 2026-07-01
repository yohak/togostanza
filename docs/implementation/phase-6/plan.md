# Phase 6: workbench executability 設計

Phase 6は、Phase 0からPhase 4で作ったリメイク版CLIを、`workbench` の検証ケースから再現できる形へ整えるフェーズである。

このフェーズではdistribution準備をしない。pack install、公開package metadata、`npm exec togostanza@latest`、`pnpm dlx togostanza@latest` はPhase Xへ送る。Phase 6では、repo-localの `package/bin/togostanza.mjs` を `node` で呼び、検証ケースの入力を実際に動かせる状態にする。

## 目的

- `workbench/cases/*/current-*` にあるケース入力を、リメイク版でも実行しやすい形へ揃える。
- `workbench/cases/*/remake/` に、repo-local CLIを使うリメイク版検証環境を用意する。
- 各ケースの `package.json`、scripts、READMEの手順を、実際に実行できる形へ寄せる。
- 生成repoの `package.json` に `build` / `serve` scriptを追加し、Stanza開発者が自然なpackage scriptで確認できるようにする。
- workbenchでの確認とpackage automated testの役割を分け、READMEだけに依存しない検証入力を増やす。

## 完了条件

- 対象ケースの `remake/generated-repo/package.json` が存在し、repo-local CLIを呼ぶ `build:local` / `serve:local` などのworkbench用scriptsを持つ。
- repo-local CLI scriptは、pack installではなく `node ../../../../../package/bin/togostanza.mjs ...` のように本リポジトリ内のcompiled CLIを直接呼ぶ。
- 対象ケースの `remake/generated-repo` に、ケース観測に必要なStanzaソース、metadata、style、template、asset、fixture HTMLが揃っている。
- 対象ケースのREADMEに、現行版確認とリメイク版確認の作業ディレクトリ、実行script、観測対象、既知差分を記録している。
- `togostanza init` が生成する `package.json` に `scripts.build` / `scripts.serve` 相当を追加するか、追加しない場合はPhase 6中に理由を記録している。
- Phase 6で全ケースを一度に実行可能化しない場合は、対象にしたケースと後続へ送ったケースを明記している。
- Phase 6完了後にhandoffを作る。

## 含めるもの

- `workbench/cases/001-cli-scaffold-and-generate/` のリメイク版確認手順。
- `workbench/cases/002-build-artifacts/` から `007-config-and-resolution/` までのbuild / runtime系ケース入力の整備。
- `workbench/cases/008-react-runtime/` と `009-vue-runtime/` のReact / Vue代表ケース入力の整備。
- `workbench/cases/010-togostanza-utils-compat/` の `togostanza-utils` 代表ケース入力の整備。
- 必要に応じた `011-serve-development-server` のworkbench手順整理。
- `012-real-project-regression` は、Phase 9の実プロジェクト回帰へ送る前提で、Phase 6ではREADME上の入口だけ確認する。
- repo-local CLI scriptの命名、相対パス、実行場所の統一。
- generated repoに追加する `build` / `serve` script。
- READMEのコマンド更新。

## 含めないもの

- pack install smoke。
- tarball生成。
- npm package公開面の `files`、`exports`、`private` 解除、公開metadata整理。
- `togostanza/stanza` の公開exportと型定義。
- dependency分類の最終整理。
- `tsconfig paths` 自動解決やalias移行診断。
- referencesローカル再現手順の完成。
- metastanza / TogoMedium全Stanzaのbuild check。
- 全Stanza browser smoke。
- TogoMedium Webアプリ本体E2E。
- GitHub Actions live deploy。

## 対象ケースの扱い

Phase 6では、対象ケースを次の順で扱う。

1. `001`: `init` と `generate stanza` のリメイク版CLI確認入口を作る。
2. `002`から`007`: Phase 2のbuild / runtime / config / asset観測を、workbench入力として実行できる形へ揃える。
3. `008`から`010`: Phase 4の代表compatibility観測を、最小のworkbench入力として揃える。
4. `011`: `serve` の確認手順を、Phase 3実装後の入口として整理する。
5. `012`: Phase 9へ送る実プロジェクト回帰の入口を維持し、Phase 6で全体再現は行わない。

全ケースを同時に完成させることよりも、各ケースが同じ読み方で実行できることを優先する。

## repo-local CLI script

Phase 6のworkbench scriptsは、リメイク版packageをinstallしない。

repo-local CLI scriptは `package/bin/togostanza.mjs` を直接呼ぶため、`package/dist` がビルド済みであることを前提にする。クリーンチェックアウトから `remake/generated-repo` を動かす手順は、次を基本形にする。

1. `cd package && mise exec -- pnpm run build`
2. 対象ケースの `remake/generated-repo` で `pnpm install`
3. 対象ケースの `remake/generated-repo` で `pnpm run build:local`

1はrepo-local CLIを実行可能にする手順であり、2はStanzaソースがimportするReact、Vue、`togostanza-utils` などのdependencyを用意する手順である。どちらもpack install確認ではない。

基本形:

```json
{
  "scripts": {
    "togostanza:local": "node ../../../../../package/bin/togostanza.mjs",
    "build:local": "node ../../../../../package/bin/togostanza.mjs build",
    "serve:local": "node ../../../../../package/bin/togostanza.mjs serve",
    "generate:stanza:local": "node ../../../../../package/bin/togostanza.mjs generate stanza"
  }
}
```

実際の相対パスは、各 `generated-repo/` から本リポジトリの `package/bin/togostanza.mjs` へ届く値を使う。

`build` / `serve` は、generated repoの利用者向けscriptでもある。`togostanza init` が生成する `package.json` には、Phase 6で次を追加する方針を基本にする。

```json
{
  "scripts": {
    "build": "togostanza build",
    "serve": "togostanza serve"
  }
}
```

workbenchのrepo-local CLI scriptと、生成repoに入れる利用者向けscriptは別物として扱う。前者は本リポジトリ内の検証用であり、`build:local` / `serve:local` のように `:local` suffixを付ける。後者は将来install済みCLIを前提にしたStanza開発者向けであり、`build` / `serve` の名前を使う。

## remake環境の配置

各ケースのリメイク版検証環境は、原則として次の形に寄せる。

```text
workbench/cases/<case>/remake/
  generated-repo/
    package.json
    stanzas/
    fixtures/
```

`current-pnpm/generated-repo/` は現行版観測用として残す。リメイク版確認のために直接書き換えない。

`current-pnpm` と `remake` の入力を完全一致させる必要はない。現行版固有の旧設定や依存がある場合は、同じ観測契約を満たすリメイク版入力へ整理し、その差分をREADMEに記録する。

## 実装方針

### workbench入力

workbenchの `remake/generated-repo` は、package automated testのfixtureをただコピーする場所ではない。検証ケースの観測契約を人間が再実行できる入力として整える。

ただし、package automated testでしか現実的に観測できないものは、READMEにその理由を書く。workbench側は、ケース入力、手順、期待する観測を持つことを優先する。

### scripts

scriptsは、ケースごとに増やしすぎない。

推奨する最小script:

- `build`
- `serve`
- `build:local`
- `serve:local`
- ケース固有に必要な `generate:*`

`serve:fixture` は、ビルド済み生成物を通常のHTMLからdirect embedで読むケースだけに置く。これは `togostanza serve` ではなく、`workbench/scripts/static-fixture-server.mjs` などで `fixtures/*.html` と `dist/` を静的配信するためのscriptである。Stanza開発用サーバー自体を確認する場合は `serve` を使う。

`check` や `test` のような包括scriptは、Phase 6では必須にしない。必要なら後続で、workbench全体のrunnerとして設計する。

### package manager

Phase 6では、workbenchのリメイク版検証環境はpnpmを基本にする。

package配下のコマンドは、従来どおり `cd package && mise exec -- pnpm ...` で実行する。workbench fixture配下のコマンドは、そのfixtureのpackage managerとlockfileに従う。サンドボックス環境でwatcher、browser、serveが不安定な場合は、ユーザーのローカル環境で承認付き通常実行を優先する。

ただし、001はnpm / pnpmの両方を観測するケースなので、`current-npm` と `current-pnpm` の現行版観測は維持する。リメイク版でnpm / pnpm両方の雛形生成を確認するかどうかは、001の詳細実装時に決める。

### dependencies

workbenchの `remake/generated-repo/package.json` は、ケースに必要なdependenciesを明示する。

`togostanza` dependencyは、repo-local CLI scriptでの実行には使わない。Phase 6では `dependencies.togostanza` の値を配布検証の根拠にしない。pack installと実依存解決はPhase Xで扱う。

React、Vue、`togostanza-utils` など、Stanzaソースがimportするdependencyはケース入力として必要な範囲で書く。公開CLIのdependency分類はPhase 7で扱う。

## README更新方針

各ケースREADMEでは、次を分けて書く。

- 現行版観測。
- リメイク版観測。
- workbench入力としての実行手順。
- `remake/generated-repo` の `build:local` / `serve:local` などは、workbench用にrepo-local CLIを呼ぶscriptとして追加していること。
- `remake/generated-repo` の `build` / `serve` は、生成repoの利用者向けscriptとして `togostanza build` / `togostanza serve` を呼ぶこと。
- package automated testで確認済みの内容。
- workbenchでは未確認だが後続フェーズへ送る内容。

READMEは、実装に合わせた成功報告だけにしない。Phase 6時点で実行できないもの、package testだけで確認したもの、後続へ送るものを区別する。

## 検証計画

Phase 6は、文書とworkbench入力の両方を変更する。

最低限:

- `git diff --check`
- `cd package && mise exec -- pnpm run build`

workbench入力またはCLI実装に触れた場合:

- `cd package && mise exec -- pnpm run test:unit`
- 変更したケースの `remake/generated-repo` で `pnpm run build:local`
- `serve` 手順を変更したケースでは、該当する `pnpm run serve:local` または `pnpm run serve:fixture` の起動確認

generated repoの `init` 出力を変更した場合:

- `cd package && mise exec -- pnpm run test:unit`
- `cd package && mise exec -- pnpm run test:integration`
- 必要に応じて `cd package && mise exec -- pnpm run test:browser`

最終確認:

- `cd package && mise exec -- pnpm run check-all`

ブラウザ、watcher、serve確認は、必要に応じてサンドボックス外の通常環境で実行する。

## 残す論点

- 全ケースをPhase 6内で完全に実行可能化するか、Phase 6では001から010までに絞り、011と012を後続へ送るか。
- workbench全体のrunnerを作るかどうか。
- `remake/generated-repo` のdependenciesをどこまでlockfile込みで固定するか。
- 001のリメイク版npm / pnpm両経路を、Phase 6でどこまで確認するか。
- `current-*` と `remake` の差分をREADMEでどの粒度まで記録するか。
- generated repoの `scripts.build` / `scripts.serve` をPhase 6で実装する場合、既存integration testへどの範囲で追加するか。

## 成果物

- `docs/implementation/phase-6/plan.md`
- `workbench/cases/*/remake/generated-repo/` の整備
- 対象ケースREADMEの更新
- 必要に応じた `package/src/cli/init.ts` と関連testの更新
- Phase 6完了後の `docs/implementation/phase-6/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [実装計画](../index.md)
