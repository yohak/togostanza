# Phase 2: build + runtime サブフェーズ計画

Phase 2は、Phase 1で作ったStanzaリポジトリをビルドし、一般Webサイトへ直接埋め込める生成物として動かすフェーズである。

このフェーズは対象範囲が広いため、一度に全詳細計画を固定しない。Phase 2全体ではサブフェーズの順序と境界を定義し、各サブフェーズ開始時に詳細計画を作る。

詳細な仕様は [リメイク版仕様](../../spec/index.md) を正とする。採用判断は [リメイク方針](../../spec/remake-policy.md) を正とする。

## 目的

- `togostanza build` / `togostanza b` を、Stanzaリポジトリから公開用生成物を作る入口として成立させる。
- 生成物をmodule scriptとcustom elementで一般Webサイトへ直接埋め込めるようにする。
- Stanzaソースから使う最小ランタイムAPIを成立させる。
- Phase 1で後続送りにした `init` 周辺のpreflightを、`build` 前提のリポジトリ検出と合わせて整理する。
- Phase 1のGitHub Pages workflow placeholderを、`dist/` 生成物が成立した後に実deploy可能なworkflowへ置き換える。

## 進め方

Phase 2では、先に全体のサブフェーズ境界を固定する。各サブフェーズでは、その範囲に必要な仕様項目、観測契約、実装対象、検証計画、対象外を詳細計画として書いてから実装する。

全体の実装フローに影響しない細部は、該当サブフェーズの主目的に直接必要でなければ後続判断へ回してよい。後続判断へ回す場合は、対象外または引き継ぎ事項として明記する。

## サブフェーズ一覧

| サブフェーズ | ゴール | 主な検証ケース | 詳細計画 |
| ------------ | ------ | -------------- | -------- |
| Phase 2-0: preflight / repo detection | Phase 1の必須follow-upと、`build` 前提のStanzaリポジトリ検出を整える。 | [001](../../../workbench/cases/001-cli-scaffold-and-generate/)、[002](../../../workbench/cases/002-build-artifacts/) | [計画](./phase-2-0/plan.md)、[引き継ぎ](./phase-2-0/handoff.md) |
| Phase 2-1: build artifact spine | `build` / `b` と、サブパス安全な最小 `dist/` 生成物を成立させる。 | [002](../../../workbench/cases/002-build-artifacts/) | [計画](./phase-2-1/plan.md)、[引き継ぎ](./phase-2-1/handoff.md) |
| Phase 2-2: minimal runtime embedding | module script、custom element、open Shadow DOM、Shadow DOM内 `main`、menu placement / About導線を成立させる。 | [003](../../../workbench/cases/003-runtime-embedding/) | [計画](./phase-2-2/plan.md)、[引き継ぎ](./phase-2-2/handoff.md) |
| Phase 2-3: Stanza source API | `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()` などを段階的に成立させる。 | [004](../../../workbench/cases/004-runtime-parameters/)、[005](../../../workbench/cases/005-stanza-source-api/) | [計画](./phase-2-3/plan.md)、[引き継ぎ](./phase-2-3/handoff.md) |
| Phase 2-4: config / resolution / assets | `togostanza.config.ts`、旧設定検出、Sassの高度なmodule解決、`tsconfig.json`、共有ソース、asset解決を扱う。 | [007](../../../workbench/cases/007-config-and-resolution/) | [計画](./phase-2-4/plan.md)、[引き継ぎ](./phase-2-4/handoff.md) |
| Phase 2-5: inter-stanza coordination | `togostanza--container`、CustomEvent、incoming / outgoing event、`event-map` / `data-source` の再設計を扱う。 | [006](../../../workbench/cases/006-inter-stanza-coordination/) | 後続作成 |
| Phase 2-6: GitHub Pages workflow | Phase 1のworkflow placeholderを実deploy可能なworkflowへ置き換える。 | [001](../../../workbench/cases/001-cli-scaffold-and-generate/)、[002](../../../workbench/cases/002-build-artifacts/) | 後続作成 |

## サブフェーズ境界

### Phase 2-0: preflight / repo detection

Phase 2-0では、`build` の中身は実装しない。`init .`、既存ディレクトリ、lockfile推定、パッケージマネージャー矛盾診断、Stanzaリポジトリroot判定を扱う。

ここで作る共通の判断やヘルパーは、後続の `build`、`generate stanza`、将来の `serve` から再利用できる形を目指す。

### Phase 2-1: build artifact spine

Phase 2-1では、最小のビルド生成物を出す。対象は `build` / `b`、`--output-path`、未指定時の `dist`、Stanza検出、metadata検証、entrypoint候補、Viteによるentrypoint bundle、build用runtime stub、stylesheet、Sassの最小 `@/` alias、assetコピー、source map、最小HTML生成までとする。

