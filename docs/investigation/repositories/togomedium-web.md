# リポジトリメモ: togomedium-web

確認日: 2026-06-22

**togomedium-web** の Stanza package と Web 側組み込み経路を、TogoStanza remake の互換性判断材料として読み取り専用で調査したメモ。

## リポジトリの役割

- 参照元: `references/togomedium-web`
- 役割: TogoMedium Web のモノリポ。`@packages/stanza` が TogoStanza WebComponent 群、`@packages/web` がそれを組み込む React/Vite アプリ。
- 調査方針: 実プロジェクト全体を `workbench/cases/` にコピーしない。Stanza source / generated artifact / Web embedding の小さな契約だけを抽出する。

## 共通メモ

- リポジトリ状態: `references/togomedium-web` に source、`references/togomedium-web/@packages/stanza/dist` に生成済み artifact、`node_modules` が存在する。
- 読み取り観測のみ実施。build / dev / preview は実行していない。
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
  - `mise.toml` は Node `24.5.0`、pnpm `10.28.2`。
  - `pnpm-workspace.yaml` は `@packages/*`。
  - ルート `package.json` の通常手順:
    - `pnpm --filter @packages/stanza stanza:build`
    - `pnpm --filter @packages/stanza stanza:server`
    - `pnpm --filter @packages/web build`
    - `pnpm --filter @packages/web start`
    - `pnpm --filter @packages/storybook storybook`
  - `@packages/stanza/package.json` の Stanza script:
    - `stanza:server=togostanza s`
    - `stanza:build=togostanza build`
    - `stanza:generate=togostanza g stanza`

## 実利用固有メモ

### Stanza package 概要

- Stanza 数: 15
- 入口:
  - 13 stanza が `index.tsx` + `TogoMediumReactStanza`。
  - 2 stanza (`gmdb-gms-by-tid`, `gmdb-roundtree`) が `index.ts` + `togostanza/stanza` 直接継承。
- `@packages/stanza/docs/development-guide.md` は、現行開発対象では React / MUI / Shadow DOM / provider を前提にする、と明記している。
- `gmdb-gms-by-tid` と `gmdb-roundtree` は最初期 prototype として、今後の設計判断の主材料に含めない方針が同 guide にある。

### 生成物概要

`references/togomedium-web/@packages/stanza/dist` に各 stanza の既存生成物がある。

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

### Web 側 embedding 概要

`@packages/web/docs/stanza-integration.md` と `src/components/stanzas/*` から、Web 側の読み込み契約は次の形。

```tsx
<script src={`${URL_STANZA}/${stanzaName}.js`} type="module" async></script>
<StanzaTag togostanza-menu-placement="none" ...></StanzaTag>
```

- `URL_STANZA` の default は `https://dbcls.github.io/togomedium-stanza`。
- `VITE_URL_STANZA` で差し替えられる。
- page から直接 custom element を書かず、`src/components/stanzas/` の React wrapper 経由で扱う。
- custom element の型は `src/types/stanza.d.ts` に定義する。
- イベント連携では document-level `STANZA_RUN_ACTION` を listen する wrapper がある。

### TogoStanza 契約依存

