# Phase 14: Menu UI polish 計画

## ゴール

Phase 14では、StanzaをWebページへ埋め込んだ後のmenu UIを、現行版の観測可能な挙動に近づける。

Phase 2ではmenu shellを最小実装し、`metadata["stanza:menu-placement"]`、`togostanza-menu-placement`、`none`、About導線、`this.menu()` item APIを成立させた。一方、現行版では各StanzaのShadow DOM内に `<togostanza--menu>` custom elementが置かれ、info icon、popup menu、Copy HTML snippet、About this stanza、`this.menu()` item / dividerが一体で動く。実プロジェクトのmetastanzaや `togostanza-utils` も、このmenu APIに依存している。

Phase 14では、現行版の内部実装技術そのものではなく、Stanza利用者とStanza開発者から見える埋め込み後のmenu挙動を優先して復元する。

## 現行版の確認結果

- 現行版のmenuは、通常のStanzaソースではなく、runtimeに同梱された組み込みcustom elementである。
  - `references/togostanza/src/elements/togostanza--menu.mjs`
  - `MenuElement extends LitElement`
- 現行版runtimeは、`togostanza--menu`、`togostanza--container`、`togostanza--data-source` を組み込み要素として登録する。
  - `references/togostanza/src/stanza-element.mjs`
- 現行版のStanza base classは、`position: relative` のコンテナ内に `<main>` と `<togostanza--menu>` を置く。
  - `references/togostanza/stanza.ts`
- 現行版のmenuは、次を持つ。
  - info icon
  - placementに応じたpopup
  - `this.menu()` のitem / divider
  - `Copy HTML snippet to clipboard`
  - `About this stanza`
- metastanzaには、`togostanza--menu { z-index: 10000; }` のように外側custom elementへstyleを当てる例がある。
- `togostanza-utils` には、`this.menu()` から返すmenu item helperがある。
  - `dividerMenuItem()`
  - `downloadSvgMenuItem()`
  - `downloadPngMenuItem()`
  - `downloadJSONMenuItem()`
  - `downloadCSVMenuItem()`
  - `downloadTSVMenuItem()`
- metastanzaの複数Stanzaは、これらのdownload系menu helperを使っている。

## 完了条件

- StanzaのShadow DOM内に `<togostanza--menu>` custom elementが存在する。
- `<togostanza--menu>` は、`<main>` と同じ相対配置コンテナ内に置かれる。
  - `this.root.querySelector("main")` は維持する。
  - `main.parentNode instanceof HTMLElement` は維持する。
  - `main.parentNode` の中に `<main>` と `<togostanza--menu>` がある。
- `metadata["stanza:menu-placement"]` と `togostanza-menu-placement` 属性でplacementを解決する。
- `placement` は `top-left`、`top-right`、`bottom-left`、`bottom-right`、`none` を扱う。
- `placement="none"` の場合、menu UIは表示されない。
- `togostanza-menu_placement` は正式属性として扱わない。
- info iconを持つ丸いmenu buttonが表示される。
- menu button clickでpopupが開閉する。
- `Escape` と外側clickでもpopupを閉じる。
- popupには、`this.menu()` が返すitem / dividerが表示される。
- item clickでhandlerが呼ばれ、click後にpopupが閉じる。
- `Copy HTML snippet to clipboard` が表示される。
- Copy HTML snippetは、現行版と同じくmodule scriptと現在のcustom element `outerHTML` をclipboardへ書く。
- `About this stanza` が表示され、`{id}.html` を新しいタブで開けるhrefを持つ。
- `togostanza-utils` のdownload系menu helperを使う代表経路で、menu item表示とhandler実行を確認する。
- metastanza代表Stanzaで、download系menu itemが表示されることを確認する。
- `togostanza--menu { ... }` のような外側custom elementへのCSSが効くことを確認する。

## 採用判断

### 互換範囲

`togostanza--menu` の外側custom element名、placement、表示/非表示、menu item / divider、Copy HTML snippet、About導線は、埋め込み後の観測可能な挙動として現行版に寄せる。

一方、Shadow DOM内部のclass名、id、DOM階層の完全一致は固定しない。`togostanza-utils` や実プロジェクトが依存している挙動が見つかった場合は、その観測可能な要件を個別に追加する。

この採用判断は、[リメイク方針](../../spec/remake-policy.md) にも反映済みである。実装時には [リメイク版仕様](../../spec/index.md) へ、実装された外部契約を反映する。

### 実装技術

初回では、Lit、Popper、Primer Octicons packageは追加しない。

理由:

- menuはruntimeに含まれ、全Stanzaの埋め込みbundleへ影響する。
- 現行版と同じ観測挙動は、通常のcustom elementとCSSで十分近づけられる見込みがある。
- Popperによる画面端の自動flipは、初回の必須要件ではない。

info iconは、外部packageを追加せず、runtimeソース内に固定SVGとして同梱する。SVGのコード近くに出典とライセンスを記録する。実装では `innerHTML` に頼らず、`document.createElementNS()` でSVGを作る。

CSSだけでplacement popupを近似し、難しい場合はPopper導入を再検討する。

### 属性互換

`togostanza-menu_placement` は復活させない。正式属性は `togostanza-menu-placement` のままとする。

理由:

