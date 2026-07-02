# Phase 12 release checklist

この文書では、GitHub dependency distributionへ進む前に人間が確認する項目を整理する。

Phase 12の短期配布経路は、npm registryへのpublishではなくGitHub dependency installである。Stanza開発者は自分の `package.json` に次のようなdependencyを書く。

```json
{
  "dependencies": {
    "togostanza": "github:satoshionoda/togostanza-remake#<tag-or-sha>"
  }
}
```

## 現在の判断

| 項目 | 状態 | 判断 |
| ---- | ---- | ---- |
| package name | `togostanza` | 維持する。 |
| 配布経路 | GitHub dependency | 短期的にはnpm publishしない。 |
| root package layout | Phase 12-0で移行 | repo rootをinstallable packageにする。 |
| workspace | なし | `docs/`、`workbench/`、`references/` をroot packageのworkspace対象にしない。 |
| install時build | なし | `prepare` やinstall scriptで `dist/` を作らない。 |
| release branch / tag | Phase 12-2で定義 | build済み `dist/` を含むGitHub dependency向けrefを作る。 |
| main branchの `dist/` | なし | 通常開発branchでは `dist/` をcommitしない。 |
| `.gitignore` と `dist/` | 要確認 | 通常branchでは無視し、release refでは明示的に同梱する機構を決める。 |
| files | `bin/`, `dist/` | install対象を実行入口とcompiled JSへ絞る。 |
| bin | `togostanza` -> `./bin/togostanza.mjs` | root直下の `bin/` で維持する。 |
| exports | `./config`, `./stanza` | Stanza開発者向けの開発契約として維持する。 |
| root export | なし | Phase 12時点では追加しない。 |
| main / top-level types | なし | Phase 12時点では追加しない。 |
| license | `MIT` | 現行版package metadataと生成雛形の既定licenseに合わせる。 |
| engines.node | `>=24.5.0` | Phase 12時点では維持する。GitHub dependency運用前に利用者環境と再確認する。 |
| packageManager | rootの `package.json` で固定 | 開発パッケージの固定として維持する。 |
| generated repo `dependencies.togostanza` | GitHub dependency specへ見直し | 固定tag、commit SHA、placeholderのどれにするかPhase 12-3で決める。 |
| generated repo `packageManager` field | なし | `init` は生成しない。pnpm workflowはpnpm 10系を明示する。 |

## GitHub dependency release前に必ず確認すること

- root package layoutへ移行済みである。
- rootで `mise exec -- pnpm run check-all` が通る。
- rootで `mise exec -- pnpm run test:compat:local` が通る。
- rootで `mise exec -- pnpm run test:distribution:local` が通る。
- 通常開発branchに `dist/` をcommitしていない。
- release branch / tagにはbuild済み `dist/` が含まれる。
- release branch / tagで `dist/` を含める機構が、`.gitignore` と衝突していない。
- release branch / tagのrefを使って、npmとpnpmの両方でGitHub dependency installできる。
- install後に `togostanza --version`、`init`、`generate stanza`、`build` が動く。
- install後に `togostanza/stanza` と `togostanza/config` が解決できる。
- generated repoの `dependencies.togostanza` が、GitHub dependency specとして意図した値になる。
- `files` によってinstall対象が最小化されている。
- install対象に `dist/test/` やtest supportが混入していない。
- GitHub Pages workflowで使うlockfileとpnpm 10系の前提がREADMEに残っている。

## 外部副作用があるため明示承認を受けてから行うこと

- release branchのpush。
- tag作成。
- GitHub release作成。
- 公開GitHub Pages環境へのlive deploy。
- npm registryへのpublish。

## Phase 12通常作業では行わないこと

- `npm publish`
- GitHub Packages npm registryへの公開。
- npm registry上の `latest` packageを使った確認。
- install時buildに依存するGitHub dependency確認。