| 観点 | 観測 | 分類 | 影響範囲 | fixture 化の切り出し方 |
| ---- | ---- | ---- | ---- | ---- |
| `this.params` | 13 React stanza と 2 prototype stanza で利用。React stanza は型付き params を `makeApp()` で App props へ渡す。 | 互換必須 | TS/TSX source、metadata parameter、React props 境界。 | 005 に TSX entry + typed params の最小 source を追加候補。 |
| `this.root` | `TogoMediumReactStanza` が `this.root.querySelector("main")!` を class field で取得。各 React stanza は `stanzaElement={this.root}` として App に渡す。 | 互換必須 / fixture 対象 | Shadow DOM 初期 DOM、React mount target、React component 側の shadow root 操作。 | 新規小粒 case 候補: TSX React provider + `this.root.querySelector("main")` mount。 |
| `this.root.querySelector("main")` | `components/providers/StanzaReactProvider.tsx` で React root 作成に必須。 | 互換必須 | React runtime stanza 全体。`main` が存在しないと mount 不能。 | 005 の root/main 契約に React mount を追加候補。 |
| `renderTemplate()` | `gmdb-gms-by-tid` と `gmdb-roundtree` の prototype で利用。 | 互換必須だが実プロジェクト内では旧寄り | prototype stanza の維持。 | 既存 005 で十分。prototype 由来の追加 fixture は優先度低。 |
| `importWebFontCSS()` | `TogoMediumReactStanza.render()` が Google Fonts を注入。`utils/stanza.ts` にも同等 helper。 | 互換必須 / fixture 対象 | React/MUI 表示の font 読み込み、Shadow DOM link 注入。 | 005 に既存。React fixture では provider 経由で再確認候補。 |
| `handleAttributeChange()` | `TogoMediumReactStanza` が override し、attribute change ごとに `_render()`。 | 互換必須 | Web wrapper から属性が変わる場合の React 再描画。 | 005 の attribute mutation を React fixture にも適用候補。 |
| `this.query()` | 対象 source では未検出。 | 既存 005 で維持、実プロジェクト由来では追加根拠なし | なし | 追加 fixture 不要。 |
| `stanza:type` / `stanza:parameter` | 15 metadata すべてに `stanza:parameter`。TogoMedium 側は `string`、`color`、空 parameter が多い。 | 互換必須 | metadata 公開 interface、Web wrapper の属性名。 | 004 に `string` type と snake_case attribute を追加候補。 |
| `stanza:menu-placement` | 全 stanza が `none`。Web wrapper も `togostanza-menu-placement="none"` を共通指定。 | fixture / regression 対象 | help/menu 抑制、Web 埋め込み時の余計な UI 非表示。 | 003 または新小粒 case で direct embed artifact + menu none を確認候補。 |
| TSX / React runtime | 13 stanza が `TogoMediumReactStanza`、React 19、MUI、Emotion、TanStack Query、Jotai、Redux provider を含む。 | fixture / regression 対象 | TSX build、React runtime chunk、provider、Shadow DOM style injection。 | 新規小粒 case 候補: React + Emotion/MUI までは重いので、React mount + provider style だけに絞る。 |
| alias / tsconfig paths | `%stanza/*`, `%api/*`, `%core/*`, `%storybook/*` を tsconfig と `togostanza-build.js` の alias で解決。Web 側は `@/*` alias も利用。 | migration note 候補 / fixture 対象 | workspace import、cross-package import、build config migration。 | 007 に `%stanza/*` + `%core/*` の最小 alias source を追加候補。 |
| `togostanza-build.js` | `rollup-plugin-dotenv` と alias を返す旧設定。 | migration note 候補 / fixture 対象 | 旧設定ファイル、Rollup plugin escape hatch、dotenv。 | 007 に「旧設定検出 + 新設定への誘導」を migration note 候補として追加。 |
| Web 側から生成物を読む経路 | `URL_STANZA/{stanzaName}.js` を module script で読み、`togostanza-{id}` を React wrapper で出す。 | 調査ログのみ | 利用側 Web app の URL 組み立てと wrapper 実装。 | TogoStanza remake の workbench 検証対象には含めない。direct embed artifact 自体は 003 で扱う。 |
| outgoing event | Stanza source が `STANZA_RUN_ACTION` を `CustomEvent` として dispatch し、Web wrapper が document で受ける。 | 別調査後に 006 | Stanza source から外へ event を出す契約、`stanza:outgoingEvent`、container 伝播条件。 | 006 に Sending Events の観測要件を追加する。Web wrapper の遷移処理は検証対象外。 |

### Inventory

