# Phase 9: local compatibility baseline 引き継ぎ

Phase 9では、`references/` に依存する実プロジェクト確認を、default品質確認から分離したローカルcompatibility確認として整理した。

## 完了したこと

- `package/package.json` に `test:compat:local` を追加した。
- default `test:browser` は `@compat-local` を除外するようにし、`check-all` が `references/` に依存しない状態へ戻した。
- references依存のunit確認を、`TOGOSTANZA_RUN_LOCAL_COMPAT=1` のときだけ実行するようにした。
- `references/metastanza/stanzas` の10件と、`references/togomedium-web/@packages/stanza/stanzas` の15件が、Phase 9計画の対象名と一致することをtest内で再照合した。
- metastanza全10 StanzaとTogoMedium Stanza全15 Stanzaのbuild checkを、referencesを直接変更しない一時rootで実行できるようにした。
- `references/togostanza-utils` を使う最小Stanzaのbuild確認を、local compatibility確認へ移した。
- browser smokeのlocal compatibility確認を4件へ整理した。
  - Emotion合成Stanza。
  - metastanza `scorecard`。
  - TogoMedium `gmdb-meta-list`。
  - `references/togostanza-utils` 最小Stanza。
- 012 READMEに、Phase 9の実行環境、対象commit、version baseline、Stanza名再照合、build check結果、browser smoke結果を記録した。

## 確認したこと

- `cd package && mise exec -- pnpm run test:compat:local`
  - unit: local compatibility 2件 pass。
  - browser: `@compat-local` 4件 pass。
- `test:compat:local` は `references/` とローカルの依存インストール状態を前提にする。
- `test:compat:local` はCI前提ではない。ローカルbaselineの入口として扱う。

## 残した判断

- `pagination-table` のdirect embed smokeは、Stanzaソースが `main.parentNode.style` を前提にしているため、このフェーズでは通す代表から外した。
- `pagination-table`、`scroll-table`、`hash-table` など、`main.parentNode.style` に依存するmetastanzaのruntime互換判断はPhase 11へ送る。
- metastanza全10 Stanzaのbrowser smokeはPhase 11へ送る。
- TogoMedium Stanza全15 Stanzaのbrowser smokeはPhase 11へ送る。
- TogoMedium Webアプリ本体E2EはPhase 11へ送る。
- React / Vue / Emotion / MUIの広いversion matrixはPhase 11以降で、実利用要求が出た場合だけ広げる。

## 注意点

- `test:compat:local` は `references/metastanza`、`references/togomedium-web`、`references/togostanza-utils` がローカルに存在することを前提にする。
- Phase 9では `references/` を直接変更しない。
- TogoMedium固有aliasは自動吸収しない。local compatibility確認では、`togostanza.config.ts` の `vite.resolve.alias` へ明示している。
- `tsconfig paths` の自動解決はしない。必要なaliasは [source / config移行ガイド](../../guides/source-config-migration.md) に従って `togostanza.config.ts` へ移す。
- Sass `@import` の非推奨警告は現行ソース由来の警告として許容する。

## 次の候補

Phase 10へ進む前に、Phase 9のレビューで `test:compat:local` の粒度と、Phase 11へ送ったbrowser smoke範囲が妥当か確認する。
