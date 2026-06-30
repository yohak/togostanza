# Phase 2-1: build artifact spine 引き継ぎ

この文書では、Phase 2-1完了後にPhase 2-2へ引き継ぐ事実、境界、注意点を扱う。

Phase 2-1の設計は [plan.md](./plan.md) を正とする。この文書は設計ではなく、完了後の状態と後続サブフェーズへの引き継ぎメモである。

## 完了したこと

- `build` / `b` を、valid Stanzaリポジトリで生成物を作る入口として実装した。
- 未指定時は `dist/`、`--output-path <dir>` 指定時は指定ディレクトリへ出力するようにした。
- 出力先cleanと安全ガードを実装した。
- 出力先には `.togostanza-build-output` markerを置き、失敗build後も次回buildでcleanして復帰できるようにした。
- Stanza検出を実装した。
- `metadata.json` の最小validationを実装した。
- `metadata["@id"]` とstanzaディレクトリ名の一致を要求するようにした。
- 不正な `@id` は、`togostanza-{id}` がvalid custom element名にならない入力として失敗するようにした。
- entrypoint候補を `index.tsx`、`index.ts`、`index.js` の順で解決するようにした。
- Phase 1のStanza ID規則を `package/src/cli/stanza-id.ts` に共有化した。
- ViteをCLI内部のビルド基盤として導入した。
- `vite` と `sass` は、`build` 実行時依存として `dependencies` に追加した。
- 複数Stanza entrypointを1回のVite buildでbundleするようにした。
- `togostanza/stanza` をCLI package内のbuild用runtime stubへaliasし、repo側 `node_modules/togostanza` は実解決しないようにした。
- build用runtime stubは、Phase 1生成の `index.js` がbundleできる最小実装として追加した。
- bundle内のStanza classがtree-shakingで消えないように、Phase 2-1用のbuild wrapperを使うようにした。
- `style.scss` を `sass` で `{id}.css` へcompileするようにした。
- `style.scss` がない場合は空の `{id}.css` とsource mapを生成するようにした。
- Sassの最小 `@/` aliasを、Stanzaリポジトリrootへ解決するようにした。
- `{id}.js.map`、共有チャンクのsource map、`{id}.css.map` を生成するようにした。
- root `assets/` を `assets/` へ、stanza別 `assets/` を `{id}/assets/` へコピーするようにした。
- `.keep` は公開生成物へコピーしないようにした。
- `{id}/metadata.json` を出力するようにした。
- About導線の受け皿になる最小 `{id}.html` を生成するようにした。
- `{id}.html` は `./{id}.js` と `./{id}.css` を相対URLで参照するようにした。
- `index.html` と `-togostanza/` はPhase 2-1では生成しないようにした。
- `runCli()`、`cli.ts`、`bin/togostanza.mjs` をasync handlerに対応させた。
- 002ケースに、Phase 2-1のリメイク版観測とno stanza時の現行版との差分を記録した。

## 意図的に残したこと

- custom element登録。
- 生成された `{id}.js` を読み込んだときの `<togostanza-{id}>` upgrade。
- open Shadow DOM生成。
- Shadow DOM内 `main` 生成。
- Shadow DOMへのCSS適用。
- `stanza:style` からCSS custom propertyの既定値への反映。
- runtimeからのmetadata参照。
- runtimeからのasset参照。
- menu placement、About導線、`${id}.html` へのruntime側リンク。
- `togostanza-menu-placement` 属性と `none` の扱い。
- `togostanza-menu_placement` の拒否。
- `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()` の本格実装。
- `templates/*.hbs` の読み込みと `renderTemplate()` 連携。
- `togostanza/stanza` runtimeの完成。
- `togostanza` dependencyの実利用可能性確認。
- Stanza entrypointからのasset import。
- CSS内 `url(...)` の高度なasset解決。
- Sassの高度なmodule解決。
- `togostanza.config.ts` の読み込み。
- 依存パッケージ内asset import。
- ヘルププレビューUI。
- GitHub Pages workflow placeholderの実deploy workflow化。

## Phase 2-2で使う前提

