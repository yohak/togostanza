# V4仕様と文書の棚卸し

継続開発用文書と自己完結テストへの引き継ぎを準備するための棚卸し。2026-09-17にcommit `2952025` の状態を確認した。仕様判断、安定性区分、リリース準備完了の判定は変更しない。

[現行V4仕様](../spec/index.md)を引き続き正本とする。採用判断は[リメイク方針](../spec/remake-policy.md)、未確定の作業は[Follow-ups](./follow-ups.md)と[未解決事項](./open-questions.md)で管理する。今回はテストのソースを確認しており、この文書作業では実装テストを実行していない。

## 明文化済みの契約

「明文化済み」は、仕様に契約が記載されていることを示す。すべての条項が、成功した自己完結テストに対応付けられていることを意味しない。最終列は文書の引き継ぎ先候補であり、今回これらの仕様を新設・移動するものではない。

| 現行仕様の領域 | 引き継ぐ明文化済みの契約 | 既存の検証入口 | 文書の引き継ぎ先候補 |
| --- | --- | --- | --- |
| 基本要件 | Node.js 24以上、ブラウザのES modules・custom elements・open Shadow DOM、埋め込み先でのビルドを要求しない直接埋め込み | packageのengines、CLI統合テスト、ブラウザテスト | developer向けの前提条件と埋め込みリファレンス |
| CLI | `init`、`generate stanza`、`build`、`serve`、aliasとoption、npm/pnpm選択、JS雛形、終了と診断の挙動 | CLI統合テスト、routerテスト | developer向けCLIリファレンスと導入ガイド |
| stanzaリポジトリとメタデータ | ソース配置、ID一致、entrypoint優先順、テンプレート、スタイル、共有ソース、公開asset | routerテスト、CLI統合テスト | developer向けプロジェクト構成とメタデータリファレンス |
| 設定と解決 | JS/mjs/任意のTS設定、設定候補は1つ、失敗時の扱い、旧設定を実行しないこと、Vite拡張の入口 | build-configテスト、routerテスト | developer向け設定リファレンスとV3移行ガイド |
| ビルド生成物と公開 | 出力先、module読み込み、公開メタデータ、相対URL、出力先の上書き保護、Pages workflow | routerテスト、CLI統合テスト、ブラウザテスト | developer向けビルド・公開・埋め込みガイド |
| 開発サーバー | 一時出力、`dist/`を変更しないこと、localhost/CORSの範囲、変更検知、HTTP 500と復帰、状態メッセージ | routerテスト、CLI統合テスト、ブラウザテスト | developer向けserveリファレンス、maintainer向けサーバー設計 |
| ランタイム埋め込みとパラメーター | custom element名、Shadow DOM、menu、属性変換とライフサイクル | ランタイム単体テスト、ブラウザテスト | developer向けランタイム・パラメーターリファレンス |
| stanzaソースAPI | base classのimport、テンプレート、query、フォント、ライフサイクルフック、menu item | ブラウザのソースAPIテスト、ランタイム単体テスト | developer向けAPIリファレンス |
| stanza間連携 | containerとイベントの目的、event-map/data-sourceの目的、旧data-container名を対象外とすること | ブラウザの連携テスト | API判断後のdeveloper向け連携リファレンス |
| frameworkとutility | React/TSXとVue SFCの重点対応、ランタイムに関わる所定の`togostanza-utils`互換範囲 | 通常のReact/Vueブラウザテスト、ローカルutility互換テスト | developer向け連携ガイドと互換範囲 |

検証ソースは[routerテスト](../../../src/cli/router.spec.ts)、[build-configテスト](../../../src/cli/build-config.spec.ts)、[ランタイム単体テスト](../../../src/runtime/stanza.spec.ts)、[CLI統合テスト](../../../src/test/integration/cli.integration.spec.ts)、[ブラウザテスト](../../../src/test/browser/custom-element.smoke.spec.ts)を参照する。仕様には比較検証ケース001–013との対応もあり、それらの記録はMigrationの根拠として保持する。

## 判断と明文化が必要な事項

次の項目は、公開契約を引き継ぐ前に整理が必要である。実装の存在は検討の根拠であり、仕様判断の代わりにはならない。

| 項目 | 現時点の根拠 | 次に行うこと |
| --- | --- | --- |
| `stanza:include` | 仕様とFollow-upsで明示的に未確定 | 利用調査と採用判断を完了する |
| メタデータschemaとvalidation | ID規則は明文化済み、広範なvalidationは未固定、メタデータ検証の比較ケースは存在する | 保証する最小範囲と追加検証の提案を分け、保証ごとにテストを対応付ける |
| event-mapとdata-sourceのAPI | 具体APIは仕様上未固定だが、`src/runtime/stanza.ts`に属性処理があり、ブラウザテストに連携テストが存在する | 実装、比較検証の根拠、必要な外部契約を照合し、文書化するAPIを決める |
| 設定の公開範囲、alias優先順、tsconfig paths | 設定の入口と拡張の目的は仕様化されているが、解決の詳細は未固定。`src/config.ts`は`vite?: InlineConfig`を公開する | 完全なリファレンスを書く前に、対応する公開範囲と解決規則の保証を決める |
| ルートasset参照 | 公開時のコピー先は明文化済みだが、ソース内の参照記法は未固定 | 必要な参照形式とテストの根拠を特定する |
| Supported / Experimental / Internal | 統合計画で必要とされているが、現行仕様では機能ごとの区分がない | 境界を合意する。実装の存在からSupportedとは判断しない |
| `init`時の言語選択 | JS既定・TS任意の方向がBeta向けFollow-upに記録されているが、詳細挙動は未決定 | 現行Alphaの挙動と完了条件から分けて扱う |

