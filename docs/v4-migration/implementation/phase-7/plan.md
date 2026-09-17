# Phase 7: package runtime readiness 設計

Phase 7は、リメイク版パッケージの入口とdependency分類を、Stanza開発者から見た開発契約として確認できる状態へ整えるフェーズである。

このフェーズではdistribution準備をしない。pack install、tarball生成、`npm exec togostanza@latest`、`pnpm dlx togostanza@latest`、`private`解除、公開metadata、`files` の最終整理はPhase 12へ送る。Phase 7では、本リポジトリ内で確認できるリメイク版パッケージ内部面を整える。

## 目的

- `import Stanza from "togostanza/stanza"` を、Stanza開発者の開発契約として型解決できるようにする。
- `togostanza/stanza` から公開するAPIを、Stanza base classに絞る。
- 既存の `togostanza/config` subpath exportを維持し、`togostanza/stanza` と合わせて `exports` と `dist` の整合を確認する。
- リメイク版パッケージのbuild実行時に必要なdependency分類を明確にする。
- distributionに踏み込まず、Phase 12へ送るpackage公開面とPhase 7で整えるpackage内部面を分ける。

## 完了条件

- `package/package.json` に `./stanza` subpath exportを追加している。
- `./stanza` exportは、公開用wrapperの `./dist/stanza.js` と `./dist/stanza.d.ts` を指す。
- 公開用wrapperは、`Stanza` base classをdefault exportする。
- `registerStanza()`、`createStanzaParams()` などの内部ランタイムAPIを `togostanza/stanza` から公開しない。
- 既存の `./config` exportを維持している。
- `pnpm run build` 後に、`./stanza` と `./config` の `exports` が指す `dist` ファイルが実在することをautomated testで確認している。
- Stanza開発者から見た開発契約として、最小の一時的なstanzaリポジトリ風入力から `togostanza/stanza` と `togostanza/config` を `tsc --noEmit` で型解決できることを確認している。
- 型解決確認用の `tsconfig.json` は、`exports` subpathを読む `moduleResolution` を明示している。
- build実行時dependencyと開発・検証用dependencyの分類を確認し、理由を記録している。
- `private: true` を維持している。
- root export、`main`、top-level `types`、`files`、tarball install、公開metadataをPhase 7では扱わないことを明記している。
- Phase 7完了後にhandoffを作る。

## 含めるもの

- `package/package.json` の `exports["./stanza"]` 追加。
- `package/src/stanza.ts` など、公開用wrapperの追加。
- `exports["./config"]` と `exports["./stanza"]` が指す `dist` ファイルの実在チェック。
- `togostanza/stanza` と `togostanza/config` の型解決確認。
- build内部で使う `registerStanza()` のimport path分離。
- package側integration test内での一時的なstanzaリポジトリ風入力生成。
- `dependencies` / `devDependencies` の分類確認。
- `typescript` を `devDependencies` に残す理由の記録。
- root exportをPhase 7で作らない理由の記録。
- `docs/v4-migration/implementation/index.md` へのPhase 7の最小追加。

## 含めないもの

- pack install smoke。
- tarball生成。
- `npm exec togostanza@latest` / `pnpm dlx togostanza@latest` の実解決。
- npm公開metadataの整理。
- `private`解除。
- `files` の最終整理。
- root export。
- `main`。
- top-level `types`。
- GitHub Actions live deploy。
- 検証領域への新しい検証ケース追加。

## パッケージ入口方針

Phase 7では、Stanza開発者の開発契約で使うsubpath exportだけを扱う。

対象にするsubpath:

- `togostanza/stanza`
- `togostanza/config`

`togostanza/stanza` はStanzaソースの必須import pathである。`togostanza/config` は `togostanza.config.ts` から設定helperをimportするためのpathであり、Phase 2-4で最小exportを追加済みである。

Phase 7では、次の形を基本にする。

```json
{
  "exports": {
    "./config": {
      "types": "./dist/config.d.ts",
      "import": "./dist/config.js",
      "default": "./dist/config.js"
    },
    "./stanza": {
      "types": "./dist/stanza.d.ts",
      "import": "./dist/stanza.js",
      "default": "./dist/stanza.js"
    }
  }
}
```

