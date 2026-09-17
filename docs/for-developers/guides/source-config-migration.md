# Source / config 移行ガイド

この文書では、既存stanzaリポジトリのsource / configをリメイク版へ移すときの手動移行方針を扱う。

この文書はリメイク版仕様そのものではない。Stanza開発者が、既存の `tsconfig.json`、旧設定ファイル、実プロジェクト固有aliasを `togostanza.config.ts` へ移すための案内である。

## 基本方針

- `tsconfig.json` の `compilerOptions.paths` は、自動でVite aliasへ合成しない。
- import解決にaliasが必要な場合は、`togostanza.config.ts` の `vite.resolve.alias` に明示する。
- TogoMedium固有aliasは、リメイク版CLIが自動吸収する一般機能にはしない。
- 旧 `togostanza-build.js` / `togostanza-build.mjs` は自動実行しない。
- `togostanza/stanza` と `togostanza/config` の型解決には、`exports` subpathを読む `moduleResolution` を使う。

## `tsconfig paths` からVite aliasへ移す

既存の `tsconfig.json` に次のような設定がある場合:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["lib/*"]
    }
  }
}
```

リメイク版では、build時のimport解決として `togostanza.config.ts` に同等のaliasを明示する。

```ts
import { resolve } from "node:path";
import { defineTogoStanzaConfig } from "togostanza/config";

export default defineTogoStanzaConfig({
  vite: {
    resolve: {
      alias: {
        "@lib": resolve(import.meta.dirname, "lib")
      }
    }
  }
});
```

この例では、`import { label } from "@lib/label.js"` のようなimportをViteが解決できるようにする。

`compilerOptions.paths` はTypeScriptやエディタの解決には使われることがある。一方で、リメイク版のbuildではViteがbundleを行うため、buildで必要なaliasは `vite.resolve.alias` に明示する。

## TogoMedium固有aliasを移す

TogoMedium Stanzaでは、次のようなaliasが観測されている。

- `%stanza/*`
- `%storybook/*`
- `%core/*`
- `%api/*`

これらはリメイク版CLIが自動で吸収しない。TogoMedium側の `togostanza.config.ts` に明示する。

```ts
import { resolve } from "node:path";
import { defineTogoStanzaConfig } from "togostanza/config";

const root = import.meta.dirname;

export default defineTogoStanzaConfig({
  vite: {
    resolve: {
      alias: {
        "%stanza": resolve(root, "src"),
        "%core": resolve(root, "../core/src"),
        "%api": resolve(root, "../api/src"),
        "%storybook": resolve(root, "../storybook/src")
      }
    }
  }
});
```

実際のpathは、TogoMedium側のworkspace構成に合わせて調整する。Phase 4の実プロジェクト回帰では、確認用の一時rootに合わせて追加のaliasを置いた箇所がある。これは検証用配置の都合であり、リメイク版CLIの一般契約ではない。

## `moduleResolution`

`togostanza/stanza` と `togostanza/config` は、リメイク版パッケージのsubpath exportとして扱う。

TypeScriptは従来の `moduleResolution: "node"` では、`package.json` の `exports` subpathを尊重しない。そのため、Stanzaソースや `togostanza.config.ts` で型解決を安定させるには、次のように `moduleResolution: "bundler"` を使うことを推奨する。

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "jsx": "react-jsx"
  }
}
```

`moduleResolution: "nodenext"` でも `exports` subpathは解決できる。ただし、StanzaソースはViteでbundleする前提のため、Phase 8の移行案内では `bundler` を推奨する。

既存stanzaリポジトリ全体を一度に更新する必要はない。型解決が必要なStanzaソースや設定ファイルから、段階的に移行してよい。

## 旧設定ファイルから移す

現行版や実プロジェクトには、旧 `togostanza-build.mjs` / `togostanza-build.js` が存在する場合がある。

リメイク版では、これらを自動実行しない。旧設定に書かれていたaliasやplugin設定は、`togostanza.config.ts` へ移す。

旧設定がaliasを返していた場合:

```js
export default {
  alias: {
    "%stanza": "./src"
  }
};
```

リメイク版では次のように移す。

```ts
import { resolve } from "node:path";
import { defineTogoStanzaConfig } from "togostanza/config";

export default defineTogoStanzaConfig({
  vite: {
    resolve: {
      alias: {
        "%stanza": resolve(import.meta.dirname, "src")
      }
    }
  }
});
```

旧設定ファイルは、移行元の情報として残してよい。ただし、リメイク版CLIがそれを実行する前提にはしない。

## 自動対応しないもの

Phase 8では、次を自動対応しない。

- `compilerOptions.paths` のVite aliasへの自動合成。
- TogoMedium固有aliasの自動吸収。
- 旧 `togostanza-build.js` / `togostanza-build.mjs` の自動実行。
- 既存workbench全体の `tsconfig.json` 一括更新。
- `init` が生成する雛形への `tsconfig.json` 追加。

必要なaliasは、Stanza開発者が `togostanza.config.ts` に明示する。

## 関連文書

- [リメイク版仕様](../../v4-migration/spec/index.md)
- [Phase 8設計](../../v4-migration/implementation/phase-8/plan.md)
- [007 config and resolution](../../../workbench/cases/007-config-and-resolution/README.md)
- [012 real project regression](../../../workbench/cases/012-real-project-regression/README.md)
