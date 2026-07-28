# TogoStanza Remake Docs

このディレクトリでは、このリポジトリの計画、調査、仕様整理に関する文書を管理する。

## 文書一覧

- [用語集](./UBIQUITOUS_LANGUAGE.md): 計画、調査、仕様整理で使う用語。
- [文章スタイル](./writing-style.md): 文書内の表記ゆれを防ぐための書き方。
- [プロジェクト憲章](./project-charter.md): リメイク版の目的、互換性方針、実プロジェクトの扱い。
- [開発用ノート](./development-notes.md): 作業時の考え方と、標準手順から外れやすい点。
- [セットアップ](./setup/index.md): リファレンス、サンドボックス、検証領域をローカルに準備する手順。
- [Source / config 移行ガイド](./guides/source-config-migration.md): 既存stanzaリポジトリをリメイク版へ移すための手動移行案内。
- [v4 alpha内部プレビュー](./guides/alpha-testing.md): 不変Git tagからv4 alphaをnpmまたはpnpmで試す手順。
- [GitHub dependency 運用ガイド](./guides/github-dependency.md): 短期GitHub dependency経路でのインストール、lockfile、更新の案内。
- [既存挙動調査](./investigation/README.md): 現行版 `togostanza` と実プロジェクトの既存挙動調査。
- [リメイク方針](./spec/remake-policy.md): 現行版の挙動を維持、再設計、破棄のどれとして扱うかの判断。
- [リメイク版仕様](./spec/index.md): リメイク版の外部仕様の入口。
- [実装計画](./implementation/index.md): リメイク版実装のフェーズ、完了状況、進め方。
- [正式版統合計画](./implementation/official-integration-plan.md): yohak版alpha、正式版beta、npm公開、リメイクリポジトリArchiveまでの進め方。
- [v4 alpha公開チェックリスト](./implementation/v4-alpha-release-checklist.md): alpha tagを内部プレビューへ出す前後の確認手順。
- [Phase 12後の全体棚卸し](./implementation/post-phase-12-inventory.md): 現在地と正式版マージ前の残作業候補。

## 読む順番

1. [用語集](./UBIQUITOUS_LANGUAGE.md) で用語を確認する。
2. 文書を書くときは [文章スタイル](./writing-style.md) で表記を確認する。
3. [プロジェクト憲章](./project-charter.md) で判断方針を確認する。
4. 作業手順を書く前に [開発用ノート](./development-notes.md) を読む。
5. ローカルリポジトリの準備やCLI確認を始める前に [セットアップ](./setup/index.md) を読む。
6. 既存挙動調査を始める前に [既存挙動調査](./investigation/README.md) を読む。
7. リメイク版の採用判断を行うときだけ [リメイク方針](./spec/remake-policy.md) を使う。
8. 実装仕様として確定した内容を整理するときに [リメイク版仕様](./spec/index.md) を使う。
9. 実装に入る前に [実装計画](./implementation/index.md) を読む。
10. 正式版統合準備では [正式版統合計画](./implementation/official-integration-plan.md) を読む。
11. 現在地と次の候補を確認するときは [Phase 12後の全体棚卸し](./implementation/post-phase-12-inventory.md) を読む。

## 記録範囲

- `docs/investigation/spec/` は、観測した現行版の挙動を記録する。
- `docs/spec/remake-policy.md` は、ある挙動を必須、再設計、破棄のどれとして扱うかの採用判断を記録する。
- `docs/spec/index.md` は、リメイク版そのものの仕様の入口として使う。
- `docs/implementation/` は、リメイク版の実装順序とフェーズごとの詳細計画を記録する。
- `docs/guides/` は、Stanza開発者向けの移行案内や作業手順を記録する。