## 意図的に固定していない詳細

仕様の「未固定事項」には、実装の約束や、文書化全体を止める判断待ちとは異なる項目も含まれる。

- HMRは必須ではなく、ページ再読み込みが明文化済みの更新方法である。
- ヘルププレビューやmenu UIの内部構造、DOMの詳細、内部bundle名は固定された契約ではない。
- assetのinline/emit/hash/sizeの選択は実装詳細とし、対応するimportと公開pathが動くことを維持する。
- 細かなCLIエラーコード分類と出力文言そのものは互換性の保証対象にしない。成功・失敗と有用な診断は契約に含まれる。
- Pages workflowのjob名、trigger、Actionのバージョン、YAML構造は、公開契約を満たす範囲で変更できる。
- React/Vue以外のframework、custom domain、CNAME生成、リポジトリ設定の自動変更は、現行仕様では必須または固定仕様にしていない。

将来これらを標準化する場合は、別途スコープや仕様の判断が必要になる。存在しないことを、そのまま実装漏れとして扱わない。

## 検証の引き継ぎ

[package scripts](../../../package.json)では、通常の確認とローカル互換確認を既に分けている。`test:browser`は`@compat-local`を除外し、`test:compat:local`はローカル互換テストを明示的に有効化する。ブラウザテストのファイルには両方が含まれ、utility互換確認用helperは`workbench/`の入力を読む。[ローカル互換確認の補助コード](../../../src/test/support/compat-local.ts)も`references/`の入力を確認する。

この分離は引き継ぎの準備になる。ただし、文字列検索に一致しただけでは通常テストがそれらに依存するとは判断できず、正式版へ移す内容が自己完結しているとも証明できない。次の検証では、以下を確認する。

1. 外部契約ごとに通常テストのassertionを対応付け、未検証の条項と、V3挙動との比較だけを根拠にするテストを特定する。
2. ローカル互換確認のうち、正式版向けに最小の自己完結した入力を必要とする契約を特定する。特にutility連携を確認する。
3. 正式版へ移すテスト群からMigration専用helperとケースを分離または除外し、`references/`と`workbench/`がない状態で検証する。
4. npmとpnpmの両方について、packageのインストールと生成プロジェクトの確認を維持する。[配布確認スクリプト](../../../src/scripts/distribution-smoke.mjs)と[Git依存確認スクリプト](../../../src/scripts/github-dependency-smoke.mjs)は既存の検証入口であり、今回の棚卸しでの実行結果ではない。
5. 統合計画に従い、プロジェクトオーナーによる受け入れ確認をローカル自動テストの結果と分けて記録する。

## 既存の課題管理文書との照合

[未解決事項](./open-questions.md)には、既に判断済みとされた項目が含まれる。メタデータIDの一致、`this.query()`の既定method、data-containerの誤記、stylesheet名、booleanの扱いなどが該当する。このファイルに残っていることだけを理由に未解決へ戻さない。

[Follow-ups](./follow-ups.md)には、将来の提案と、現在は部分的に仕様化された領域が混在している。メタデータの診断、サーバーからの埋め込み、ヘルププレビューの挙動などが該当する。残作業一覧に変換する前に、項目ごとに現行契約と根拠を照合する。古い記述だけでは未解消の不具合とは判断しない。

## 文書の引き継ぎ

| 資料 | 保持・抽出する内容 |
| --- | --- |
| 現行V4仕様 | 外部契約とその検証を`for-developers/`へ引き継げる状態になるまで正本として保持する |
| リメイク方針と比較記録 | Migrationの判断理由はここに保持し、maintainerが継続して必要とする判断だけを抽出する |
| setupのqualityとpackage-layout | 継続して使うコマンド、リポジトリの前提、品質方針をmaintainer向け文書へ抽出し、Migration用セットアップと公開履歴はここに保持する |
| developer向けV3移行ガイド | 既存のstanzaプロジェクトに必要なため、本体の移行作業完了後も提供する |
| 正式版統合計画とAlphaチェックリスト | 全体の移行条件と個々のリリース操作を分ける。重複の整理は未実施 |
| 用語集と文章スタイル | Migrationの原文を保持し、継続開発文書には新しい共通文書を使う |

統合計画では`for-developers/migration/v3-to-v4.md`を提案しているが、現行ガイドは[for-developers/guides/v3-to-v4.md](../../for-developers/guides/v3-to-v4.md)にある。公開文書の構成を固定するときに配置名を整理する。今回の棚卸しではガイドを移動しない。

準備は[正式版統合計画](../../for-maintainers/release/official-integration-plan.md)の順序に従い、外部契約、自己完結テスト、packageと生成依存、正式版向け文書、Alphaタグ検証の順に進める。英語の目次案や用語整理は先に進められるが、公開マニュアル全体の完成と正本の切り替えは引き継ぎの準備が整ってから行う。
