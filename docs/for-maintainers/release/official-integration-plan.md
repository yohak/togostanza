# 正式版統合計画

この文書では、リメイク版を `togostanza/togostanza` のv4正式系へ統合するまでの進め方を定義する。

この計画は、Phase 14完了後の機能固定を前提にする。統合準備では、新機能を追加せず、v4仕様の明文化、仕様に基づくテストの再構成、正式版向け文書、配布経路、統合阻害事項を扱う。

## ゴール

- `yohak/togostanza` でv4のalphaフェーズを完了する。
- `togostanza/togostanza` へ1つのPRで統合し、v4のbetaフェーズを開始する。
- 正式版リポジトリには、製品コード、v4仕様に基づく自己完結テスト、利用者向け文書、保守者向け文書だけを持ち込む。
- リメイク固有の調査資料、Phase文書、比較検証資産は、本リポジトリをArchiveして参照可能な状態で残す。

## 基本方針

### 機能固定

Phase 14完了時点の機能を統合対象とする。alphaと統合PRでは、次だけを変更対象にする。

- v4仕様とテストの不一致。
- 正式版へ持ち込めない外部依存やリメイク固有依存の除去。
- package metadata、依存生成、CI、配布、文書の正式版対応。
- alphaの実プロジェクト確認で見つかった統合阻害事項。
- 正式版PRで表明された懸念への対応。
- 重大な不具合。

それ以外の機能追加は、正式版統合後の別作業として扱う。

### 書き込み先の切り替え

alpha完了までは、本リポジトリだけを編集する。正式版PRを作成するときは、`references/togostanza` を使わず、正式版リポジトリの書き込み可能なcheckoutを別に用意する。

export元commitを固定した後は、実装の正本を正式版リポジトリへ切り替える。PRレビュー対応は正式版側だけで行い、本リポジトリへ同じ修正を戻し続けない。

### 正式版へ持ち込まないもの

- `docs/v4-migration/implementation/` のPhase文書。
- `docs/v4-migration/investigation/` の調査記録。
- `workbench/` の比較検証環境。
- `references/` と `sandbox/`。
- リメイク作業用の用語集、セットアップ文書、作業ガイド。
- v3とv4の比較実行を前提にしたテスト。

正式版のDecision Recordから詳細な根拠を参照する必要がある場合は、本リポジトリの最終tagまたはcommit SHAへの固定リンクを使う。

## リリース段階

### alpha

v4のalphaフェーズは `yohak/togostanza` で行う。npm registryへは公開せず、不変のGit tagから利用する。

```text
v4.0.0-alpha.0
v4.0.0-alpha.1
v4.0.0-alpha.2
```

各alphaでは、ルート `package.json.version` とGit tagを一致させる。公開済みtagは移動、上書き、再利用しない。

alphaを利用するStanzaリポジトリは、TogoStanzaを `devDependencies` に置き、Git tagへ完全固定する。

```json
{
  "devDependencies": {
    "togostanza": "github:yohak/togostanza#v4.0.0-alpha.0"
  }
}
```

