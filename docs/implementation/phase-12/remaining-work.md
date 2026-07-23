# Phase 12後の残作業

この文書では、Phase 12のGitHub dependency distribution後に残った作業を整理する。

Phase 12は、短期配布経路として `github:yohak/togostanza#yohak-github-20260723` を使う方針を採用した。local smoke、public GitHub ref smoke、TogoMedium実リポジトリでの人間確認により、TogoMedium用途ではGitHub dependency経路が成立している。

この文書は次の実装計画ではない。残作業を、いつ判断するか、どの条件で着手するかが分かるように分類する。

## 現在の到達点

| 項目 | 状態 |
| ---- | ---- |
| GitHub dependency install | `github:yohak/togostanza#yohak-github-20260723` でnpm / pnpmのsmoke確認済み。 |
| 実プロジェクト確認 | TogoMedium実リポジトリで `dependencies.togostanza` をGitHub dependencyへ差し替え、意図通り動くことを人間確認済み。 |
| release branch / tag | `release/yohak-github-dependency-20260723` と `yohak-github-20260723` を使用。 |
| install対象 | `files` により `bin/` と `dist/` へ限定済み。 |
| npm publish | Phase 12では行わない。 |

## 残作業

| 項目 | 現在の状態 | 分類 | 影響 | 推奨 |
| ---- | ---------- | ---- | ---- | ---- |
| GitHub Pages live deploy確認 | workflow構造は生成済みだが、公開GitHub Pages環境でのlive deployは未実行。 | 次にやる候補 | Stanza開発者が生成repoをpushした後の公開導線に影響する。 | GitHub dependency運用の次の実地確認として優先度高め。 |
| CLI status / result messages | `build` 成功時の所要時間表示は追加済み。全体の文言体系は未整理。 | 後続改善 | Stanza開発者が失敗原因を把握しやすくなる。 | GitHub dependency運用後、利用時に分かりにくい箇所から整理する。 |
| `engines.node >=24.5.0` | 現状維持。 | 公開前判断 | Stanza開発者のローカル環境と合わない場合、installや実行の入口で止まる。 | 利用者範囲を広げる前に実環境と照合する。 |
| npm publish | `private: true` を維持し、npm registryへは公開していない。 | npm公開時だけ | `npm exec togostanza@latest` / `pnpm dlx togostanza@latest` の公式導線に関わる。 | 短期GitHub dependency運用では着手しない。npm公開へ進む判断時に再計画する。 |
| package metadata | `description`、`license`、`keywords` は追加済み。`version`、`private`、repository、homepage、bugsは公開前判断として残る。 | npm公開時だけ | npm registryやpackage metadata表示に影響する。 | npm publishを行う場合だけ確定する。 |
| GitHub release作成 | release branch / tagはあるが、GitHub releaseは未作成。 | 任意 | Stanza開発者へ配布refや変更内容を案内しやすくなる。 | 必要になった時点で作る。GitHub dependency install自体には必須ではない。 |
| generated repo `packageManager` field | 生成しない。pnpm workflowはpnpm 11系を明示する。 | 継続判断 | ローカルpnpmとGitHub Actionsのpnpm version差に影響する可能性がある。 | 現状維持。pnpm version差分が問題化したら再判断する。 |
| `pnpm-workspace.yaml` | pnpm 11のdependency build承認を置く設定ファイルとして維持。複数packageを列挙するworkspace package定義としては使わない。 | documented constraint | 後続作業者が `docs/`、`references/`、`workbench/` をNodeワークスペース対象と誤認する可能性がある。 | `packages` を追加する場合は、ワークスペース化として別途判断する。 |
| GitHub dependency tag / lockfile運用 | npm / pnpmのlockfileはGit dependencyを解決したcommitへ固定する。同名tagを更新しても、既存lockfileやfrozen installは旧commitを参照し続ける。 | 運用制約 | 同じdependency specから環境によって異なる内容が解決され、修正版が既存生成リポジトリへ反映されない可能性がある。 | いまからtagは不変として扱う。修正時は新しいtagを作り、dependency spec更新とlockfile再生成を案内する。 |
| `test:compat:local` の可搬性 | `references/` 依存のローカル確認として維持。CI再現性は保証しない。 | 本開発外 | 他マシンやCIで同じcompatibility確認を再現しづらい。 | CI化は本開発対象外。runtimeへ触る変更時はローカルで再実行する。 |
| Sass `@import` 非推奨警告 | 既知制約。Phase 12では失敗扱いにしない。 | watch note | Sass依存更新で将来error化する可能性がある。 | 依存更新時に確認する。通常作業では深追いしない。 |

## すぐに実装しないもの

- npm registryへのpublish。
- GitHub Packages npm registryへの公開。
- install時build。
- ワークスペース化。
- source mapのbyte-level / column-level精度改善。
- 細かいCLIエラーコード分類。
- React / Vue以外のframework support拡張。

## 次の候補

次に実装作業として進むなら、GitHub Pages live deploy確認が最も自然である。

一方、すぐに実装を増やさない場合は、TogoMedium実リポジトリでの確認範囲をもう少し具体化して記録する。たとえば、install、build、serve、Webアプリ連携のどこまで確認したかを追記する。
