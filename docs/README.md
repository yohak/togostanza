# TogoStanza Remake Docs

このディレクトリでは、このリポジトリの計画、調査、仕様整理に関する文書を管理する。

## 配置

- [V4 Migration](./v4-migration/README.md): V3からV4への移行を成立させるための調査、判断、実装、検証。
- `release/`: alpha公開と正式版統合の計画・手順。
- `guides/`: Stanza開発者向けの案内。
- 用語集と文章スタイルは、この文書と同じ階層に置く。

継続開発向けの本文整理は別途行う。今回の配置整理では、仕様や判断基準の意味を変更しない。

## 文書一覧

- [用語集](./UBIQUITOUS_LANGUAGE.md): 計画、調査、仕様整理で使う用語。
- [文章スタイル](./writing-style.md): 文書内の表記ゆれを防ぐための書き方。
- [プロジェクト憲章](./v4-migration/project-charter.md): リメイク版の目的、互換性方針、実プロジェクトの扱い。
- [開発用ノート](./v4-migration/development-notes.md): 作業時の考え方と、標準手順から外れやすい点。
- [セットアップ](./v4-migration/setup/index.md): リファレンス、サンドボックス、検証領域をローカルに準備する手順。
- [Source / config 移行ガイド](./guides/source-config-migration.md): 既存stanzaリポジトリをリメイク版へ移すための手動移行案内。
- [Alpha版の導入手順](../README.md#alpha版を試す): 不変GitタグからV4 Alphaをnpmまたはpnpmで試す手順と更新方法。
- [GitHub dependency 運用ガイド](./v4-migration/guides/github-dependency.md): 短期GitHub dependency経路でのインストール、lockfile、更新の案内。
- [既存挙動調査](./v4-migration/investigation/README.md): 現行版 `togostanza` と実プロジェクトの既存挙動調査。
- [リメイク方針](./v4-migration/spec/remake-policy.md): 現行版の挙動を維持、再設計、破棄のどれとして扱うかの判断。
- [リメイク版仕様](./v4-migration/spec/index.md): リメイク版の外部仕様の入口。
- [実装計画](./v4-migration/implementation/index.md): リメイク版実装のフェーズ、完了状況、進め方。
- [正式版統合計画](./release/official-integration-plan.md): yohak版alpha、正式版beta、npm公開、リメイクリポジトリArchiveまでの進め方。
- [v4 alpha公開チェックリスト](./release/v4-alpha-release-checklist.md): alpha tagを内部プレビューへ出す前後の確認手順。
- [Phase 12後の全体棚卸し](./v4-migration/implementation/post-phase-12-inventory.md): 現在地と正式版マージ前の残作業候補。

## 読む順番

1. [用語集](./UBIQUITOUS_LANGUAGE.md) で用語を確認する。
2. 文書を書くときは [文章スタイル](./writing-style.md) で表記を確認する。
3. [プロジェクト憲章](./v4-migration/project-charter.md) で判断方針を確認する。
4. 作業手順を書く前に [開発用ノート](./v4-migration/development-notes.md) を読む。
5. ローカルリポジトリの準備やCLI確認を始める前に [セットアップ](./v4-migration/setup/index.md) を読む。
6. 既存挙動調査を始める前に [既存挙動調査](./v4-migration/investigation/README.md) を読む。
7. リメイク版の採用判断を行うときだけ [リメイク方針](./v4-migration/spec/remake-policy.md) を使う。
8. 実装仕様として確定した内容を整理するときに [リメイク版仕様](./v4-migration/spec/index.md) を使う。
9. 実装に入る前に [実装計画](./v4-migration/implementation/index.md) を読む。
10. 正式版統合準備では [正式版統合計画](./release/official-integration-plan.md) を読む。
11. 現在地と次の候補を確認するときは [Phase 12後の全体棚卸し](./v4-migration/implementation/post-phase-12-inventory.md) を読む。

## 記録範囲

- `docs/v4-migration/investigation/spec/` は、観測した現行版の挙動を記録する。
- `docs/v4-migration/spec/remake-policy.md` は、ある挙動を必須、再設計、破棄のどれとして扱うかの採用判断を記録する。
- `docs/v4-migration/spec/index.md` は、リメイク版そのものの仕様の入口として使う。
- `docs/v4-migration/implementation/` は、リメイク版の実装順序とフェーズごとの詳細計画を記録する。
- `docs/guides/` は、Stanza開発者向けの移行案内や作業手順を記録する。
