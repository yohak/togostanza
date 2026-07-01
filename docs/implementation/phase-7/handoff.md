# Phase 7: package runtime readiness 引き継ぎ

この文書では、Phase 7完了後にPhase 8以降へ引き継ぐ事実、境界、注意点を扱う。

Phase 7の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続フェーズへの引き継ぎメモである。

## 完了したこと

- `package/package.json` に `./stanza` subpath exportを追加した。
- 既存の `./config` subpath exportを維持した。
- `./stanza` は `./dist/stanza.js` と `./dist/stanza.d.ts` を指すようにした。
- `package/src/stanza.ts` を公開用wrapperとして追加し、`Stanza` base classのdefault exportだけを公開する形にした。
- `togostanza/stanza` から `registerStanza()`、`createStanzaParams()` などの内部ランタイムAPIを公開しない形にした。
- build内部で使う `registerStanza()` は、`togostanza/internal/runtime` という内部用import pathへ分離した。
- Vite aliasで、Stanzaソースの `togostanza/stanza` は公開用wrapperへ、内部entrypoint wrapperの `togostanza/internal/runtime` は内部ランタイムへ解決するようにした。
- `exports["./config"]` と `exports["./stanza"]` が指す `dist` ファイルの実在をintegration testで確認した。
- 一時的なstanzaリポジトリ風入力をintegration test内に作り、`togostanza/stanza` と `togostanza/config` を `tsc --noEmit` で型解決できることを確認した。
- 型解決確認用の `tsconfig.json` では、`moduleResolution: "bundler"` を明示した。
- dependency分類は現状の `package/package.json` とPhase 7計画が一致していることを確認した。分類変更は不要だった。

## 意図的に残したこと

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
- 既存stanzaリポジトリの `moduleResolution: "node"` からの移行案内や未解決時診断。

## Phase 8へ渡す前提

- Phase 7の型解決確認は、`moduleResolution: "bundler"` を明示した最小入力で行った。
- TypeScriptは従来の `moduleResolution: "node"` では `package.json` の `exports` subpathを尊重しない。
- そのため、既存stanzaリポジトリが `moduleResolution: "node"` のままの場合、`togostanza/stanza` と `togostanza/config` の型解決がエディタや `tsc` で効かない可能性がある。
- 既存stanzaリポジトリを `exports` subpathを読む `moduleResolution` へ寄せる案内や、未解決時の診断はPhase 8で扱う。
- `tsconfig paths` / alias移行案内と同じく、型解決設定の移行もsource and config readinessの一部として扱う。

## Phase Xへ渡す前提

- `private: true` は維持している。
- `./stanza` と `./config` のsubpath exportは追加済みだが、npm公開準備完了を意味しない。
- root export、`main`、top-level `types` は追加していない。
- `files`、公開metadata、tarball同梱範囲は未整理である。
- `pack -> install -> 実行` 未検証は、引き続きPhase Xのdistribution blockerである。
- Phase Xのpack install smokeでは、`./stanza` / `./config` のexport、`bin`、`files`、`private`、version、runtime path解決、dependency分類をまとめて再確認する。

## 注意すること

- `togostanza/stanza` はStanza開発者向けの開発契約として、Stanza base classのdefault exportに絞る。
- `registerStanza()`、`createStanzaParams()`、`StanzaRegistration` などは内部ランタイムAPIであり、Stanza開発者向けAPIとして扱わない。
- 公開用wrapperのdefault exportと、内部ランタイムでcustom element登録や描画に使う `Stanza` classは同じclassを参照する必要がある。
- build経路では、生成物にbare importを残さないためにVite aliasを使う。Stanza開発者向けの型解決は `exports["./stanza"]` を通る。両者の経路が分かれているため、公開用wrapperと内部ランタイムの `Stanza` classが乖離しないことを維持する。
- `togostanza/internal/runtime` は内部用import pathであり、package exportには追加していない。外部公開APIとして扱わない。
- dependency分類はPhase 7時点では実装変更不要だった。将来のpack install smokeで漏れが見つかった場合は、Phase Xで確認したうえで分類を更新する。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && mise exec -- pnpm run build` を確認し、通った。
- `cd package && mise exec -- pnpm run test:integration` を承認付き通常実行で確認し、21件が通った。
- `cd package && mise exec -- pnpm run test:unit` を承認付き通常実行で確認し、69件が通った。
- `cd package && mise exec -- pnpm run check-all` を承認付き通常実行で確認し、format、lint、type-check、build、unit test、integration test、browser testが通った。
- browser testは13件が通った。

サンドボックス内では、localhost listenを使う既存のunit / integration testが `EPERM` で失敗した。これは運用方針どおり、サンドボックス環境差として扱い、ユーザーのローカル環境で承認付き通常実行して確認した。

## 関連文書

- [Phase 7設計](./plan.md)
- [Phase 5棚卸し](../phase-5/inventory.md)
- [Phase 5引き継ぎ](../phase-5/handoff.md)
- [Phase 6引き継ぎ](../phase-6/handoff.md)
- [実装計画](../index.md)