`import ... from "togostanza"` のroot exportは、現時点で開発契約にも利用契約にもしていない。root exportを何にするかは、package公開面全体を扱うPhase 12で再確認する。

`./stanza` は `package/src/runtime/stanza.ts` へ直結しない。`package/src/runtime/stanza.ts` は、custom element登録やパラメーター変換など、リメイク版ランタイム内部で使う関数も持つ。これらを `togostanza/stanza` から公開すると、Stanza開発者向けAPIではない内部ランタイムAPIまで開発契約に見えてしまう。

Phase 7では、`package/src/stanza.ts` のような公開用wrapperを追加し、`togostanza/stanza` はStanza base classのdefault exportに絞る。`registerStanza()`、`createStanzaParams()`、`StanzaRegistration` などは内部ランタイムAPIとして扱い、公開subpathへ出さない。

build時に生成するentrypoint wrapperが `registerStanza()` を必要とする場合は、`togostanza/stanza` ではなく内部用import pathへ分ける。たとえば、Vite aliasで内部ランタイムへ解決する `togostanza/internal/runtime` 相当のprivate specifierを使うか、CLIが生成するwrapper内で内部ランタイムのfile URLを使う。どちらを採る場合でも、`registerStanza()` は `togostanza/stanza` の公開APIとして扱わない。

公開用wrapperと内部ランタイムは、別のStanza class実装を持たない。`togostanza/stanza` からdefault exportする `Stanza` は、内部ランタイムでcustom element登録や描画に使う `Stanza` と同じclassを参照する。公開用wrapperで別の型定義だけを作ると、Stanza開発者から見た開発契約とbuild時の実行時挙動が乖離するため、Phase 7ではこの不変条件をtestまたは実装構造で守る。

Stanzaソースをbundleするbuild経路では、package exportではなくVite aliasが `togostanza/stanza` を内部ランタイムへ解決する場合がある。これは、生成物にbare importを残さず、`registerStanza()` など内部APIを使うための内部実装である。Stanza開発者向けの型解決は `exports["./stanza"]` を通るため、公開用wrapperと内部ランタイムの `Stanza` classを一致させることを前提にする。

## 型解決確認

Phase 7では、Stanza開発者から見た開発契約として型解決を確認する。

確認は検証領域に新しい検証ケースを作らず、リメイク版パッケージ側のintegration testで行う。integration testは一時ディレクトリに最小のstanzaリポジトリ風入力を作り、`node_modules/togostanza` を本リポジトリの `package/` へ向ける。これはpack install確認ではない。

型解決確認用の `tsconfig.json` では、`moduleResolution` に `bundler` または `nodenext` を明示する。TypeScriptは従来の `moduleResolution: "node"` では `package.json` の `exports` subpathを尊重しないため、`togostanza/stanza` と `togostanza/config` の確認としては不十分である。Phase 7のprobeでは、`exports` を読む設定を明示して確認する。

この確認は代表性に限界がある。既存のstanzaリポジトリや検証領域の一部が `moduleResolution: "node"` のままの場合、Phase 7で追加する `exports` と型定義は、そのままではエディタや `tsc` に効かない可能性がある。実際のstanzaリポジトリを `exports` awareな `moduleResolution` へ寄せる案内や、未解決時の診断はPhase 8のsource and config readinessで扱う。

確認する最小source:

```ts
import { defineTogoStanzaConfig } from "togostanza/config";
import Stanza from "togostanza/stanza";

class Probe extends Stanza {
  render(): void {
    this.root.querySelector("main");
    this.params.label;
  }
}

defineTogoStanzaConfig({
  vite: {
    define: {
      __PROBE__: JSON.stringify(true)
    }
  }
});
```

この確認は、Stanzaの表示やCLI挙動ではなく、リメイク版パッケージの入口が開発契約を満たすかを確認するものである。検証領域へ固定の検証ケースとして置く必要が出た場合は、後続フェーズで再判断する。

## dependency分類

Phase 7では、今見えているbuild実行時dependencyを対象に分類を確認する。

`dependencies` に置くもの:

- `vite`
- `sass`
- `handlebars`
- `@vitejs/plugin-vue`
- `vue`

これらは、Stanzaリポジトリで `togostanza build` を実行するときにリメイク版パッケージ側で必要になる。

