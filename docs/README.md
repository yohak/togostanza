# TogoStanza Remake Docs

このディレクトリでは、このリポジトリの計画、調査、仕様整理に関する文書を管理する。

## 文書一覧

- [用語集](./UBIQUITOUS_LANGUAGE.md): 計画、調査、仕様整理で使う用語。
- [文章スタイル](./writing-style.md): 文書内の表記ゆれを防ぐための書き方。
- [プロジェクト憲章](./project-charter.md): リメイク版の目的、互換性方針、実プロジェクトの扱い。
- [開発用ノート](./development-notes.md): 作業時の考え方と、標準手順から外れやすい点。
- [セットアップ](./setup/index.md): リファレンス、サンドボックス、検証領域をローカルに準備する手順。
- [Source / config 移行ガイド](./guides/source-config-migration.md): 既存stanzaリポジトリをリメイク版へ移すための手動移行案内。
- [GitHub dependency 運用ガイド](./guides/github-dependency.md): 短期GitHub dependency経路でのインストール、lockfile、更新の案内。
- [既存挙動調査](./investigation/README.md): 現行版 `togostanza` と実プロジェクトの既存挙動調査。
- [リメイク方針](./spec/remake-policy.md): 現行版の挙動を維持、再設計、破棄のどれとして扱うかの判断。
- [リメイク版仕様](./spec/index.md): 将来作るリメイク版の実装仕様の入口。
- [実装計画](./implementation/index.md): リメイク版実装のフェーズと進め方。

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

## 記録範囲

- `docs/investigation/spec/` は、観測した現行版の挙動を記録する。
- `docs/spec/remake-policy.md` は、ある挙動を必須、再設計、破棄のどれとして扱うかの採用判断を記録する。
- `docs/spec/index.md` は、今後作るリメイク版そのものの仕様の入口として使う。
- `docs/implementation/` は、リメイク版の実装順序とフェーズごとの詳細計画を記録する。
- `docs/guides/` は、Stanza開発者向けの移行案内や作業手順を記録する。
