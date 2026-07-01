# 実装計画

この文書では、リメイク版の実装順序とフェーズごとのゴールを定義する。

詳細な仕様は [リメイク版仕様](../spec/index.md) を正とする。採用判断は [リメイク方針](../spec/remake-policy.md) を正とする。この文書では、各フェーズの細かなAPI設計や実装方針は固定しない。

各フェーズでは、開始時に詳細計画を作り、その詳細計画に基づいて実装と検証を行う。検証ケースはフェーズを縛るものではなく、各フェーズの完了判定に紐づくゴールとして扱う。再設計や破棄を含むフェーズでは、必要な移行メモ、差分説明、未固定事項の整理も詳細計画の成果物に含める。

## フェーズ一覧

| フェーズ | ゴール | 主な検証・成果物 | 関連文書 |
| ---- | ---- | ---- | ---- |
| Phase 0: skeleton | リメイク版パッケージとCLI土台を固める。 | パッケージ内のsmoke test | [設計](./phase-0/plan.md)、[引き継ぎ](./phase-0/handoff.md) |
| Phase 1: scaffold生成 | StanzaリポジトリとStanzaソースを生成できるようにする。 | [001](../../workbench/cases/001-cli-scaffold-and-generate/) | [設計](./phase-1/plan.md)、[引き継ぎ](./phase-1/handoff.md) |
| Phase 2: build + runtime | 生成物、直接埋め込み、Stanza source APIを縦断して動かす。 | [001](../../workbench/cases/001-cli-scaffold-and-generate/)、[002](../../workbench/cases/002-build-artifacts/)、[003](../../workbench/cases/003-runtime-embedding/)、[004](../../workbench/cases/004-runtime-parameters/)、[005](../../workbench/cases/005-stanza-source-api/)、[006](../../workbench/cases/006-inter-stanza-coordination/)、[007](../../workbench/cases/007-config-and-resolution/) | [サブフェーズ計画](./phase-2/index.md)、[引き継ぎ](./phase-2/handoff.md) |
| Phase 3: serve | ローカル開発サーバーとして確認と変更反映を成立させる。 | [011](../../workbench/cases/011-serve-development-server/) | [設計](./phase-3/plan.md)、[引き継ぎ](./phase-3/handoff.md) |
| Phase 4: compatibility | React、Vue、`togostanza-utils`、実プロジェクト回帰を確認する。 | [008](../../workbench/cases/008-react-runtime/)、[009](../../workbench/cases/009-vue-runtime/)、[010](../../workbench/cases/010-togostanza-utils-compat/)、[012](../../workbench/cases/012-real-project-regression/) | [設計](./phase-4/plan.md)、[引き継ぎ](./phase-4/handoff.md) |
| Phase 5: readiness inventory | Phase 0からPhase 4までの成果物、残課題、未固定事項を棚卸しし、Phase 6以降へ再編する。 | 棚卸し表、Phase 6以降の再編案 | [設計](./phase-5/plan.md)、[棚卸し](./phase-5/inventory.md)、[引き継ぎ](./phase-5/handoff.md) |
| Phase 6: workbench executability | workbenchの検証ケースを、repo-local CLIで再現できる入力として整える。 | workbench `remake/generated-repo`、repo-local CLI scripts | [設計](./phase-6/plan.md)、[引き継ぎ](./phase-6/handoff.md) |
| Phase X: distribution | 将来のnpm配布計画を整理する。 | 配布計画レビュー | 未着手 |

## Phase 0: skeleton

ゴールは、`package/` 直下の単一パッケージとしてリメイク版の開発土台を固めることである。Phase 0の設計は [Phase 0: skeleton 設計](./phase-0/plan.md) に置き、完了後の状態とPhase 1への引き継ぎは [Phase 0: skeleton 引き継ぎ](./phase-0/handoff.md) に置く。

含める範囲:

- `package/` の単一パッケージ構成。
- compiled JSとして実行できる `bin` 入口。
- CLI起動、command routing、終了コードの基本構造。
- format、lint、type-check、unit、integration、browser testの実行入口。
- package buildと、buildを含む完了前確認。
- 後続フェーズで実装を足せるディレクトリ構成。

