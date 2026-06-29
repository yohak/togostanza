# 012 Real project regression

## 目的

**実プロジェクト群**であるmetastanzaとTogoMedium Stanzaを使い、合成検証ケースだけでは拾い切れない互換性回帰を確認する。

## 対応する方針

- **実プロジェクト群**は互換性判断の強い根拠として扱う。
- metastanzaは可能な限り固定点として扱い、外れる判断をする場合は理由と影響範囲を記録する。
- TogoMedium Stanzaは、必要なソース修正や移行手順も判断材料に含める。
- リファレンスリポジトリは汚さず、観測結果と差分をこの検証ケースに記録する。

## 入力条件

- `references/metastanza` をmetastanzaの入力として参照する。
- `references/togomedium-web` のTogoMedium Stanza領域を入力として参照する。
- 008、009、010で確認したReact、Vue、`togostanza-utils` 互換を、実プロジェクトのStanzaソースでも確認できるようにする。

## 現行版で観測すること

- 現行版でビルドできるstanzaと、既知の失敗または警告。
- 実プロジェクトで使われているentrypoint、stylesheet、template、asset、config、framework、`togostanza-utils` の利用箇所。
- 実プロジェクトが依存するランタイムDOM、menu、parameter、event、asset解決の挙動。

## リメイク版で観測すること

- 対象stanzaがリメイク版でビルドできること。
- 直接埋め込み、Shadow DOM、parameter、style、menu、framework mountが主要stanzaで崩れないこと。
- `togostanza-utils` の互換対象APIが実プロジェクト上で動くこと。
- 仕様上再設計した箇所について、必要な移行手順で復帰できること。

## 合格条件

- metastanzaとTogoMedium Stanzaの対象範囲、実行コマンド、観測結果が記録されている。
- 仕様で互換対象にした挙動が、実プロジェクト上で確認されている。
- 仕様で再設計または破棄した挙動は、差分、理由、移行メモが記録されている。
- 失敗が残る場合は、仕様違反、未実装、実プロジェクト側の移行対象、未固定事項のどれかに分類されている。

## 記録する差分

- 対象リポジトリ、commit、package manager、Node.jsバージョン。
- 対象stanzaと確認した機能領域。
- ビルド結果、ブラウザ観測結果、警告、エラー。
- 必要な移行メモと、合成検証ケースへ切り出すべき観測契約。

## 未決定事項

- 実プロジェクト回帰の対象stanzaをどこまで広げるか。
- 実プロジェクトを直接参照するだけで足りるか、小さなケース入力へ抽出する必要があるか。
- 自動化する範囲と、手動ブラウザ確認として残す範囲。
