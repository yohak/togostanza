# Post Phase 12 Brain Dump

この文書では、Phase 12後のプロジェクト全体の残作業、改善案、気になる点を一度フラットに整理する。

過去のPhase番号には寄せない。ここでは「今後の関心領域」と「簡単な対応方針」を並べ、次に何を計画化するかを判断するための材料にする。

この文書は、`docs/implementation/phase-12/remaining-work.md` を置き換える正本ではない。`phase-12/remaining-work.md` はPhase 12直後のGitHub dependency運用に関する残作業を扱う。この文書は、正式版マージの前提を踏まえて、プロジェクト全体の優先順位を決め直すためのBrain Dumpとして扱う。

## 正式版マージシナリオ

現行版作者との合意により、中期的にはリメイク版の内容を現行版リポジトリへ正式版として取り込むことを作業前提にする。

この前提では、正式版としてStanza開発者へ見せる導線、現行版体験からの劣化、現行版リポジトリへ入れるファイルの整理、npm registry配布の引き継ぎが重要になる。ただし、正式版マージの具体的なブランチ構成、取り込み範囲、公開タイミングは別作業で決める。

## 現在地

- GitHub dependencyによる最低限の公開は済んでいる。
- `github:yohak/togostanza#yohak-github-20260723` はnpm / pnpm smokeで確認済み。
- TogoMedium実リポジトリで `dependencies.togostanza` をGitHub dependencyへ差し替え、意図通り動くことを人間確認済み。
- リメイク版のGitHub dependency経路では、npm registryへのpublishはまだ行っていない。一方、現行版 `togostanza` はnpm registry公開済みである。
- 現行版の `init` が生成するStanzaリポジトリは、`dependencies.togostanza` にタグ無しGitHub dependencyを持つ。リメイク版も、短期の `yohak` 経路では `github:yohak/togostanza` を通常生成する。
- `engines.node` は `>=24.5.0` から `>=24.0.0` へ緩和済みである。開発・検証の標準実行環境はroot `mise.toml` のNode 24.5.0を維持する。
- `init`、`generate stanza`、`build`、`serve` の成功メッセージ、`build` / `serve` の更新時刻つきビルド所要時間、`build` の対話的な出力先clearは整備済みである。
- `develop` / `main` / immutable tagの役割方針は採用済みである。Phase 13とPhase 14は、`develop` から `main` へsourceをmergeし、同じworktreeでbuildした `dist/` を含める手順で公開反映済みである。local / remote `main` は `96722c8` で一致している。local `develop` headは `main` へmerge済みだが、remote `develop` より6 commit進んでいる。branch protectionと現在の公開 `main` に対するGitHub dependency smokeは未実施または未記録である。
- GitHub dependencyのtagは不変として扱う方針に変更済みである。修正版は新しいtagを作り、Stanzaリポジトリ側のdependency spec更新とlockfile再生成を案内する。
- GitHub dependency経路は短期配布経路として成立している。Phase 13でリッチなヘルププレビュー、Phase 14でmenu UI polishも復元済みである。一方、公開運用、Stanza開発者向けドキュメント、診断、正式版マージ後のnpm registry配布には未整理の項目が残る。

## 優先度の見方

優先度は、技術的な美しさではなく実利用への近さを基準にする。現行版にある体験かどうかは重要なシグナルとして扱うが、それだけで完全再現を必須とはしない。

- **利用契約**、**開発契約**、実プロジェクトでの使用、移行阻害、対応コストを優先して見る。
- 現行版にある、または現行版の体験として期待されているものは、劣化として見えやすいかを確認したうえで優先度を上げる。
- 現行版にない新規改善は優先度を下げる。
- 現行版になくても、GitHub dependency運用や実プロジェクトで必要になったものは例外的に優先度を上げる。

| 優先度 | 意味 |
| ------ | ---- |
| 高 | Stanza開発者や実プロジェクトが近いうちに詰まる可能性がある。 |
| 中 | 動作には直結しないが、開発体験、保守、移行のしやすさに効く。 |
| 低 | あるとよいが、現時点の実利用には近くない。 |
| 条件付き | npm publish、利用者拡大、別framework要求など、条件が来たときに扱う。 |
| 対象外 | 現時点ではやらない。記録として残す。 |

`正式版マージ前` は、中期的に現行版リポジトリへ正式版として取り込む前に必要かどうかを示す。

| 正式版マージ前 | 意味 |
| -------------- | ---- |
| 必須 | 正式版として入れる前に閉じる。 |
| 推奨 | 正式版前に閉じたいが、範囲を調整できる。 |
| 後続 | 正式版後でも扱える。 |
| 条件付き | npm publishなど、条件が来たときに扱う。 |
| 対象外 | 正式版マージ前の条件にしない。 |

## 今後の候補