`init` では `TOGOSTANZA_DEPENDENCY_SPEC` を使い、CLIの起動元と生成先の依存を同じtagへ揃える。npmとpnpmのalpha利用手順は、READMEの[Alpha版の導入手順](../../../README.md#alpha版を試す)に記録する。この環境変数はalpha検証と保守用のoverrideとして維持し、正式版の一般利用手順には載せない。

### beta

alpha完了後、正式版PRではversionを `4.0.0-beta.0` にする。正式版へマージした後、npmの `beta` dist-tagで公開する。

beta版の `init` は、実行中のCLIと同じnpm versionを生成リポジトリの `devDependencies.togostanza` へ完全固定する。

```json
{
  "devDependencies": {
    "togostanza": "4.0.0-beta.0"
  }
}
```

### stable

beta利用で重大な互換性問題がなく、文書、移行、公開運用、保守体制を固定できた時点で `4.0.0` を公開し、npmの `latest` をv4へ切り替える。

alpha、beta、stableの昇格条件は状態を基準にする。正式版オーナーと相談したうえで、正式版の `docs/for-maintainers/` にチェックリストとして記録する。

## alpha準備

### 1. v4仕様を整理する

現行の `docs/v4-migration/spec/index.md` を起点に、正式版で外部契約として維持するv4仕様を整理する。v3と同じ挙動にすること自体をテスト根拠にしない。

正式版へ移す外部仕様には、少なくとも次を含める。

- CLI。
- Stanzaリポジトリ構成。
- 設定。
- メタデータ。
- StanzaソースAPI。
- ビルド生成物。
- ランタイムとcustom element。
- framework support。
- 公開と埋め込み。
- 対応Node.jsとパッケージマネージャー。
- Supported、Experimental、Internalの安定性。

### 2. テストを再構成する

テストは、明文化したv4仕様を実装が満たすことを確認する。

- v3実装との比較実行は正式版テストへ持ち込まない。
- `references/` と `workbench/` への依存をなくす。
- 必要な最小入力だけを自己完結fixtureとして抽出する。
- fixtureには、確認する仕様または契約が分かる説明を残す。
- lint、type-check、unit、integration、browser、buildはNode.js 24とpnpm 11で確認する。
- package tarballのインストール、`init`、ビルドはnpmとpnpmの両方で確認する。
- yarnとNode.js 22以下は正式サポート対象にしない。

本リポジトリ内の実プロジェクト確認は、問題発見と事前確認のために実施する。ただし、その成功だけではalpha完了と判定しない。

### 3. packageと生成依存を正式版向けにする

- 対応Node.jsは `>=24.0.0` とする。
- TogoStanza本体の保守環境はpnpm 11に固定する。
- 生成されるStanzaリポジトリはnpmとpnpmを選べる。
- 生成リポジトリへ `packageManager` fieldは書き込まない。
- 生成リポジトリのTogoStanza依存は `dependencies` ではなく `devDependencies` に置く。
- npm公開後の生成依存は、caret rangeではなく実行中のCLI versionへ完全固定する。
- 専用の `upgrade` コマンドは追加しない。更新は通常のパッケージ更新として案内する。
- ルート `package.json.version` を、CLI表示、生成依存、npm version、Git tag、GitHub Release、changelogの正本にする。

### 4. 文書を正式版向けに書き直す

正式版へ移す文書は英語で作る。v3文書を継ぎ足さず、v4を正本として全面的に書き直したうえで、v3文書の項目に漏れがないかを照合する。

正式版の基本構成は次とする。個別ファイル名と粒度は、移行対象の棚卸し後に詳細化する。

```text
README.md
docs/
  for-developers/
  for-maintainers/
CONTRIBUTING.md
CHANGELOG.md
```

`docs/for-developers/` はTogoStanzaを使ってstanzaを作成するdeveloper向けの公開文書を扱う。Getting Started、ガイド、外部リファレンス、v3からv4へのmigration guideを含める。

`docs/for-maintainers/` はTogoStanza本体を保守するための文書を扱う。内部仕様、アーキテクチャ、v4 update policy、Decision Record、品質方針、リリース手順を含める。

外部から観測できる契約は `docs/for-developers/` を正本にする。内部の不変条件は `docs/for-maintainers/` に置き、外部仕様を重複記載せずリンクする。

重要な判断は、仕様へ理由を混ぜず、Decision Recordとして分ける。Decision Recordは少なくとも `Status`、`Context`、`Decision`、`Consequences` を持つ。必要な場合は、本リポジトリの固定refを `Evidence` として参照する。

stanza作成者向けの `docs/for-developers/migration/v3-to-v4.md` と、保守者向けの `docs/for-maintainers/v4-update-policy.md` は分ける。正式版では `Remake` を主要な呼称にしない。

現行版の `doc/` は削除し、転送用stubは残さない。専用ドキュメントサイトとドキュメント専用CIは導入しない。

`CHANGELOG.md` は `4.0.0-alpha.0` から開始し、破壊的変更、既知の問題、migration guideへのリンクを記録する。

### 5. alpha tagを検証する

各alpha tagについて、少なくとも次を確認する。

- npmとpnpmの両方でGit tagからCLIを起動できる。
- `init` が同じGit tagを `devDependencies.togostanza` に生成する。
- lockfileが解決commitを固定する。
- 生成後にインストール、ビルド、ローカル配信が成立する。
- package tarballに開発資料、テスト、fixtureが混入しない。
- 通常の品質確認が通る。

## 実プロジェクト確認

alpha完了の中心条件は、`metastanza` とTogoMedium Stanzaの各オーナーによる確認である。

本リポジトリ内でも検証を行うが、その成功はalpha完了条件に含めない。各オーナーへ固定したalpha tagの確認を依頼し、Issue、PRコメント、GitHub Discussionなど、後から追跡できる形で結果を受け取る。

確認記録には、少なくとも次を含める。

- 確認した `v4.0.0-alpha.*`。
- 対象プロジェクトのcommit。
- buildと主要表示の成否。
- 必要になった移行修正。
- beta移行を妨げる問題の有無。

実プロジェクト側の変更は、beta前に必ずmergeされている必要はない。固定したalpha tagに対し、必要な修正で移行可能であり、betaを妨げる問題がないことを各オーナーが確認できればよい。

## alpha完了条件

- v4外部仕様と自己完結テストが揃っている。
- 公開用 `docs/for-developers/` と `docs/for-maintainers/` の初版が揃っている。
- npmとpnpmの両方でalpha tagから `init`、インストール、ビルドが成立する。
- `metastanza` とTogoMedium Stanzaの各オーナー確認が記録されている。
- 実プロジェクト確認で見つかった統合阻害事項が解消されている。
- v3からv4へのmigration guideとv4 update policyがレビュー可能である。
- package内容と正式版release workflowを事前確認できている。
- export元commitを固定できる。

alphaの回数と期限は固定しない。

## 正式版PR

### 準備

alpha完了時のexport元commitに不変tagを付ける。正式版リポジトリの書き込み可能なcheckoutを用意し、取り込み元SHAを記録してから作業を始める。

正式版PRは1つにまとめ、レビューしやすい論理commitへ分ける。リメイク版の履歴全体はmergeしない。

commitの具体的な分け方は正式版の既存構成を確認して決めるが、次の単位を基本にする。

1. v4 packageとソース。
2. v4仕様と自己完結テスト。
3. 利用者向け文書とmigration guide。
4. 保守者向け文書とDecision Record。
5. package metadata、CI、release workflow。
6. v3固有ファイルと不要な互換資産の整理。

### v3資産の扱い

v3テストはファイル単位で移植しない。重要な振る舞いにv4テストの不足が見つかった場合だけ、v4仕様を先に定義してから新しいテストを書く。

v3文書は項目の網羅確認に使い、本文はv4向けに書き直す。v3固有の詳細は残さず、利用者に必要な差分だけをmigration guideへ置く。

## beta公開

正式版の公開処理は、`main` へのpushでは自動実行しない。PRのマージとnpm公開を分離し、GitHub Actionsの手動workflowから公開する。

公開手順は次とする。

1. `main` 上でversion、dist-tag、package内容を検証する。
2. buildとテストを実行する。
3. npmの `beta` dist-tagで公開する。
4. npm公開に成功した後、同じcommitへGit tagを作成する。
5. `CHANGELOG.md` の該当項目を使ってGitHub Releaseを作成する。

dist-tagは手入力せず、`package.json.version` から決定する。

- `4.0.0-beta.*` は `beta`。
- prereleaseなしの `4.0.0` は `latest`。
- 許可していないversion形式では公開を中止する。

同じworkflowを再実行した場合は、npmに同じversionが存在すれば再公開せず、tagまたはGitHub Releaseの不足だけを補えるようにする。

認証にはnpm Trusted PublishingによるOIDCを推奨する。正式版オーナーがnpm側の信頼設定を行い、GitHub Actionsでは長期のpublish tokenを持たない。OIDCを採用できるかは、正式版オーナーへの確認事項として残す。

通常リリースのversion規則、changelog、workflow、OIDC、失敗時の復旧、betaからstableへの昇格条件は、正式版の `docs/for-maintainers/` に記録する。

## 公開後確認とArchive

正式版PRのマージだけでは、本リポジトリをArchiveしない。beta公開と最低限の導入確認を完了してからArchiveする。

1. 正式版PRをマージする。
2. `4.0.0-beta.0` をnpmへ公開する。
3. `npx togostanza@beta init` とpnpmの対応経路を確認する。
4. 生成依存が `4.0.0-beta.0` へ完全固定されることを確認する。
5. npmとpnpmでインストール、ビルド、代表的な生成物を確認する。
6. 本リポジトリのREADMEを、正式版リポジトリとnpm packageへ案内する内容に更新する。
7. 本リポジトリへ最終archive tagを付ける。
8. 本リポジトリのオーナーがGitHubのArchive設定を有効にする。

Archive後の本リポジトリは、正式版のDecision Recordから参照できる読み取り専用の調査・実装履歴として維持する。

## オーナー確認事項

- npm Trusted PublishingによるOIDCを正式版で採用できるか。
- alpha、beta、stableの昇格条件を正式版の運用基準として採用できるか。
- 正式版PRのマージと `4.0.0-beta.0` 公開を誰が実行するか。

## 次の作業

### Beta移行に向けた残タスク

- [ ] `init` 時にJavaScript / TypeScriptを選べる機能を検討・実装する。JavaScriptを既定、TypeScriptを任意とする方向で進め、生成内容や選択の保持方法などは[検討事項](../../v4-migration/investigation/follow-ups.md#init時のjavascript--typescript選択)で整理する。

この項目は、ユーザー指定のBeta移行に向けた後続タスクとして扱う。`alpha.1` の実装対象には含めず、今回の機能固定対象と分けて管理する。詳細仕様と着手時期は未決定で、現在のAlpha完了条件には追加しない。

### 統合準備

1. v4仕様を、正式版向けの外部契約として再構成する。
2. v4仕様を根拠に、正式版へ移す自己完結テストを再構成する。
3. alpha向けdependency生成と利用手順を整える。
4. 正式版向け文書の詳細な構成と移行元を棚卸しする。
5. `4.0.0-alpha.0` の品質確認とtag作成に進む。
