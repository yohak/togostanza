# TogoStanza Remake Docs

このディレクトリでは、このリポジトリにおける計画、調査、仕様整理を管理する。

## セクション

- [用語集](./UBIQUITOUS_LANGUAGE.md): 計画・調査・仕様整理で使う用語。
- [プロジェクト憲章](./project-charter.md): リメイク版の目的、互換性方針、実プロジェクトの扱い。
- [セットアップ](./setup/index.md): リファレンス、サンドボックス、検証領域のローカル準備。
- [既存挙動調査](./investigation/README.md): 現行版 `togostanza` と実プロジェクトの既存挙動調査。
- [リメイク方針](./spec/remake-policy.md): 現行版の挙動を維持、再設計、破棄する判断。
- [リメイク版仕様](./spec/index.md): 将来のリメイク版実装仕様の入口。

## 読む順番

1. 用語を確認するために [用語集](./UBIQUITOUS_LANGUAGE.md) を読む。
2. 判断方針を確認するために [プロジェクト憲章](./project-charter.md) を読む。
3. ローカルリポジトリの準備やCLI確認を始める前に [セットアップ](./setup/index.md) を読む。
4. 既存挙動調査を始める前に [既存挙動調査](./investigation/README.md) を読む。
5. リメイク版の判断を行うときだけ [リメイク方針](./spec/remake-policy.md) を使う。
6. 実装仕様として確定した内容を整理するときに [リメイク版仕様](./spec/index.md) を使う。

## 記録範囲

- `docs/investigation/spec/` は、観測された現行版の挙動を記録する。
- `docs/spec/remake-policy.md` は、ある挙動を必須、再設計、破棄のどれとして扱うかといった採用判断を記録する。
- `docs/spec/index.md` は、今後作るリメイク版そのものの仕様入口として使う。
