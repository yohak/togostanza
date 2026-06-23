# リポジトリメモ: togomedium-web

確認日: 2026-06-22

**togomedium-web**のStanza packageとWeb側組み込み経路を、TogoStanza remakeの互換性判断材料として読み取り専用で調査したメモ。

## リポジトリの役割

- 参照元: `references/togomedium-web`
- 役割: TogoMedium Webのモノリポ。`@packages/stanza` がTogoStanza WebComponent群、`@packages/web` がそれを組み込むReact/Viteアプリ。
- 調査方針: 実プロジェクト全体を `workbench/cases/` にコピーしない。Stanza source、generated artifact、Web embeddingの小さな契約だけを抽出する。

## 共通メモ

- リポジトリ状態: `references/togomedium-web` にsource、`references/togomedium-web/@packages/stanza/dist` に生成済みartifact、`node_modules` が存在する。
- 読み取り観測のみ実施。build/dev/previewは実行していない。
- 関連コマンド:
  - `find references/togomedium-web ...`
  - `rg ... references/togomedium-web ...`
  - `jq ... references/togomedium-web/package.json`
- 重要なパス:
  - `references/togomedium-web/AGENTS.md`
  - `references/togomedium-web/mise.toml`
  - `references/togomedium-web/package.json`
  - `references/togomedium-web/tsconfig.json`
  - `references/togomedium-web/@packages/stanza/AGENTS.md`
  - `references/togomedium-web/@packages/stanza/docs/development-guide.md`
  - `references/togomedium-web/@packages/stanza/togostanza-build.js`
  - `references/togomedium-web/@packages/stanza/stanzas/*`
  - `references/togomedium-web/@packages/stanza/dist/*`
  - `references/togomedium-web/@packages/web/docs/stanza-integration.md`
  - `references/togomedium-web/@packages/web/src/components/stanzas/*`
  - `references/togomedium-web/@packages/web/src/types/stanza.d.ts`
- 環境メモ:
  - `mise.toml` はNode `24.5.0`、pnpm `10.28.2`。
  - `pnpm-workspace.yaml` は `@packages/*`。
  - ルート `package.json` の通常手順:
    - `pnpm --filter @packages/stanza stanza:build`
    - `pnpm --filter @packages/stanza stanza:server`
    - `pnpm --filter @packages/web build`
    - `pnpm --filter @packages/web start`
    - `pnpm --filter @packages/storybook storybook`
  - `@packages/stanza/package.json` のStanza script:
    - `stanza:server=togostanza s`
    - `stanza:build=togostanza build`
    - `stanza:generate=togostanza g stanza`

## 実利用固有メモ

### Stanza package概要

- Stanza数: 15
- 入口:
  - 13件のstanzaが `index.tsx` + `TogoMediumReactStanza`。
  - 2件のstanza (`gmdb-gms-by-tid`, `gmdb-roundtree`) が `index.ts` + `togostanza/stanza` を直接継承する。
- `@packages/stanza/docs/development-guide.md` は、現行開発対象ではReact、MUI、Shadow DOM、providerを前提にすると明記している。
- `gmdb-gms-by-tid` と `gmdb-roundtree` は最初期prototypeとして、今後の設計判断の主材料に含めない方針が同ガイドにある。

### 生成物概要

`references/togomedium-web/@packages/stanza/dist` に各stanzaの既存生成物がある。

```text
dist/
  {id}.js
  {id}.js.map
  {id}.css
  {id}.html
  {id}/metadata.json
  -togostanza/help-app.js
  -togostanza/index-app.js
  index.html
  StanzaReactProvider-2118b75a.js
  stanza-de960d84.js
  React/MUI/API/common utility chunks...
```

### Web側embedding概要

`@packages/web/docs/stanza-integration.md` と `src/components/stanzas/*` から、Web側の読み込み契約は次の形。

```tsx
<script src={`${URL_STANZA}/${stanzaName}.js`} type="module" async></script>
<StanzaTag togostanza-menu-placement="none" ...></StanzaTag>
```

- `URL_STANZA` の既定値は `https://dbcls.github.io/togomedium-stanza`。
- `VITE_URL_STANZA` で差し替えられる。
- pageから直接custom elementを書かず、`src/components/stanzas/` のReact wrapper経由で扱う。
- custom elementの型は `src/types/stanza.d.ts` に定義する。
- イベント連携では、document-levelの `STANZA_RUN_ACTION` をlistenするwrapperがある。

### TogoStanza契約依存