| source path | generated artifact path | 依存している TogoStanza 契約 | 分類 | 影響範囲 | 最小 fixture 化する場合の切り出し方 | 通常 build / dev / preview 手順 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `references/togomedium-web/@packages/stanza/components/providers/StanzaReactProvider.tsx` | `references/togomedium-web/@packages/stanza/dist/StanzaReactProvider-2118b75a.js` | `this.root.querySelector("main")`, `importWebFontCSS()`, `handleAttributeChange()`, React `createRoot()` | 互換必須 / fixture 候補 | 13 React stanza の共通 runtime | React App 1 個 + class field で `main` mount + attribute change rerender | `mise exec -- pnpm --filter @packages/stanza stanza:build`; dev は `stanza:server` |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-component-detail/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-component-detail.js` | `TogoMediumReactStanza`, `this.params.gmo_id`, `this.root` | 互換必須 / fixture 候補 | React Stanza の標準形 | 005/新 case に typed params + React App props を抽出 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-medium-detail/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-medium-detail.js` | `TogoMediumReactStanza`, `this.params.gm_id`, `this.root`, `%stanza/*` imports | 互換必須 / fixture 候補 | React runtime と workspace alias | React mount fixture と 007 alias fixture に分割 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-media-alignment-table-by-components/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-media-alignment-table-by-components.js` | string params (`gm_ids`, `prioritized_tax_ids`), `this.root` | 互換必須 / fixture 候補 | Web wrapper から comma-separated string attribute | 004 に `string` + snake_case attribute を追加候補 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-medium-builder/index.tsx` | `references/togomedium-web/@packages/stanza/dist/gmdb-medium-builder.js` | React runtime, Redux store injection, `this.params.source_gm_id` | fixture / regression 対象 | Provider stack、Redux store、重い interactive stanza | Redux までは持ち込まず、provider option を最小化して別 fixture 候補 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-gms-by-tid/index.ts` | `references/togomedium-web/@packages/stanza/dist/gmdb-gms-by-tid.js` | `togostanza/stanza`, `this.params`, `renderTemplate()`, `this.root.querySelector("#table_area")` | 互換必須だが prototype 寄り | 旧 TS source、template + DOM mount | 005 で既存 template/root 契約を維持。追加優先度低 | 同上 |
| `references/togomedium-web/@packages/stanza/stanzas/gmdb-roundtree/index.ts` | `references/togomedium-web/@packages/stanza/dist/gmdb-roundtree.js` | `togostanza/stanza`, `this.params`, `renderTemplate()` | 互換必須だが prototype 寄り | 旧 TS source、template output | 005 に還元。追加優先度低 | 同上 |
| `references/togomedium-web/@packages/stanza/togostanza-build.js` | build 設定のため artifact なし | Rollup plugin injection, alias, dotenv | migration note 候補 / fixture 候補 | 旧設定ファイル、workspace import 解決 | 007 に旧設定検出と `%stanza/%core/%api` alias を分けて切り出す | 同上 |
| `references/togomedium-web/tsconfig.json` / `@packages/stanza/tsconfig.json` | build 設定のため artifact なし | TSX, `jsxImportSource`, `paths` | migration note 候補 | TypeScript / TSX toolchain、workspace imports | 007 に tsconfig paths の最小例 | 同上 |
| `references/togomedium-web/@packages/web/src/components/stanzas/*.tsx` | Web app artifact は未確認 | `URL_STANZA/{id}.js`, custom element, `togostanza-menu-placement="none"` | 調査ログのみ | Web 側から Stanza 生成物を読む利用側経路 | workbench 検証対象には含めない。`togostanza-menu-placement="none"` の direct embed 挙動は 003 で扱う | Web build は `mise exec -- pnpm --filter @packages/web build`; dev/preview は `start` |
| `references/togomedium-web/@packages/web/src/types/stanza.d.ts` | Web app artifact は未確認 | custom element tag names and attributes | migration note 候補 / fixture 対象 | React JSX 型、attribute spelling | fixture では不要。migration note に「Web 側型定義更新」を記録 | 同上 |
| `references/togomedium-web/@packages/web/src/consts/api.ts` | Web app artifact は未確認 | `URL_STANZA` / `VITE_URL_STANZA` で生成物 URL を決める | 互換必須 / migration note 候補 | deployment path, CDN/static hosting | 003 に configurable base URL の direct embed path を追加候補 | 同上 |

## metadata 概要

| group | stanza 数 | parameter 傾向 | style 傾向 | menu |
| ---- | ---- | ---- | ---- | ---- |
| React Stanza 標準形 | 13 | `string`、空 parameter、単一 ID parameter が中心 | 空、または `color` 1 件 | `none` |
| prototype (`gmdb-gms-by-tid`, `gmdb-roundtree`) | 2 | `color` / `single-choice` など | `color` / `single-choice` | `none` |

TogoMedium 側では `metastanza` より metadata の style/parameter 数は少ないが、Web wrapper の属性名と TSX 側の typed params が強く結びついている。

## 実行メモ

今回の調査では実プロジェクトを build していない。既存 source と生成済み artifact の読み取り観測に留めた。

後段で通常手順を確認する場合は、`references/togomedium-web/AGENTS.md` に従い、リポジトリ root で `mise exec -- node -v` を確認し、pnpm は `mise exec -- pnpm ...` で実行する。Stanza build は `mise exec -- pnpm --filter @packages/stanza stanza:build`、Web build は `mise exec -- pnpm --filter @packages/web build`。

## このリポジトリの未解決事項

- `TogoMediumReactStanza` 相当の React/TSX runtime fixture を既存 005 に拡張するか、新しい小粒 case に分けるか。
- `%stanza/*` / `%api/*` / `%core/*` alias を remake でどこまで吸収するか。互換必須ではなく migration note 候補として扱うのが現時点の推奨。
- `togostanza-build.js` の dotenv / alias plugin を remake 側で自動実行せず、検出と移行案内に留める方針を 007 にどう反映するか。
- Web wrapper からの `URL_STANZA/{id}.js` 読み込みは利用側ロジックとして workbench 検証対象外にする。実利用事実としてこの調査ログに残す。