- `build` / `b` は生成物を作れる。
- Phase 2-2では、Phase 2-1が作った `{id}.js`、`{id}.css`、`{id}.html`、`{id}/metadata.json` を入力として使える。
- `{id}.js` にはブラウザで解決できないbare import `togostanza/stanza` は残らない。
- 共有チャンクがある場合、`{id}.js` から共有チャンクへの参照は相対importになる。
- `{id}.js` と `{id}.css` からsource mapへの参照は相対URLになる。
- `{id}.html` から `{id}.js` と `{id}.css` への参照は相対URLになる。
- root assetは `assets/`、stanza別assetは `{id}/assets/` に配置される。
- `metadata.json` は `{id}/metadata.json` に配置される。
- `.togostanza-build-output` markerは生成物ディレクトリに含まれるが、公開利用者向け契約ではない。
- build用runtime stubの正本はCLI package内にある。
- Stanzaリポジトリの `dependencies.togostanza` はrepo判定と利用者向け依存宣言であり、Phase 2-1のbundle時には実解決していない。
- source mapの存在は確認済みだが、内部構造やbyte-level互換は外部契約にしない。

## Phase 2-2で回収すること

- build用runtime stubを、最小ランタイム埋め込みとして拡張または置き換える。
- `{id}.js` 読み込み時に `togostanza-{id}` をcustom elementとして登録する。
- `<togostanza-{id}>` がupgradeされることをbrowser testで確認する。
- open Shadow DOMを作る。
- Shadow DOM内に `main` を作る。
- `{id}.css` をShadow DOMへ適用する。
- `stanza:style` metadataをCSS custom propertyの既定値として反映する。
- metadataとassetを、GitHub Pagesのサブパス配信相当でも相対URLで参照できることを確認する。
- menu placementを成立させる。
- `togostanza-menu-placement` と `none` の扱いを確認する。
- `togostanza-menu_placement` を受け付けないことを確認する。
- About導線から `${id}.html` へ到達できることを確認する。
- Phase 2-1のbuild wrapperを、実runtime登録とどう統合するか決める。
- `treeshake: false` を維持するか、実runtime登録後に見直すか決める。

## Phase 2-2で注意すること

- Phase 2-1のruntime stubは、DOMを動かす目的ではなくbundleを通す目的の最小実装である。
- Phase 2-2では、`this.params` や `renderTemplate()` の本格挙動を作り込みすぎない。必要最小限の呼び出しだけを定義し、詳細はPhase 2-3へ渡す。
- `stanza:style` はCSS custom propertyの既定値に使う。リメイク版では `this.params` へ入れない契約で進める。
- `{id}.html` はAbout導線の受け皿として使えるが、ヘルププレビューUIではない。
- `.togostanza-build-output` markerをruntimeやworkflowの公開assetとして扱う必要はない。
- CLI同梱runtimeと生成リポジトリの `dependencies.togostanza` versionがずれる可能性は、Phase 2-2またはPhase 5で再確認する。

## 後続判断として残すこと

- `.togostanza-build-output` markerを公開生成物から除外するか。
- CLI同梱runtimeを正本にし続けるか、repo側dependency解決へ寄せるか。
- `togostanza` dependencyの実利用可能性確認をどのタイミングで入れるか。
- `index.html` と `-togostanza/` のヘルププレビュー生成をPhase 2内で扱うか、Phase 3へ送るか。
- source map内部のsources pathや内容を追加で検証するか。
- Stanza entrypointからのasset importと依存パッケージ内asset importをPhase 2-4でどこまで互換対象にするか。

## 確認結果

- `git diff --check` を実行し、問題なし。
- `cd package && pnpm run check-all` を承認付き通常実行で確認し、問題なし。
- `pnpm run check-all` では format、lint、type-check、build、unit test、integration test、browser test が通った。
- unit testは50件、integration testは17件、browser testは1件が通った。

## 関連commit

- `9692077 docs: add phase 2-1 build plan`
- `5e8972e docs: refine phase 2-1 build plan`
- `0b77b21 docs: align phase 2-1 build expectations`
- `d7c6a72 build: add vite and sass dependencies`
- `19872da feat: implement phase 2-1 build artifacts`
- `4b42a8c fix: keep build output recoverable after failure`
- `d3983cd docs: record no-stanza build difference`