| 観点 | 観測 | 判断材料 | 影響範囲 | ケース入力への抽出案 |
| ---- | ---- | ---- | ---- | ---- |
| `this.params` | 13件のReact stanzaと2件のprototype stanzaで利用。React stanzaは型付きparamsを `makeApp()` でApp propsへ渡す。 | 既存source互換の強い根拠 | TS/TSX source、metadata parameter、React props境界。 | 005にTSX entry + typed paramsの最小sourceを追加候補。 |
| `this.root` | `TogoMediumReactStanza` が `this.root.querySelector("main")!` をclass fieldで取得。各React stanzaは `stanzaElement={this.root}` としてAppに渡す。 | 既存source互換の強い根拠 / 検証ケース候補 | Shadow DOM初期DOM、React mount target、React component側のshadow root操作。 | 新規小粒な検証ケース候補: TSX React provider + `this.root.querySelector("main")` mount。 |
| `this.root.querySelector("main")` | `components/providers/StanzaReactProvider.tsx` でReact root作成に必須。 | 既存source互換の強い根拠 | React runtime stanza全体。`main` が存在しないとmount不能。 | 005のroot/main契約にReact mountを追加候補。 |
| `renderTemplate()` | `gmdb-gms-by-tid` と `gmdb-roundtree` のprototypeで利用。 | 既存source互換の根拠だが実プロジェクト内では旧寄り | prototype stanzaの維持。 | 既存005で十分。prototype由来の追加ケース入力は優先度低。 |
| `importWebFontCSS()` | `TogoMediumReactStanza.render()` がGoogle Fontsを注入。`utils/stanza.ts` にも同等helperがある。 | 既存source互換の強い根拠 / 検証ケース候補 | React/MUI表示のfont読み込み、Shadow DOM link注入。 | 005に既存。React検証ケースではprovider経由で再確認候補。 |
| `handleAttributeChange()` | `TogoMediumReactStanza` がoverrideし、attribute changeごとに `_render()` する。 | 既存source互換の強い根拠 | Web wrapperから属性が変わる場合のReact再描画。 | 005のattribute mutationをReact検証ケースにも適用候補。 |
| `this.query()` | 対象sourceでは未検出。 | 既存005で維持、実プロジェクト由来では追加根拠なし | なし | 追加の検証ケース不要。 |
| `stanza:type` / `stanza:parameter` | 15件のmetadataすべてに `stanza:parameter`。TogoMedium側は `string`、`color`、空parameterが多い。 | 既存metadata互換の強い根拠 | metadata公開interface、Web wrapperの属性名。 | 004に `string` typeとsnake_case attributeを追加候補。 |
| `stanza:menu-placement` | 全stanzaが `none`。Web wrapperも `togostanza-menu-placement="none"` を共通指定する。 | regression観測候補 | help/menu抑制、Web埋め込み時の余計なUI非表示。 | 003または新小粒な検証ケースでdirect embed artifact + menu noneを確認候補。 |
| TSX / React runtime | 13件のstanzaが `TogoMediumReactStanza`、React 19、MUI、Emotion、TanStack Query、Jotai、Redux providerを含む。 | regression観測候補 | TSX build、React runtime chunk、provider、Shadow DOM style injection。 | 新規小粒な検証ケース候補: React + Emotion/MUIまでは重いため、React mount + provider styleだけに絞る。 |
| alias / tsconfig paths | `%stanza/*`, `%api/*`, `%core/*`, `%storybook/*` をtsconfigと `togostanza-build.js` のaliasで解決。Web側は `@/*` aliasも利用する。 | migration note判断材料 / 検証ケース候補 | workspace import、cross-package import、build config migration。 | 007に `%stanza/*` + `%core/*` の最小alias sourceを追加候補。 |
| `togostanza-build.js` | `rollup-plugin-dotenv` とaliasを返す旧設定。 | migration note判断材料 / 検証ケース候補 | 旧設定ファイル、Rollup plugin escape hatch、dotenv。 | 007に「旧設定検出 + 新設定への誘導」をmigration note候補として追加。 |
| Web側から生成物を読む経路 | `URL_STANZA/{stanzaName}.js` をmodule scriptで読み、`togostanza-{id}` をReact wrapperで出す。 | 調査ログのみ | 利用側Web appのURL組み立てとwrapper実装。 | TogoStanza remakeのworkbench検証対象には含めない。direct embed artifact自体は003で扱う。 |
| outgoing event | Stanza sourceが `STANZA_RUN_ACTION` を `CustomEvent` としてdispatchし、Web wrapperがdocumentで受ける。 | 別調査後に006 | Stanza sourceから外へeventを出す契約、`stanza:outgoingEvent`、container伝播条件。 | 006にSending Eventsの観測要件を追加する。Web wrapperの遷移処理は検証対象外。 |

### Inventory