| 項目 | 気になっていること | 対応方針 | 優先度 | 正式版マージ前 |
| ---- | ---------------- | -------- | ------ | ---------------- |
| `main` 公開後確認とbranch運用 | 正式版の生成repoはタグ無しGitHub dependencyを既定にするため、`main` は一般の人が見る公開入口であり、package managerがinstallする対象にもなる。Phase 13とPhase 14はbuild済み `dist/` とともに `main` へ反映済みで、local / remote `main` は一致している。一方、local `develop` はremote `develop` より6 commit進んでおり、branch protectionと現在の公開 `main` に対するGitHub dependency smokeは未実施または未記録である。 | release checklistの公開反映手順は維持する。次は現在の `main` を期待SHA付きで公開remote smokeし、branch protectionとremote `develop` の同期方針を確認する。 | 高 | 必須 |
| タグ無しGitHub dependencyのlockfile更新手順 | タグ無しGitHub dependencyも、install後はlockfileが解決commitを固定する。`main` が更新されても既存Stanzaリポジトリは自動追従しない。 | local smokeでfresh install、frozen install、同じdependency specでの明示更新を確認する。Stanza開発者向け手順は `docs/guides/github-dependency.md` に記録済み。 | 中 | 推奨 |
| CLI diagnostic messages | 成功メッセージは一巡したが、validation、migration warning、environment warningなどの失敗時診断はまだ散っている。 | 現行版にはない改善機能に近いため、優先度は下げる。必要な局所改善は各作業で拾う。 | 低 | 後続 |
| GitHub Pages live deploy確認 | workflow構造はあるが、公開GitHub Pages環境でのlive deployは未確認。 | 生成repoをpushして、install、build、artifact upload、deployまで通るかを見る。ローカル開発導線よりは一段下だが、現行版にもある公開体験として高優先に残す。 | 高 | 必須 |
| 正式版マージ準備 | 中期的に現行版リポジトリへ正式版として取り込むことを作業前提にする。正式版メインブランチでは、今回の移行のための検証コードやPhase文書がノイズになる可能性がある。 | 現行版リポジトリへ入れるもの、入れないものを分類する。正式版向けファイル整理、Stanza開発者向けドキュメント整理、検証資産の置き場所をまとめて扱う。 | 高 | 必須 |
| Stanza開発者向けドキュメント充実 | 生成README、source / config移行ガイド、release checklist、remaining workはあるが、Stanza開発者向けのまとまった正式導線としてはまだ散らばっている。 | 正式版マージ準備の一部として、導入、移行、開発、公開手順を整理する。 | 高 | 必須 |
| npm registry配布引き継ぎ計画 | 現行版 `togostanza` はnpm registry公開済みである。実際のpublishは正式版マージ後でよいが、権限、version、dist-tag、rollback、公開担当、GitHub dependencyとの移行期間をマージ後まで未決定にすると切り替え条件が分離する。 | 実publishは正式版マージ直後でもよい。正式版マージ前には、権限確認、version方針、dist-tag方針、rollback、公開担当、許容するタイムラグと利用者案内を決める。 | 高 | 必須 |
| GitHub dependency運用メモ | tag不変運用、lockfile、dependency spec更新、古いcacheを疑う場合の切り分けが運用知識として残っている。 | tag不変運用を前提に、Stanza開発者向けの短い運用メモとして整える。cache削除は公開済みtag更新の代替ではなく、ローカル切り分け用として扱う。 | 中 | 推奨 |
| TogoMedium実リポジトリ確認の詳細記録 | 「意図通り動く」ことは確認済みだが、install、build、serve、Webアプリ連携のどこまで確認したかの粒度は粗い。 | 確認範囲を追加で記録する。実装作業ではなく観測記録として扱う。 | 中 | 推奨 |
| GitHub Pages workflow運用制約 | pnpm 11系lockfile、lockfileなしpush、Action major tag、GitHub dependency specの案内が運用知識として残る。 | live deploy確認と合わせて、Stanza開発者向け案内へ寄せる。 | 中 | 推奨 |
| metadata validation強化 | `@id` とディレクトリ名一致など最小validationはあるが、`stanza:parameter` やstyle metadataの詳細schemaは広げていない。 | 現行版より厳しくする新規改善に近い。既存の正しいmetadataを壊さない範囲で、必要になったときに扱う。 | 低 | 後続 |
| `init .` merge / 既存ファイル扱い | 現状は安全側に衝突失敗する。既存 `.gitignore`、README、LICENSE、package.jsonとのmerge方針は未整理。 | Stanza開発者向けDXとして検討する。自動mergeは慎重にし、まず扱うファイル範囲を決める。 | 中 | 後続 |
| bare `init` / interactive prompt | 非対話入口を重視してきたため、bare `init` のpromptは未採用。 | 公式導線やCLI UXを見直すときに判断する。TTY / non-TTYの挙動を分けるなら別途設計する。 | 中 | 後続 |
| source / config移行案内 | `tsconfig paths` 自動解決はしない方針で、`togostanza.config.ts` の `vite.resolve.alias` へ移す。 | 手動移行ガイドを維持し、未解決alias時の診断を必要に応じて改善する。 | 中 | 推奨 |
| runtime edge semantics | 主要経路は確認済みだが、JSON parse失敗、invalid number/date/datetime、async render再入、render例外UIなど細部は固定しすぎない方針。 | 実利用で問題化したものだけ現行版挙動と照合して判断する。 | 中 | 後続 |
| serveの開発体験 | build、watch、500復帰、CORSは成立。HMR、自動reload、host指定、大規模watch性能は未対応。 | 使っていて困る点が出たら改善する。TogoMedium local serve連携は通っているため、いまは広げすぎない。 | 低 | 後続 |

