# TogoStanza Remake Docs

このディレクトリでは、このリポジトリにおける計画、調査、仕様整理を管理する。

## セクション

- [用語集](./UBIQUITOUS_LANGUAGE.md): 計画・調査・仕様整理で使う用語。
- [セットアップ](./setup/index.md): リファレンス、サンドボックス、検証領域のローカル準備。
- [既存挙動調査](./investigation/README.md): 現行版 `togostanza` と実プロジェクトの既存挙動調査。
- [リメイク版仕様](./spec/index.md): リメイク版実装の仕様入口。

## 読む順番

1. 用語を確認するために [用語集](./UBIQUITOUS_LANGUAGE.md) を読む。
2. ローカルリポジトリの準備やCLI確認を始める前に [セットアップ](./setup/index.md) を読む。
3. 既存挙動調査を始める前に [既存挙動調査](./investigation/README.md) を読む。
4. リメイク版の判断を行うときだけ [リメイク版仕様](./spec/index.md) を使う。

## 記録範囲

- `docs/investigation/spec/` は、観測された現行版の挙動を記録する。
- `docs/spec/` は、今後作るリメイク版の仕様を記録する。
- ある挙動を採用するか、必須とするか、除外候補にするかといった判断は、既存挙動調査ではなく `docs/spec/` に置く。
