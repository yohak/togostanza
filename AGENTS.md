# エージェント作業の入口

このファイルでは、エージェントがこのリポジトリで作業を始める前に読む文書を示す。詳細な判断基準は各ドキュメントに従う。

## 最初に読むもの

- `docs/README.md`
- stanza作成者向け文書を扱う場合は `docs/for-developers/README.md`
- TogoStanza本体の開発・保守・公開を扱う場合は `docs/for-maintainers/README.md`
- `docs/v4-migration/project-charter.md`
- `docs/v4-migration/setup/package-layout.md`
- `docs/v4-migration/investigation/follow-ups.md`
- `docs/v4-migration/investigation/open-questions.md`
- 文書、仕様、調査メモを読む、または直す場合は `docs/UBIQUITOUS_LANGUAGE.md`
- 仕様や方針に触る場合は `docs/v4-migration/spec/index.md` と `docs/v4-migration/spec/remake-policy.md`
- 調査や検証に触る場合は `docs/v4-migration/investigation/README.md` と該当する `workbench/cases/*/README.md`

## 必要なときに読むもの

- 文書を書く、または直す場合は `docs/writing-style.md`
- セットアップや検証環境を触る場合は `docs/v4-migration/setup/index.md`

## 基準文書の扱い

- 観測事実は `docs/v4-migration/investigation/` に記録する。
- 採用判断は `docs/v4-migration/spec/remake-policy.md` に記録する。
- リメイク版仕様は、文書の整理と引き継ぎが完了するまで `docs/v4-migration/spec/index.md` を正本として記録する。
- stanza作成者向けの案内は `docs/for-developers/`、TogoStanza本体の開発・保守文書は `docs/for-maintainers/` に置く。
- 用語は `docs/UBIQUITOUS_LANGUAGE.md` に従う。
- 文体は `docs/writing-style.md` に従う。
- 未固定事項は `docs/v4-migration/investigation/follow-ups.md` と `docs/v4-migration/investigation/open-questions.md` に記録する。

## 作業前チェック

- 依頼目的と対象ファイルを確認する。
- `git status --short` で既存変更を確認する。
- 既存の未コミット変更を勝手に戻さない。
- 質問、相談、レビュー依頼だけでは編集しない。

## 実装・検証の基本

- リメイク版パッケージはリポジトリルートの単一Nodeパッケージとして扱う。
- リポジトリルートの `package.json` と `mise.toml` を正として、Node.js / pnpmコマンドは `mise exec -- ...` 経由で実行する。
- 品質確認やbrowser testは、Codex等のsandbox実行環境ではなく、承認付き通常実行でユーザーのローカル環境を優先して確認する。
- `docs/`、`references/`、`workbench/` はNodeワークスペースではなく、品質確認scriptの通常対象にも含めない。
- `references/` はリファレンス、`workbench/` は検証領域、`sandbox/` は一時確認領域として扱う。
- 仕様変更時は対応する検証ケースの `README.md` も確認する。
- 文書更新では `git diff --check` を最低限実行する。

## 判断が必要なとき

- 仕様や方針の意味変更が必要な場合は先に相談する。
- 互換範囲を広げる場合は、現行版コード、実プロジェクト、検証ケースの根拠を確認する。
- 未固定事項は勝手に確定せず、`follow-up` または `open question` として残す。