## 条件付きでやる

| 項目 | 気になっていること | 対応方針 | 優先度 | 正式版マージ前 |
| ---- | ---------------- | -------- | ------ | ---------------- |
| GitHub release作成 | release branch / tagはあるが、GitHub releaseは作っていない。 | 変更内容や配布refを案内したくなった時点で作る。GitHub dependency install自体には不要。 | 条件付き | 条件付き |
| npm registry向けpackage metadata最終化 | `version`、`private` 解除、npm registry表示向けのmetadataは未確定。 | npm publishを検討するときに扱う。正式版リポジトリとして必要なrepository、homepage、bugsなどは `正式版マージ準備` 側でも確認する。 | 条件付き | 条件付き |
| generated repo `packageManager` field | 生成しない方針。pnpm workflowはpnpm 11系を明示する。 | Corepackやpnpm version差分が問題化したら再判断する。 | 条件付き | 条件付き |
| React / Vue以外のframework support | Svelteなどは実プロジェクト根拠がない。 | 実利用要求が出たら検討する。現時点で公式対応を広げない。 | 条件付き | 条件付き |
| `references/` 依存検証のCI化 | `test:compat:local` はローカル `references/` 依存で、CI再現性は保証しない。 | 本開発では対象外。CI化が必要になったら、references取得、pinning、更新運用を別途設計する。 | 条件付き | 対象外 |

## 当面やらない / 対象外

| 項目 | 気になっていること | 対応方針 | 優先度 | 正式版マージ前 |
| ---- | ---------------- | -------- | ------ | ---------------- |
| ワークスペース化 | 現状はルート単一package。`pnpm-workspace.yaml` はpnpm設定ファイルとして使うだけ。 | 当面やらない。正式版マージ前は単一packageを維持する。複数package化が必要になった場合だけ、別の大きな設計変更として扱う。 | 対象外 | 対象外 |
| install時build | GitHub dependencyでは `prepare` などでinstall時buildしない方針。 | やらない。release refに `dist/` を含める運用を維持する。 | 対象外 | 対象外 |
| source mapのbyte-level / column-level精度 | `.map` は生成するが、現行版とのmapping内容一致や列精度は固定していない。 | 互換条件にしない。必要になったら開発体験改善として扱う。 | 低 | 対象外 |
| asset inline / emit / hash / threshold固定 | assetが読めることは見るが、inline有無、hash名、thresholdは固定していない。 | 外部契約にしない。 | 低 | 対象外 |
| 細かいCLI exit code分類 | 成功 `0` / 失敗non-zeroは維持。失敗理由ごとのexit codeは未分類。 | いまはやらない。診断メッセージ改善より低優先。 | 低 | 対象外 |
| `stanza:include` | 現行機能として認識しているが、中核経路には不要だった。 | 実プロジェクト利用が確認された場合だけ優先度を上げる。 | 低 | 後続 |
| root assetをStanza sourceから安定参照するAPI | Stanza sourceから参照するassetは `stanzas/{id}/assets/` に置く方針。 | 新規APIは追加しない。 | 低 | 対象外 |
| `query()` のGET / headers / auth / timeout | POST / urlencodedの成功経路はある。GETや認証などは未対応。 | 外部API利用要求が出たら再評価する。 | 中 | 後続 |
| Stanza間連携の高度API | 静的HTML連携は成立。dynamic rewire、upgrade前queue、複数receiver、blob URL revokeなどは未対応。 | 高度化は後続。現状の実利用要求が出るまで広げない。 | 中 | 後続 |
| `url` parameter type | 仕様にあるparameter typeのみ維持。`url` は追加候補に留める。 | 追加しない。 | 低 | 対象外 |
| `togostanza-utils` 未対象API | 実 `togostanza-utils` package smokeは通っているが、全API互換ではない。 | 実プロジェクト利用が確認されたAPIだけ再評価する。 | 低 | 後続 |

## 次に整理したいこと

1. このBrain Dumpから、今すぐ扱う候補を3つ程度に絞る。
2. 各候補について、実装に入るか、先に計画を書くか、観測記録だけ増やすかを決める。
3. 優先度は人間判断で調整する。

現時点のおすすめは、次の順である。

1. 現在の公開 `main` のGitHub dependency smoke・branch protection・remote `develop` の同期確認
2. GitHub Pages live deploy確認
3. 正式版マージ準備
4. Stanza開発者向けドキュメント充実