| source path | generated artifact path | 依存しているTogoStanza契約 | 判断材料 | 影響範囲 | ケース入力への抽出案 | 通常build/dev/preview手順 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `references/togomedium-web/@packages/stanza/components/providers/StanzaReactProvider.tsx` | `references/togomedium-web/@packages/stanza/dist/StanzaReactProvider-2118b75a.js` | `this.root.querySelector("main")`, `importWebFontCSS()`, `handleAttributeChange()`, React `createRoot()` | 既存source互換の強い根拠 / 検証ケース候補 | 13件のReact stanzaの共通runtime | React App 1個 + class fieldで `main` mount + attribute change rerender | `mise exec -- pnpm --filter @packages/stanza stanza:build`; devは `stanza:server` |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-component-detail/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-component-detail.js` | `TogoMediumReactStanza`, `this.params.gmo_id`, `this.root` | 既存source互換の強い根拠 / 検証ケース候補 | React Stanzaの標準形 | 005/新しい検証ケースにtyped params + React App propsを抽出 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-medium-detail/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-medium-detail.js` | `TogoMediumReactStanza`, `this.params.gm_id`, `this.root`, `%stanza/*` imports | 既存source互換の強い根拠 / 検証ケース候補 | React runtimeとworkspace alias | React mount検証ケースと007 alias検証ケースに分割 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-media-alignment-table-by-components/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-media-alignment-table-by-components.js` | string params (`gm_ids`, `prioritized_tax_ids`), `this.root` | 既存source互換の強い根拠 / 検証ケース候補 | Web wrapperからcomma-separated string attributeを受ける経路 | 004に `string` + snake_case attributeを追加候補 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-medium-builder/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-medium-builder.js` | React runtime, Redux store injection, `this.params.source_gm_id` | regression観測候補 | Provider stack、Redux store、重いinteractive stanza | Reduxまでは持ち込まず、provider optionを最小化して別の検証ケース候補 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-gms-by-tid/index.ts` | `references/togomedium-web/@packages/stanza/dist/gmdb-gms-by-tid.js` | `togostanza/stanza`, `this.params`, `renderTemplate()`, `this.root.querySelector("#table_area")` | 既存source互換の根拠だがprototype寄り | 旧TS source、template + DOM mount | 005で既存template/root契約を維持。追加優先度低 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-roundtree/index.ts` | `references/togomedium-web/@packages/stanza/dist/gmdb-roundtree.js` | `togostanza/stanza`, `this.params`, `renderTemplate()` | 既存source互換の根拠だがprototype寄り | 旧TS source、template output | 005に還元。追加優先度低 | 同上 |
| `references/togomedium-web/@packages/stanza/togostanza-build.js` | build設定のためartifactなし | Rollup plugin injection、alias、dotenv | migration note判断材料 / 検証ケース候補 | 旧設定ファイル、workspace import解決 | 007に旧設定検出と `%stanza/%core/%api` aliasを分けて切り出す | 同上 |
| `references/togomedium-web/tsconfig.json` / `@packages/stanza/tsconfig.json` | build設定のためartifactなし | TSX、`jsxImportSource`、`paths` | migration note候補 | TypeScript/TSX toolchain、workspace imports | 007にtsconfig pathsの最小例 | 同上 |
| `references/togomedium-web/@packages/web/src/components/stanzas/*.tsx` | Web app artifactは未確認 | `URL_STANZA/{id}.js`, custom element, `togostanza-menu-placement="none"` | 調査ログのみ | Web側からStanza生成物を読む利用側経路 | workbench検証対象には含めない。`togostanza-menu-placement="none"` のdirect embed挙動は003で扱う | Web buildは `mise exec -- pnpm --filter @packages/web build`; dev/previewは `start` |
| `references/togomedium-web/@packages/web/src/types/stanza.d.ts` | Web app artifactは未確認 | custom element tag names and attributes | migration note判断材料 | React JSX型、attribute spelling | workbench検証ケース入力では不要。migration noteに「Web側型定義更新」を記録 | 同上 |
| `references/togomedium-web/@packages/web/src/consts/api.ts` | Web app artifactは未確認 | `URL_STANZA` / `VITE_URL_STANZA` で生成物URLを決める | 調査ログのみ | deployment path、CDN/static hosting | 利用側ロジックなのでworkbench検証対象には含めない | 同上 |

## metadata概要

| group | stanza数 | parameter傾向 | style傾向 | menu |
| ---- | ---- | ---- | ---- | ---- |
| React Stanza標準形 | 13 | `string`、空parameter、単一ID parameterが中心 | 空、または `color` 1件 | `none` |
| prototype (`gmdb-gms-by-tid`, `gmdb-roundtree`) | 2 | `color` / `single-choice` など | `color` / `single-choice` | `none` |

TogoMedium側では `metastanza` よりmetadataのstyle/parameter数は少ないが、Web wrapperの属性名とTSX側のtyped paramsが強く結びついている。

## 実行メモ

今回の調査では実プロジェクトをbuildしていない。既存sourceと生成済みartifactの読み取り観測に留めた。

後段で通常手順を確認する場合は、`references/togomedium-web/AGENTS.md` に従い、リポジトリrootで `mise exec -- node -v` を確認し、pnpmは `mise exec -- pnpm ...` で実行する。Stanza buildは `mise exec -- pnpm --filter @packages/stanza stanza:build`、Web buildは `mise exec -- pnpm --filter @packages/web build`。

## このリポジトリの未解決事項

- `TogoMediumReactStanza` 相当のReact/TSX runtimeを既存005に拡張するか、新しい小粒な検証ケースに分けるか。
- `%stanza/*` / `%api/*` / `%core/*` aliasをremakeでどこまで吸収するか。調査上はmigration note判断材料として記録する。
- `togostanza-build.js` のdotenv/alias pluginをremake側で自動実行せず、検出と移行案内に留める方針を007にどう反映するか。
- Web wrapperからの `URL_STANZA/{id}.js` 読み込みは利用側ロジックとしてworkbench検証対象外にする。実利用事実としてこの調査ログに残す。
