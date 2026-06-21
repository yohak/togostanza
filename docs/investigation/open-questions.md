# 未解決事項

この文書では、既存挙動調査で出てきた未解決事項を集約する。

人間の確認、追加のリポジトリ調査、後続の仕様判断が必要な項目をここに記録する。

## テンプレート

```text
## 質問

- 文脈:
- 根拠:
- 重要な理由:
- 次に確認すること:
- 担当:
- 状態:
```

## 質問一覧

## `metadata["@id"]` と stanza directory 名が異なる場合の挙動

- 文脈: build の出力ファイル名は stanza directory basename を使う箇所があり、help page script src と custom element 名は `metadata["@id"]` を使う箇所がある。
- 根拠: `src/stanza-repository.mjs`、`src/build-stanzas.mjs`、`src/templates/help.html.hbs`、`doc/Reference.md`。
- 重要な理由: HTML 埋め込みの script URL と custom element 名は利用契約に関わる。
- 次に確認すること: リメイク版では、`metadata["@id"]` と stanza directory 名の一致を前提条件として仕様化する。
- 担当: Codex
- 状態: 仕様判断済み。想定外として扱う。`metastanza` と `togomedium-web/@packages/stanza` では、確認できた `metadata.json` の `@id` は stanza directory 名と一致していた。

## `this.query` の既定 HTTP method

- 文脈: docs では default method が `GET` と説明されているが、実装では `method || "POST"` に見える。
- 根拠: `doc/Reference.md`、`stanza.ts`。
- 重要な理由: 既存 stanza source が `this.query()` に method 未指定で依存している場合、開発契約に関わる。
- 次に確認すること: リメイク版では、method 未指定時の `POST` を仕様化する。
- 担当: Codex
- 状態: 仕様判断済み。`metastanza` と `togomedium-web` では `this.query` または `.query(` の使用は観測されなかった。runtime 観測用 stanza では、method 未指定の `this.query()` が `POST` で `/sparql` へ request した。

## `togostanza--data-container` 表記

- 文脈: docs の一部に `togostanza--data-container` とあるが、実装と他の例は `togostanza--container`。
- 根拠: `doc/Inter-stanza-Communication.md`、`src/elements/togostanza--container.mjs`。
- 重要な理由: 現行ドキュメント由来の利用者コードが誤表記を参照している可能性がある。
- 次に確認すること: リメイク版では、`togostanza--data-container` を誤記として破棄する。
- 担当: Codex
- 状態: 仕様判断済み。`metastanza` と `togomedium-web` では `togostanza--data-container` の使用は観測されなかった。

## `stanza.scss` と `style.scss` の表記ゆれ

- 文脈: Getting Started の生成例に `stanza.scss` があるが、実装と snapshot は `style.scss` を扱う。
- 根拠: `doc/Getting-Started.md`、`src/build-stanzas.mjs`、`tests/__snapshots__/cli.test.js.snap`。
- 重要な理由: Stanza 開発者が作成する source layout の開発契約に関わる。
- 次に確認すること: リメイク版では、`style.scss` を正とし、`stanza.scss` は旧ドキュメントの誤記として扱う。
- 担当: Codex
- 状態: 仕様判断済み。`metastanza` と `togomedium-web/@packages/stanza` では `style.scss` が観測され、`stanza.scss` は観測されなかった。

## boolean parameter のブラウザ実挙動

- 文脈: docs は boolean parameter を HTML attribute として説明しているが、実装は `attributes.hasOwnProperty(key)` を使っている。
- 根拠: `doc/Getting-Started.md`、`doc/Reference.md`、`stanza.ts`。
- 重要な理由: custom element attribute の boolean 変換は埋め込み HTML と runtime 挙動の境界にある。
- 次に確認すること: リメイク版では、boolean parameter を属性の有無で判定する挙動を仕様化する。
- 担当: Codex
- 状態: 仕様判断済み。runtime 観測用 stanza では、空の `flag` attribute が `boolean` の `true`、attribute がない `flag` が `boolean` の `false` として `this.params` に渡された。

## local serve のブラウザ実挙動

- 文脈: `serve` の help と実装に加えて、localhost 上の画面、module script、shadow root、CSS、runtime parameter 変換を sandbox で観測した。
- 根拠: `src/commands/serve.mjs`、`src/build-stanzas.mjs`、`src/stanza-element.mjs`。
- 重要な理由: HTML 埋め込み、表示、操作、asset 読み込みは利用契約に関わる。
- 次に確認すること: help preview は開発支援機能として再設計可能とする。runtime 埋め込み形式とは別物として扱う。
- 担当: Codex
- 状態: 仕様判断済み。`sandbox/current-cli-smoke` で `serve --port 8099` を起動し、in-app browser で `/` と `runtime-check.html` を確認した。`/` は `List of Stanzas` として表示され、help page は module script、help app、development reloader を読み込んだ。`runtime-check.html` の help preview では `data-url="./data.json"` が存在しないため JSON parse error が出た。

## Codex managed exec と通常ターミナルの watcher 挙動差

- 文脈: Codex managed exec の sandboxed 実行では `sandbox/current-cli-smoke` の `build` が `EMFILE` で終了したが、ユーザーの通常ターミナルと Codex の unsandboxed 実行では同じ系統の build が成功した。
- 根拠: `sandbox/current-cli-smoke` での `mise exec -- npx togostanza build --output-path dist`。
- 重要な理由: 調査時の実行環境差を、現行版の一般的な CLI 挙動として誤記録しないため。
- 次に確認すること: 現行版の `build` / `serve` を AI が確認する場合は、sandboxed exec ではなく許可済みの unsandboxed 実行を使う。
- 担当: Codex
- 状態: 運用方針決定。現行版の一般的な失敗ではなく、Codex managed exec の sandboxed 実行環境差として扱う。
