# Phase 13: rich preview / help page 引き継ぎ

この文書では、Phase 13で実装したヘルププレビュー、確認結果、残した論点を記録する。

Phase 13の設計は [Phase 13: リッチなヘルププレビュー計画](./plan.md) を正とする。

## 完了したこと

- `togostanza build` が `index.html` と `{id}.html` を生成するようにした。
- `index.html` に、ビルド対象Stanzaの一覧を縦積みで表示するようにした。
  - ID列と説明列を固定カラムにし、長いIDでも行ごとの読みやすさが崩れにくい形にした。
  - 狭い画面では1カラムへ落とす。
- `{id}.html` に、対象Stanzaのリッチなヘルププレビューを表示するようにした。
  - custom elementプレビュー
  - `stanza:parameter` 由来のフォームUI
  - `stanza:style` 由来のフォームUI
  - 現在のフォーム状態を反映したHTML snippet
  - About情報
  - `./{id}/metadata.json` へのDownload JSON導線
- `serve` の `/` と `/{id}.html` でも、`build` と同じヘルププレビューUIを配信するようにした。
  - `serve` は従来どおり一時出力ディレクトリを使い、通常開発中の `dist/` は触らない。
- ヘルププレビューappを `src/preview/help-app.ts` に追加した。
  - Vue 3を使う。
  - Bootstrap 5のCSSを使う。
  - Bootstrap JSは使わない。
- ヘルププレビューappの生成物を `-togostanza/` 配下へ出力するようにした。
  - bundle名やCSS名などの内部生成物名は、外部互換契約として固定しない。
- `bootstrap` をdependencyへ追加した。
- `src/css.d.ts` を追加し、CSS importの型解決を通した。

## パラメーターとstyleの挙動

- パラメーター初期値は `stanza:default` を優先し、無ければ `stanza:example` を使う。
- `stanza:default` も `stanza:example` も無いパラメーターは、初期表示では属性にもsnippetにも含めない。
- 明示的な空文字defaultは、未設定とは区別して保持する。
- `boolean` が `false` の場合は、現行版に合わせて該当属性を付けない。
- `single-choice` は `select` として扱う。
- `date`、`datetime`、`number`、`color` などは対応するHTML input typeとして扱う。
- `json` は専用editorを作らず、通常の入力欄として扱う。
- styleはCSS custom propertyとしてプレビュー対象custom elementへ反映する。
- 既定値のままのstyleは、HTML snippetへ含めない。
- query parameterによる初期値上書きは行わない。

## テストと記録

- browser testで、build後の静的ページとserve経由のページが同じリッチプレビューUIを提供することを確認した。
- browser testで、次を確認した。
  - custom elementの表示
  - parameter UIからのプレビュー更新
  - style UIからのCSS custom property反映
  - `stanza:default` と `stanza:example` の優先順位
  - 未設定パラメーターを初期属性とsnippetへ含めないこと
  - 明示的な空文字defaultを保持すること
  - `date` / `datetime` / `json` の更新
  - query parameterで初期値上書きをしないこと
  - HTML snippet更新
  - Download JSON導線
- integration / unit testで、`index.html`、`{id}.html`、`-togostanza/` の生成期待を更新した。
- 次の検証ケースREADMEへ、Phase 13の観測結果または差分を記録した。
  - [001 CLIの雛形生成とgenerate](../../../workbench/cases/001-cli-scaffold-and-generate/README.md)
  - [004 Runtime parameters](../../../workbench/cases/004-runtime-parameters/README.md)
  - [005 Stanza source API](../../../workbench/cases/005-stanza-source-api/README.md)
  - [011 Serve development server](../../../workbench/cases/011-serve-development-server/README.md)
- README本文のMarkdown表示はPhase 13では入れず、[follow-ups](../../investigation/follow-ups.md) に記録した。
- 別リポジトリでの人間確認を受け、`index.html` のStanza一覧を固定カラムの縦積み表示へ調整した。

## 確認結果

確認日: 2026-07-27

実装レビュー中に、実装担当subagentとレビュー担当subagentで次を確認した。

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:distribution:local
mise exec -- pnpm run test:github-dependency:local
git diff --check
```

結果:

- `check-all`: pass
  - unit test: 94 passed, 2 skipped
  - integration test: 23 passed
  - browser test: 11 passed
- `test:distribution:local`: pass
- `test:github-dependency:local`: pass
- `git diff --check`: pass

レビュー指摘対応後に、追加で次を確認した。

```sh
mise exec -- env TZ=America/Los_Angeles pnpm run test:browser
mise exec -- pnpm run check-all
git diff --check
```

結果:

- `test:browser`: pass
- `check-all`: pass
- `git diff --check`: pass

トップ一覧の表示調整後に、追加で次を確認した。

```sh
mise exec -- pnpm run format
mise exec -- pnpm run format:check
mise exec -- pnpm run build
git diff --check
```

結果:

- `format`: pass
- `format:check`: pass
- `build`: pass
- `git diff --check`: pass

## 実行しなかったこと

- README本文のMarkdown表示。
- JSON専用editorやschema validation。
- イベントの送受信用操作UI。
- query parameterによるプレビュー初期値上書き。
- ヘルププレビュー内の自動reloadやHMR。
- menu UIのリッチ化。
- `-togostanza/` 配下のbundle名、CSS名、チャンク構造の完全互換固定。

## 残す論点

- README本文の表示は、Markdown変換依存や安全な読み込み方針を決めてから扱う。
- menu / About UI polishは、ヘルププレビューとは別に、正式版としての受け入れ条件を決めて扱う。
- JSON専用editor、イベント操作UI、プレビュー状態のURL共有は、現行版体験と実利用要求を確認してから採否を判断する。
- `serve` は引き続き一時出力ディレクトリを使う。`dist/` に統一する場合は、通常開発中の出力先保護とのトレードオフを改めて判断する。