- Phase 2で、underscore変種を正式属性として扱わない判断を行い、否定テストも入れている。
- TogoMedium Webは `togostanza-menu-placement="none"` を使っている。
- 現行版寄せは強めるが、すでに整理済みの属性名までは戻さない。

## 実装方針

- `src/runtime/stanza.ts` に `TogoStanzaMenuElement` を追加するか、runtime内部moduleへ切り出す。
- `registerStanza()` 実行時に、`togostanza--menu` をidempotentにcustom element登録する。
- 既存の内部 `nav[data-togostanza-menu]` shellを、`<togostanza--menu>` へ置き換える。
- `createMainContainer()` は、`<main>` と `<togostanza--menu>` を同じ相対配置コンテナ内に置ける形へ調整する。
- `TogoStanzaMenuElement` には、少なくとも次の入力を渡す。
  - `placement`
  - `href`
  - `scriptUrl`
  - `menuDefinition`
  - `stanzaInstance`
- `scriptUrl` は、Copy HTML snippetで使う対象Stanza bundle URLである。現行版の `stanzaInstance.url` 相当として、registrationからmenuへ渡す。`href` から `.js` を逆算しない。
- menu itemは、popupを開くたび、またはStanza描画後に `this.menu()` を再評価して更新する。
- Copy HTML snippetでは、`scriptUrl` を使ったmodule scriptと、現在のcustom element属性状態を含む `outerHTML` を使う。
- Clipboard APIが使えない場合は、menu表示やStanza描画を壊さず、警告に留める。

## テスト方針

### hermetic browser test

- `togostanza--menu` がcustom element登録されること。
- StanzaのShadow DOM内に `<main>` と `<togostanza--menu>` が存在すること。
- placementごとにhost属性と表示位置が反映されること。
- 代表的な対角2配置では、computed styleまたはbounding boxで実際の配置を確認すること。
- `togostanza-menu-placement="none"` で非表示になること。
- `togostanza-menu_placement` が正式属性として扱われないこと。
- menu button clickでpopupが開き、再click、`Escape`、外側clickで閉じること。
- `this.menu()` のitem / dividerが表示されること。
- item clickでhandlerが呼ばれ、popupが閉じること。
- Copy HTML snippetで `navigator.clipboard.writeText()` が呼ばれ、module scriptとcustom element `outerHTML` が含まれること。
- Copy HTML snippet内のmodule script `src` が、対象Stanza bundleのURLを指すこと。
- About linkが `{id}.html` を指すこと。
- About linkが `target="_blank"` と `rel="noopener noreferrer"` を持つこと。
- `togostanza--menu { z-index: ... }` のような外側custom element styleが効くこと。

### `togostanza-utils` 確認

- `references/togostanza-utils` の実packageから `downloadJSONMenuItem()` などをimportし、その戻り値をmenuへ渡す。
- 実 `togostanza-utils` helperが返すmenu itemを表示し、handlerが呼ばれることを確認する。
- 手書きshimや「相当のhelper」だけでは完了扱いにしない。
- 実ファイル保存までは自動テストで確認しない。
- SVG / PNG downloadは、必要なら人間確認で補う。自動テストでは、少なくともhandlerを呼べることまでを見る。

### `test:compat:local`

- metastanza代表Stanzaで、download系menu itemが表示されることを確認する。
- 必要なら、既存のmetastanza全10 smokeのうちdownload系menuを持つStanzaを1つ選び、menu popupを開いてlabelを確認する。
- runtimeへ触るため、実装完了時は `mise exec -- pnpm run test:compat:local` も確認する。

## workbench / docs

- [012 Real project regression](../../../workbench/cases/012-real-project-regression/README.md) に、metastanza代表Stanzaでのmenu item観測を記録する。
- 必要に応じて [010 togostanza-utils compatibility](../../../workbench/cases/010-togostanza-utils-compat/README.md) に、download系menu helperの確認範囲を記録する。
- リメイク版仕様とリメイク方針は、実装時に次を反映する。
  - `togostanza--menu` custom elementを復元すること。
  - 外側custom element名と観測可能なmenu挙動は互換対象に寄せること。
  - 内部DOM class/idの完全一致は固定しないこと。

## 含めない範囲

- Lit、Popper、Primer Octicons packageの追加。
- Popper相当の画面端自動flip。
- 現行版Shadow DOM内部のclass名、id、DOM階層の完全一致。
- `togostanza-menu_placement` の復活。
- 実ファイル保存まで含むdownload E2E。
- menu UI以外のヘルププレビュー改善。
- GitHub Pages live deploy確認。

## リスクと確認事項

- PopperなしのCSS配置では、狭い埋め込み領域や画面端でpopupが見切れる可能性がある。実装が難しい場合はPopper導入を再検討する。
- Clipboard APIはブラウザ権限やsecure contextの影響を受ける。失敗してもStanza描画を壊さない。
- `togostanza-utils` のdownload helperは `stanza.root.querySelector("svg")` や `root.host.stanzaInstance.element` に依存する。Phase 11までのruntime互換を崩さないことを確認する。
- `togostanza--menu` をcustom element登録することで、同一ページに複数Stanza bundleがある場合も重複登録で落ちないようにする。

## 実行する確認コマンド

実装後は、ユーザーのローカル環境で次を確認する。

```sh
mise exec -- pnpm run check-all
mise exec -- pnpm run test:compat:local
git diff --check
```

必要に応じて、menu download helperの実ファイル保存は人間確認で補う。