含めない範囲:

- `init`、`generate stanza`、`build`、`serve` の実挙動。
- Stanzaリポジトリの生成、ビルド生成物、ランタイム実装。
- 互換性確認。

Phase 0完了後は、引き継ぎメモを確認してからPhase 1の詳細計画を作る。

## Phase 1: scaffold生成

ゴールは、Stanza開発者が `init` と `generate stanza` で作業を開始できる状態を作ることである。Phase 1の設計は [Phase 1: scaffold生成 設計](./phase-1/plan.md) に置き、完了後の状態とPhase 2への引き継ぎは [Phase 1: scaffold生成 引き継ぎ](./phase-1/handoff.md) に置く。

含める範囲:

- `togostanza init`。
- `togostanza generate stanza` / `togostanza g stanza`。
- npmとpnpmの初期化方針。
- npmとpnpmのinstall command組み立て確認。
- `--skip-install`、`--skip-git`。
- GitHub Pages workflow placeholder生成。
- 生成直後に後続フェーズの `build` / `serve` へ進める雛形。

含めない範囲:

- `togostanza init .`。
- 既存ディレクトリへのmerge、上書き、空ディレクトリ再利用。
- lockfile同時存在や `--package-manager` 指定矛盾の診断。
- ローカルtarballを使ったnpm/pnpmの実インストール確認。
- 実deploy可能なGitHub Pages workflow。
- 実際の `build` 生成物の完成。
- ランタイム動作。
- React、Vue、`togostanza-utils` 互換。

対応する主な検証ケースは [001 CLIの雛形生成とgenerate](../../workbench/cases/001-cli-scaffold-and-generate/) とする。

## Phase 2: build + runtime

ゴールは、Phase 1で作ったStanzaリポジトリをビルドし、一般Webサイトへ直接埋め込める生成物として動かすことである。

含める範囲:

- `togostanza build` / `togostanza b`。
- `build --output-path <dir>` と未指定時の `dist` 出力。
- Stanza検出、metadata検証、entrypoint、stylesheet、template、asset解決。
- `togostanza.config.ts`、旧 `togostanza-build.mjs` / `togostanza-build.js` の検出と診断、Sass `@/` alias、`tsconfig.json`、ルートassetとstanza別asset。
- Stanza entrypointからimportされる共有ソースと、そのimport graph。
- `${id}.js`、`${id}.css`、`${id}.html`、metadata、asset、共有チャンク。
- GitHub Pagesのサブパス配信で壊れない生成物URL。
- 実deploy可能なGitHub Pages workflow。
- module scriptとcustom elementによる直接埋め込み。
- open Shadow DOM、Shadow DOM内 `main`。
- `stanza:style` からCSS custom propertyの既定値への反映。
- `stanza:menu-placement`、`togostanza-menu-placement` 属性、`none`、`togostanza-menu_placement` の拒否。
- `this.params`、`renderTemplate()`、`query()`、`importWebFontCSS()`、`menu()`、`handleAttributeChange()`、`handleEvent()`。
- `togostanza--container`、CustomEvent、incoming eventとoutgoing event。
- `togostanza--event-map` と `togostanza--data-source` の再設計、実装、移行メモ。
- `togostanza--data-container` を持ち込まないことの確認。

含めない範囲:

- `serve` のwatch、差分invalidate、HTTP 500復帰。
- React、Vue固有のcompatibility。
- `togostanza-utils` compatibility。

対応する主な検証ケースは [001](../../workbench/cases/001-cli-scaffold-and-generate/)、[002](../../workbench/cases/002-build-artifacts/)、[003](../../workbench/cases/003-runtime-embedding/)、[004](../../workbench/cases/004-runtime-parameters/)、[005](../../workbench/cases/005-stanza-source-api/)、[006](../../workbench/cases/006-inter-stanza-coordination/)、[007](../../workbench/cases/007-config-and-resolution/) とする。GitHub Pages workflowの実deploy導線は、`dist/` 生成とサブパス配信を確認できるPhase 2でplaceholderから置き換え、001のPhase 2合格条件として確認する。Phase 2の詳細は [Phase 2: build + runtime サブフェーズ計画](./phase-2/index.md) で扱い、完了後の状態は [Phase 2: build + runtime 引き継ぎ](./phase-2/handoff.md) に置く。Phase 2では、最小のbuild + runtime契約を先に成立させ、その後に `togostanza--event-map` と `togostanza--data-source` の具体APIを固定して実装する順序を切る。