GitHub Pagesのサブパス配信で壊れない相対URL生成は、Phase 2-1の所有範囲に含める。`{id}.js`、`{id}.css`、`{id}.html`、metadata、asset、共有チャンクへの参照は、`dist/` を任意のサブパスへ置いても相対URLで解決できる形を目指す。

custom element登録、Shadow DOM、menu、Stanza source APIの本格挙動は扱わない。ここでは、後続のruntime embeddingが参照できる生成物の形と、Vite buildが通る最小runtime stubを先に作る。

### Phase 2-2: minimal runtime embedding

Phase 2-2では、生成された `{id}.js` を `type="module"` で読み込み、`<togostanza-{id}>` がcustom elementとしてupgradeされるところまでを扱う。

open Shadow DOM、Shadow DOM内 `main`、CSS適用、`stanza:style` からCSS custom propertyの既定値への反映をここで確認する。

サブパス配信相当のfixtureから、module script、stylesheet、metadata参照、asset参照、共有チャンク参照が相対URLで解決できることもここで確認する。

menu placement、`togostanza-menu-placement` 属性、`none`、About導線から `${id}.html` へ到達できること、`togostanza-menu_placement` を受け付けないこともPhase 2-2で扱う。`menu()` のitem APIやhandler互換はPhase 2-3で扱う。

### Phase 2-3: Stanza source API

Phase 2-3では、Stanzaソースが使うAPIを扱う。`this.params`、`renderTemplate()`、`templates/*.hbs`、`query()`、`importWebFontCSS()`、`menu()`、`handleAttributeChange()` を対象にする。

`handleEvent()` はStanza base API名としてno-op methodを置いてよいが、incoming eventと連携した実挙動はPhase 2-5で扱う。

パラメーター変換や外部通信を含むため、検証ケース004と005に分けて観測する。

### Phase 2-4: config / resolution / assets

Phase 2-4では、設定と解決を扱う。`togostanza.config.ts`、旧 `togostanza-build.mjs` / `togostanza-build.js` の検出と診断、Sassの高度なmodule解決、`tsconfig.json`、entrypointからimportされる共有ソース、ルートasset、stanza別asset、Stanzaソースからのasset import、依存パッケージ内asset importを対象にする。

Phase 2-4では、asset importからemitされた生成物も、GitHub Pagesのサブパス配信相当で相対URLとして解決できることを確認する。

旧設定ファイルは無条件に実行しない。必要な差分説明や移行メモもこのサブフェーズの成果物に含める。

### Phase 2-5: inter-stanza coordination

Phase 2-5では、Stanza間連携を扱う。`togostanza--container` は入口として維持する。`handleEvent()`、`togostanza--event-map` と `togostanza--data-source` は目的を維持しつつAPI詳細を再設計する。`togostanza--data-container` は旧ドキュメント内の誤記として持ち込まない。

再設計対象は、実装だけでなく差分説明と移行メモを成果物に含める。

### Phase 2-6: GitHub Pages workflow

Phase 2-6では、Phase 1のGitHub Pages workflow placeholderを、実deploy可能なworkflowへ置き換える。

このサブフェーズは、`build` が `dist/` を生成し、生成物がGitHub Pagesのサブパス配信で壊れない見通しを持ってから実施する。workflowだけを先に完成させない。

## Phase 2全体で含めないもの

- `serve` のwatch、差分invalidate、HTTP 500復帰。
- React、Vue固有のcompatibility。
- `togostanza-utils` compatibility。
- npm公開metadata、`exports`、`files`、`private` 解除。
- ローカルtarballを使ったnpm/pnpmの実インストール確認。

## 検証方針

- サブフェーズごとにunit test、integration test、必要なbrowser testを決める。
- 完了前確認は、原則として `git diff --check` と `cd package && mise exec -- pnpm run check-all` とする。
- packageの品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
- 検証ケースの `README.md` には、該当サブフェーズで確認したリメイク版の観測結果を記録する。

## 後続へ送る事項

| 項目 | 回収先 |
| ---- | ------ |
| bare `init` をprompt付き入口として追加するかの判断 | [Phase 2-0引き継ぎ](./phase-2-0/handoff.md) に記録済み。後続判断 |
| `index.ts` / `index.tsx` 生成option | Phase 2-1以降の必要時 |
| ヘルププレビューUIの詳細 | Phase 2-1以降の必要時、またはPhase 3 |
| source map内部のsources pathや内容の詳細 | Phase 2-1で生成は行う。詳細は後続の必要時 |
| 広範なmetadata schema validation | Phase 2-1以降の必要時 |
| `stanza:include` の扱い | Phase 2-4以降の必要時 |
| React、Vue、`togostanza-utils` | Phase 4 |
