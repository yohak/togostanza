# V3からV4へのソース・設定の移行ガイド

## このガイドの対象

### 対象プロジェクト

TogoStanza V3を使い、JavaScriptでstanzaを作成しているプロジェクトを、V4でビルド・表示できるようにするための手順を示す。主に、ビルド設定とimportのパス解決を扱う。

`index.js` のstanzaはJavaScriptのまま使える。移行のためにTypeScriptへ書き換えたり、`tsconfig.json` を新しく作ったりする必要はない。TypeScriptを使っている場合の型解決は、[補足](#補足typescriptを使う場合)で扱う。

作業対象は、自分のstanzaプロジェクトにある設定とソース。TogoStanza本体の実装を移行する作業は含めない。既存ソースを活かし、必要な箇所から変更する。

### V4の導入手順

V4 Alphaの導入は、READMEの[既存プロジェクトで試す](../../../README.md#既存プロジェクトで試す)に従う。作業用ブランチに移行前の状態を残し、V4の依存を導入したうえで、以下の設定を確認する。

## 移行が必要な箇所を確認する

### そのまま使えるもの

V4では、既存のstanzaソースとWebページへの埋め込み形式を維持することを重視している。次の書き方を、V4への移行だけを理由に一律で変更する必要はない。

- `import Stanza from "togostanza/stanza"` と、`Stanza` を継承するクラス。
- `this.params`、`this.root`、`this.renderTemplate()` などのstanzaソースAPI。
- `templates/*.hbs` のHandlebarsテンプレートと、`style.scss`。
- `type="module"` のscriptと `<togostanza-{id}>` によるWebページへの埋め込み。

ただし、プロジェクト固有のビルド設定やimportの解決方法は、以下の確認が必要になる。APIや対応範囲の詳細は[現行V4仕様](../../v4-migration/spec/index.md)を参照する。

### 変更が必要になるもの

| プロジェクトの状態 | 確認すること |
| --- | --- |
| `togostanza-build.mjs` または `togostanza-build.js` がある | V4は実行しないため、必要な設定を `togostanza.config.ts` へ移す。 |
| `tsconfig.json` の `compilerOptions.paths` を使っている | ビルドに必要な別名を `vite.resolve.alias` にも指定する。 |
| `%stanza/` など、独自の接頭辞でimportしている | どのディレクトリを指すかを確認し、V4の設定へ明示する。 |

既存設定やソースの自動変換は行われない。以下の例は必要な項目を示すためのもので、既存の設定ファイル全体を置き換えるものではない。すでに設定がある場合は、その内容へ追記・統合する。

## ビルド設定を移行する

### `togostanza.config.ts` を用意する

ビルド設定が必要な場合は、stanzaプロジェクトの `package.json` と同じディレクトリに `togostanza.config.ts` を置く。JavaScriptのプロジェクトでも、このファイル名を使う。設定を追加する必要がなければ、このファイルを作る必要はない。

以下の設定例は型注釈を使わずに記述できる。設定ファイルの拡張子が `.ts` でも、stanzaソースをTypeScriptへ変えたり、`tsconfig.json` を用意したりする必要はない。

```ts
import { defineTogoStanzaConfig } from "togostanza/config";

export default defineTogoStanzaConfig({
  vite: {
    // importの別名や、必要なViteプラグインを指定する。
  }
});
```

V4のビルド基盤はVite。設定は `defineTogoStanzaConfig()` に渡し、Viteに関する項目は `vite` の下へ記述する。

### V3の設定から必要な項目を移す

`togostanza-build.mjs` / `togostanza-build.js` を開き、現在のstanzaで必要な別名やプラグインを確認する。旧設定ファイルを名前だけ変更しても、V4の設定にはならない。

たとえば、旧設定に次のような別名があり、ソースが `%stanza/` を使っている場合:

```js
export default {
  alias: {
    "%stanza": "./src"
  }
};
```

V4では、プロジェクトルートの `src/` を指す別名を次のように記述する。

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

`import.meta.dirname` はこの設定ファイルがあるディレクトリを指す。`src` は、自分のプロジェクトで実際にソースが置かれている場所に合わせる。

旧設定ファイルは移行元の記録として残せるが、V4が読み込むことはない。残っている場合は、ビルド時に旧設定を実行しなかった旨の警告が出る。

### プラグインを使っている場合

旧設定にプラグインがある場合は、何のために使っていたかを確認し、V4でも必要な処理を `vite.plugins` へ移す。使用するプラグインがViteに対応するか、必要なオプションが変わるかは、そのプラグインのドキュメントで確認する。

V3のプラグイン設定がそのまま動くとは限らない。既存の `vite.plugins` がある場合は、必要なプラグインをその配列へ追加し、別名など他の設定も保持する。

## importのパスを確認する

### 相対パスとパッケージ名

`./helper.js` や `../lib/helper.js` のような相対パス、インストール済みパッケージ名によるimportは、V4への移行だけを理由に別名へ書き換える必要はない。ビルドで見つからない場合は、参照先ファイルや必要な依存があるかを先に確認する。

### `tsconfig.json` の `paths` を使っている場合

すでに `paths` を使っているプロジェクトだけ、この節を確認する。使っていなければ追加は不要。

たとえば、次の設定で `@lib/` をプロジェクトルートの `lib/` に対応させている場合:

```json
{
  "compilerOptions": {
    "paths": {
      "@lib/*": ["./lib/*"]
    }
  }
}
```

TypeScriptやエディタでimportを解決できても、その対応はV4のビルド設定へ自動では追加されない。`togostanza.config.ts` の `vite.resolve.alias` にも指定する。

前節の `%stanza` と併用する場合は、同じ `alias` に追加する。

```ts
import { resolve } from "node:path";
import { defineTogoStanzaConfig } from "togostanza/config";

export default defineTogoStanzaConfig({
  vite: {
    resolve: {
      alias: {
        "%stanza": resolve(import.meta.dirname, "src"),
        "@lib": resolve(import.meta.dirname, "lib")
      }
    }
  }
});
```

この例では `import { label } from "@lib/label.js"` が `lib/label.js` を参照する。`paths` の `@lib/*` に対し、このVite設定では `@lib` をキーにする。TypeScriptやエディタで使う `paths` は残し、ビルド側と同じ参照先になるように揃える。

既存の `paths` に `baseUrl` や別の設定ファイルからの継承がある場合は、その設定で実際に指している場所を確認してから別名へ反映する。

### 独自の別名を使っている場合

`%stanza/`、`%core/` などの接頭辞は、TogoStanzaが自動で解釈する共通の別名ではない。プロジェクト独自の別名として、必要なものを `vite.resolve.alias` に追加する。

たとえば `%core/` が設定ファイルから見て `../core/src/` を指す構成なら、同じ `alias` オブジェクトに次の項目を追加する。

```ts
"%core": resolve(import.meta.dirname, "../core/src")
```

ディレクトリ名や階層はプロジェクトごとに異なるため、この例の配置を前提にしない。ソースのimport先が正しく解決できれば、接頭辞を一括で書き換える必要はない。

## 補足：TypeScriptを使う場合

V4は `index.js` に加えて、`index.ts` / `index.tsx` のstanzaソースにも対応する。既存のTypeScriptソースを使う場合や、設定ファイルをTypeScriptで型確認する場合は、以下を確認する。JavaScriptでstanzaを作成・ビルドするだけなら、この補足の設定は不要。

### TogoStanzaの型を解決する

`togostanza/stanza` と `togostanza/config` の型は、TogoStanzaの `package.json` にある `exports` で公開している。従来の `moduleResolution: "node"` では、この形式の型を解決できない場合がある。

ViteでビルドするTypeScriptのstanzaソースには、`moduleResolution: "bundler"` を推奨する。この設定はパッケージの `exports` に対応する。`nodenext` も対応しているが、Node.js向けのモジュール規則を使うため、すでに採用している場合は `module` との組み合わせを含めて確認する。詳細は[TypeScriptのmoduleResolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html)を参照する。

### 既存の `tsconfig.json` に反映する

対象のstanzaソースや `togostanza.config.ts` に適用される `tsconfig.json` の `compilerOptions` を確認する。Viteでビルドするソースの設定例は次のとおり。

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

この例に合わせてファイル全体を置き換えず、既存の `include`、`exclude`、`paths` などを保持する。JSXを使っている場合の設定も、プロジェクトに合わせて残す。JavaScriptだけのstanzaに、移行のためだけにJSX設定を追加する必要はない。

同じリポジトリにNode.jsで直接実行する別のアプリやツールがある場合は、その設定まで一律に変更しない。stanzaソースと設定ファイルに適用される範囲から確認する。

## 移行後の動作を確認する

### ビルドとローカル表示

READMEの[ビルドとブラウザ表示の確認手順](../../../README.md#既存プロジェクトで試す)に従い、プロジェクトのルートでビルドと開発サーバーを実行する。

ビルド成功を確認し、ローカルの一覧から代表的なstanzaを開く。TypeScriptを使っている場合は、プロジェクトで使っている型確認手順やエディタでも、型解決のエラーが残っていないか確認する。

### 既存ページへの埋め込み

stanzaを埋め込んでいる既存ページでも確認する。埋め込み先がV4の生成物を読み込んでいることを確かめ、JavaScript、CSS、画像、データなどの参照先が切れていないかを見る。

### 表示・操作・データ連携

- 移行前と同じデータとパラメーターで、必要な表示ができるか。
- パラメーター変更やメニューなどの操作が動くか。
- 外部データの読み込みや、利用しているstanza間の連携が動くか。

確認後は、設定・ソースの変更と、依存更新による `package.json`・lockfileの差分を確認する。試したstanzaやページ、結果、必要になった修正を記録する。

## 移行時に困ったとき

### import先が見つからない

エラーに出ているimportの文字列を確認する。相対パスならファイルの位置、パッケージ名なら依存のインストール状況、別名なら `vite.resolve.alias` のキーと参照先を確認する。エディタで解決できてもビルドに失敗する場合は、`paths` だけに設定がないかを確認する。

### TogoStanzaの型が見つからない

V4が導入されていることと、対象ファイルにどの `tsconfig.json` が適用されるかを確認する。`moduleResolution` が古い `node` のままになっていないか、継承元の設定に戻っていないかを見る。

### V3の設定ファイルについて警告が出る

`togostanza-build.mjs` / `togostanza-build.js` が見つかったが、実行していないことを示す警告。必要な項目が `togostanza.config.ts` に移っているかを確認する。移行後、記録として残す必要がなくなった旧設定ファイルは削除できる。

### 問題を報告する

解決しない場合は、READMEの[フィードバック案内](../../../README.md#不具合確認結果のフィードバック)に従って報告する。バージョンや再現手順に加え、問題が起きるimport、関連する設定、エラーログがあると原因を確認しやすい。