`devDependencies` に置くもの:

- `@playwright/test`
- `@types/node`
- `csv-stringify`
- `d3`
- `date-fns`
- `oxfmt`
- `oxlint`
- `react`
- `react-dom`
- `tsx`
- `typescript`
- `vitest`

`react` と `react-dom` は、React Stanzaの検証用dependencyであり、CLIのbuild実行時dependencyではない。StanzaソースがReactを使う場合は、stanzaリポジトリ側dependencyとして解決する。

`d3`、`date-fns`、`csv-stringify` は、`togostanza-utils` compatibility確認のために使う開発・検証用dependencyであり、リメイク版パッケージのランタイムdependencyにはしない。

`typescript` はリメイク版パッケージの開発時buildに必要なので `devDependencies` に置く。公開後の `togostanza build` はcompiled JSを実行する前提なので、Phase 7ではランタイムdependencyにしない。tarball installやnpm公開時に `dist/` を含めるか、install後buildを要求するかはPhase 12のpack-install smokeで再確認する。

## `private: true` の扱い

`private: true` はPhase 7では維持する。

`./stanza` exportを追加することは、Stanza開発者の開発契約に必要なsubpath整理であり、npm公開準備完了を意味しない。`private`解除、公開metadata、`files`、tarball installはPhase 12で扱う。

## 実装方針

### package.json

`package/package.json` の `exports` に `./stanza` を追加する。既存の `./config` は維持する。

`./stanza` は公開用wrapperへ向ける。`package/src/runtime/stanza.ts` へ直結しない。

root export、`main`、top-level `types` は追加しない。追加しない理由をこの計画とhandoffに残す。

### automated test

既存のpackage側integration testに、次の観点を追加する。

- `exports["./config"]` と `exports["./stanza"]` が指す `dist` ファイルが、`pnpm run build` 後に実在すること。
- 一時的なstanzaリポジトリ風入力で、`togostanza/stanza` と `togostanza/config` の importを `tsc --noEmit` で解決できること。
- 型解決確認用の `tsconfig.json` が `moduleResolution: "bundler"` または `moduleResolution: "nodenext"` を明示していること。
- 公開用wrapperのdefault exportと内部ランタイムで使う `Stanza` classが乖離しないこと。
- `togostanza/stanza` から `registerStanza()` や `createStanzaParams()` をimportする使い方を、Stanza開発者向け開発契約にしないこと。

このテストはpack installを行わない。Phase 12で扱うtarball内同梱漏れ、`files`、npm公開metadataの確認とは分ける。

## 検証計画

Phase 7では、文書、package metadata、testを変更する。

最低限:

- `git diff --check`
- `cd package && mise exec -- pnpm run build`
- `cd package && mise exec -- pnpm run test:integration`

最終確認:

- `cd package && mise exec -- pnpm run check-all`

package配下のコマンドは、`package/mise.toml` を正として `cd package && mise exec -- ...` 経由で実行する。browser testを含む最終確認は、サンドボックス環境ではなくユーザーのローカル環境を優先する。

## 残す論点

- `togostanza/stanza` と `togostanza/config` の型解決確認を、将来の検証領域に固定ケースとして追加する必要があるか。
- `registerStanza()` など内部ランタイムAPIのprivate specifier名をどうするか。
- 既存stanzaリポジトリの `moduleResolution: "node"` を、Phase 8でどのように案内または診断するか。
- root exportをPhase 12で追加する場合、何を公開するか。
- top-level `types` をPhase 12で追加するか。
- `files` とtarball同梱範囲をPhase 12でどう固定するか。
- pack install smokeでdependency分類に漏れが見つかった場合、Phase 7の分類をどう更新するか。現時点の分類は実装変更が必要な差分ではなく、理由の記録と確認を主目的にする。

## 成果物

- `docs/v4-migration/implementation/phase-7/plan.md`
- `docs/v4-migration/implementation/index.md` のPhase 7追加
- 必要に応じた `package/package.json` の更新
- 必要に応じたpackage側integration testの更新
- Phase 7完了後の `docs/v4-migration/implementation/phase-7/handoff.md`

## 関連文書

- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 6引き継ぎ](../phase-6/handoff.md)
- [実装計画](../index.md)