## Phase 3: serve

ゴールは、Stanza開発者がlocalhostで開発中のStanzaを確認し、変更を反映できる状態を作ることである。

含める範囲:

- `togostanza serve` / `togostanza s`。
- `serve --port <port>` と未指定時のport `8080`。
- localhostでの配信。
- build相当URLの提供。
- stanza一覧と最小プレビュー。
- watch、stanza固有入力の対象stanza再ビルド、依存グラフベースのinvalidate分類、安全に特定できない変更の全体invalidate。
- Phase 3ではstanza固有入力の変更は対象stanzaだけを再ビルドする。共有ソース、設定、安全に特定できない変更では全体rebuildを許容する。
- 初回ビルド失敗、再ビルド失敗、修正後復帰。
- ビルド失敗時のHTTP 500エラーページ。

含めない範囲:

- 外部Webアプリ向け配信サーバーとしての利用契約。
- HMR。
- CORS保証。
- React、Vue、`togostanza-utils` の追加互換。

serve用検証は、専用検証ケース `workbench/cases/011-serve-development-server/` で扱う。Phase 3の設計は [Phase 3: serve 設計](./phase-3/plan.md) に置き、完了後の状態とPhase 4への引き継ぎは [Phase 3: serve 引き継ぎ](./phase-3/handoff.md) に置く。

## Phase 4: compatibility

ゴールは、重点compatibility対象を既存Stanzaソースに近い形で動かすことである。

含める範囲:

- React TSX Stanzaソース。
- Vue SFC Stanzaソース。
- `togostanza-utils` のうち、TogoStanza runtime API、runtime menu contract、生成DOM構造に触れるAPI。
- `togostanza-utils/apply-filter` のimport path解決。
- compatibilityのために必要なruntime compat property。
- **実プロジェクト群**であるmetastanzaとTogoMedium Stanzaの回帰検証。

含めない範囲:

- React、Vue以外のframework support。
- `togostanza-utils` 全APIの挙動互換。
- `Data` class、tree / graph helperの挙動互換。
- SVG/PNG download出力の完全なバイト列一致。
- npm package公開。

対応する主な検証ケースは [008 React runtime](../../workbench/cases/008-react-runtime/)、[009 Vue runtime](../../workbench/cases/009-vue-runtime/)、[010 togostanza-utils compatibility](../../workbench/cases/010-togostanza-utils-compat/)、[012 Real project regression](../../workbench/cases/012-real-project-regression/) とする。実プロジェクト回帰では `references/metastanza` と `references/togomedium-web` を入力として参照し、観測結果と差分を012ケースへ記録する。Phase 4の設計は [Phase 4: compatibility 設計](./phase-4/plan.md) に置き、完了後の状態とPhase 5のreadiness inventoryへの引き継ぎは [Phase 4: compatibility 引き継ぎ](./phase-4/handoff.md) に置く。

## Phase 5: readiness inventory

ゴールは、Phase 0からPhase 4までの成果物、仕様、検証、handoff、残課題を棚卸しし、Phase 6以降へ再編できる状態を作ることである。

Phase 5は実装フェーズではない。既存実装を広げることではなく、ブロッカー、未固定事項、既知制約、後続判断を分類し、それぞれの扱いと提案先フェーズを明らかにする。

含める範囲:

- Phase 0からPhase 4までのplan / handoffの読み直し。
- `docs/spec/`、`docs/investigation/follow-ups.md`、`docs/investigation/open-questions.md`、各workbenchケースREADMEに残った未固定事項の棚卸し。
- Phase 4 handoffで後続判断として残した事項の分類。
- 各項目の分類、根拠、影響範囲、提案先フェーズの記録。
- Phase 6以降の仮ロードマップ作成。
- distributionへ進む前に閉じるべき事項と、Phase Xまで送れる事項の切り分け。

含めない範囲:

- 新規機能実装。
- 既存実装の広範な修正。
- ローカルtarballを使ったnpm/pnpmの実インストール確認。
- `npm publish` の実行。
- tag作成。
- GitHub release作成。
- `latest` として公開されたpackageの実利用確認。

Phase 5の設計は [Phase 5: readiness inventory 設計](./phase-5/plan.md) に置き、棚卸し結果は [Phase 5: readiness inventory 棚卸し](./phase-5/inventory.md)、Phase 6以降への入口メモは [Phase 5: readiness inventory 引き継ぎ](./phase-5/handoff.md) に置く。

## Phase 6: workbench executability

ゴールは、`workbench` の検証ケースを、リメイク版CLIで再現できるケース入力として整えることである。

Phase 6はdistribution準備ではない。ローカルtarballを作ってinstallする確認や、公開packageとしての `npm exec` / `pnpm dlx` 確認はPhase Xへ送る。Phase 6では、repo-localの `package/bin/togostanza.mjs` を `node` で呼ぶscriptsを基本にする。

含める範囲:

- `workbench/cases/*/remake/generated-repo/` の整備。
- repo-local CLIを呼ぶworkbench用scripts。
- 対象ケースREADMEのリメイク版実行手順。
- generated repoの `scripts.build` / `scripts.serve` 追加判断と、必要な実装。
- package automated testとworkbench入力の役割分担の明記。

含めない範囲:

- pack install smoke。
- package公開面の `files`、`exports`、`private` 解除、公開metadata整理。
- `togostanza/stanza` exportと型定義。
- dependency分類の最終整理。
- 実プロジェクト全Stanzaのbuild checkやbrowser smoke。
- TogoMedium Webアプリ本体E2E。

Phase 6の設計は [Phase 6: workbench executability 設計](./phase-6/plan.md) に置く。完了後は、Phase 7へ進む前にPhase 6 handoffを作る。

## Phase X: distribution

ゴールは、将来npm packageとして配布する場合に必要な判断、手順、確認項目を整理し、公開前検証を行うことである。

Phase Xは無期限延期とする。Phase 5で棚卸しした結果と、Phase 6以降で再編・解消した結果を見て、あらためて着手判断する。

含める範囲:

- npm配布に必要なpackage metadata、`bin`、`exports`、`files`、`engines` の最終確認。
- `npm exec togostanza@latest init` と `pnpm dlx togostanza@latest init` を公開後に成立させるための確認。
- ローカルtarballを使ったnpm/pnpmの実インストール確認。
- npm公開前に必要な検証、tag、release、rollback、権限管理の計画。
- 公開を行う場合に残る未固定事項と判断者の整理。

含めない範囲:

- Phase 5時点での着手。
- `npm publish` の実行。
- tag作成。
- GitHub release作成。
- `latest` として公開されたpackageの実利用確認。

## 詳細計画の扱い

各フェーズでは、全体の実装フローを成立させる判断を優先して固定する。

全体の実装フローに影響しないが、細かい仕様を詰める必要がある事項は、そのフェーズの主目的に直接必要でなければ後続判断へ回してよい。後続判断へ回す場合は、対象外、未決定事項、または引き継ぎ事項として明記し、暗黙に採用した扱いにしない。

例として、Phase 1では `init` と `generate stanza` の入口成立を優先する。`togostanza init .` のように便利だが既存ファイルのmerge、上書き、衝突検出まで決める必要がある入口は、Phase 1の主目的を妨げる場合は後続判断へ回す。

各フェーズの詳細計画では、次を決めてから実装に入る。

- そのフェーズで満たす仕様項目。
- そのフェーズで満たす検証ケースの観測契約。
- 実装対象の主要モジュール。
- 失敗時の診断方針。
- 実行する確認コマンド。
- そのフェーズで扱わない事項。
- 必要な移行メモ、差分説明、未固定事項。

詳細計画は、実装前に作成し、必要なレビューを受けてから実装する。フェーズ完了時には、対応する検証ケースにリメイク版の観測結果を記録する。
