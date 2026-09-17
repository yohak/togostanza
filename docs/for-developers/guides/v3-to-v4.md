# Migrate Source and Configuration from V3 to V4

## Scope

### Projects Covered

This guide explains how to build and display an existing TogoStanza V3 project with V4 when its stanzas are written in JavaScript. It focuses on build configuration and import path resolution.

Stanzas with `index.js` can remain in JavaScript. Migration does not require rewriting them in TypeScript or creating a `tsconfig.json`. Type resolution for TypeScript projects is covered in the [supplement](#supplement-using-typescript).

The work applies to configuration and source files in your own stanza project. It does not cover migrating TogoStanza's implementation. Keep existing source and change the parts that need adjustment.

### Install V4

Follow [Try in an Existing Project](../../../README.md#try-in-an-existing-project) in the README to install V4 Alpha. Preserve the pre-migration state on a working branch, install the V4 dependency, and then review the configuration below.

This guide targets `4.0.0-alpha.1`; use the README's installation commands once its Git tag is available. The earlier `v4.0.0-alpha.0` supports only the configuration filename `togostanza.config.ts`. If you remain on `alpha.0`, keep the examples' contents but use the `.ts` filename; switch to a JavaScript configuration filename only after upgrading.

## Identify Required Changes

### What Can Stay the Same

V4 prioritizes preserving existing stanza source and the web-page embedding format. You do not need to change the following solely because you are migrating to V4:

- `import Stanza from "togostanza/stanza"` and classes extending `Stanza`.
- Stanza source APIs such as `this.params`, `this.root`, and `this.renderTemplate()`.
- Handlebars templates in `templates/*.hbs` and `style.scss`.
- Embedding with a `type="module"` script and `<togostanza-{id}>`.

Project-specific build configuration and import resolution still need the checks below. See the [current V4 specification](../../v4-migration/spec/index.md) for API details and supported scope.

### What May Need Changes

| Project condition | What to check |
| --- | --- |
| `togostanza-build.mjs` or `togostanza-build.js` exists | V4 does not execute it; move the required configuration to `togostanza.config.js`. |
| `compilerOptions.paths` is used in `tsconfig.json` | Also define aliases needed for builds in `vite.resolve.alias`. |
| Imports use custom prefixes such as `%stanza/` | Identify the directories they refer to and configure them explicitly for V4. |

Existing configuration and source are not converted automatically. The examples below show the relevant settings; they are not replacements for an entire existing configuration file. Merge them with settings you already have.

## Migrate Build Configuration

### Create `togostanza.config.js`

If build configuration is needed, place `togostanza.config.js` next to the stanza project's `package.json`. Use this filename for JavaScript projects as well. If no additional configuration is needed, you do not need to create the file.

Write the configuration with JavaScript `import` / `export`. Loading it does not require converting stanzas to TypeScript, creating `tsconfig.json`, or adding `type: "module"` to `package.json`.

JavaScript configuration uses ES modules. CommonJS `module.exports` is not supported.

`alpha.1` supports three configuration formats. Keep only one in the project root.

| Filename | Purpose |
| --- | --- |
| `togostanza.config.js` | The standard JavaScript configuration. |
| `togostanza.config.mjs` | An explicit ES modules extension. |
| `togostanza.config.ts` | Optional TypeScript configuration or continued use of an existing configuration. |

If multiple candidates exist, loading fails before any is read. When renaming the file, do not leave the previous candidate in the same directory. A loading failure also stops processing; it does not fall back to another file or to no configuration.

If you remain on `alpha.0`, save this example as `togostanza.config.ts`.

```js
import { defineTogoStanzaConfig } from "togostanza/config";

export default defineTogoStanzaConfig({
  vite: {
    // Define import aliases and any required Vite plugins.
  }
});
```

V4 uses Vite as its build foundation. Pass configuration to `defineTogoStanzaConfig()` and place Vite settings under `vite`.

### Transfer Required V3 Settings

Open `togostanza-build.mjs` / `togostanza-build.js` and identify aliases and plugins needed by your stanzas. Renaming the legacy file alone does not convert it into V4 configuration.

For example, suppose the old configuration defines this alias and the source uses `%stanza/`:

```js
export default {
  alias: {
    "%stanza": "./src"
  }
};
```

In V4, define the alias for the project root's `src/` directory as follows:

```js
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

`import.meta.dirname` refers to the directory containing this configuration file. Replace `src` with the actual source location in your project.

You can retain the legacy file as a migration record, but V4 will not load it. If it remains, the build warns that the legacy configuration was not executed.

### If You Use Plugins

For each plugin in the legacy configuration, identify its purpose and move functionality still needed in V4 to `vite.plugins`. Check the plugin's documentation for Vite compatibility and any changed options.

V3 plugin settings may not work unchanged. If `vite.plugins` already exists, add the required plugins to that array and preserve other settings, including aliases.

## Check Import Paths

### Relative Paths and Package Names

Relative imports such as `./helper.js` or `../lib/helper.js`, and imports by installed package name, do not need to be rewritten as aliases solely for V4. If a build cannot resolve one, first check that the target file or required dependency exists.

### If You Use `paths` in `tsconfig.json`

This section applies only to projects already using `paths`. There is no need to add it otherwise.

For example, this configuration maps `@lib/` to the project root's `lib/` directory:

```json
{
  "compilerOptions": {
    "paths": {
      "@lib/*": ["./lib/*"]
    }
  }
}
```

Even if TypeScript or your editor resolves these imports, that mapping is not automatically added to V4's build configuration. Also define it in `vite.resolve.alias` in `togostanza.config.js`.

To use it alongside `%stanza` from the previous section, add it to the same `alias` object:

```js
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

Here, `import { label } from "@lib/label.js"` resolves to `lib/label.js`. The `@lib/*` entry in `paths` corresponds to the key `@lib` in this Vite configuration. Keep the `paths` used by TypeScript or your editor and align their targets with the build configuration.

If existing `paths` rely on `baseUrl` or inheritance from another configuration file, identify their resolved locations before adding the aliases.

### If You Use Custom Aliases

Prefixes such as `%stanza/` and `%core/` are not shared aliases that TogoStanza interprets automatically. Add the ones your project needs to `vite.resolve.alias`.

For example, if `%core/` points to `../core/src/` relative to the configuration file, add this entry to the same `alias` object:

```js
"%core": resolve(import.meta.dirname, "../core/src")
```

Directory names and nesting vary by project; do not assume this example's layout. If imports resolve correctly, you do not need to replace the prefixes throughout your source.

## Supplement: Using TypeScript

V4 supports stanza sources in `index.ts` / `index.tsx` as well as `index.js`. Review this section if you use existing TypeScript source or type-check a TypeScript configuration file. These settings are unnecessary for simply creating and building JavaScript stanzas.

In `alpha.1`, `init` does not generate `tsconfig.json` automatically. Add it for your source only if you use TypeScript. Existing TypeScript configuration can remain in use. The earlier `alpha.0` generates the file automatically, but that does not require writing stanzas in TypeScript.

### Resolve TogoStanza Types

Types for `togostanza/stanza` and `togostanza/config` are exposed through `exports` in TogoStanza's `package.json`. The older `moduleResolution: "node"` may not resolve types exposed this way.

For TypeScript stanza source built with Vite, `moduleResolution: "bundler"` is recommended. It supports package `exports`. `nodenext` also supports them, but uses Node.js module rules; if your project already uses it, check its combination with `module`. See the [TypeScript moduleResolution documentation](https://www.typescriptlang.org/tsconfig/moduleResolution.html) for details.

### Update Existing `tsconfig.json`

Check `compilerOptions` in the `tsconfig.json` applying to your stanza source or optional `togostanza.config.ts`. For source built with Vite, an example is:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

Do not replace the whole file with this example. Preserve existing `include`, `exclude`, `paths`, and other settings. Keep JSX settings appropriate to your project if you use JSX. JavaScript-only stanzas do not need JSX settings solely for migration.

If the repository also contains applications or tools run directly by Node.js, do not apply the same changes indiscriminately to their configuration. Start with the configuration that applies to stanza source and configuration files.

## Verify the Migration

### Build and Local Preview

Follow the README's [build and browser verification steps](../../../README.md#try-in-an-existing-project) to run the build and development server from the project root.

Confirm that the build succeeds and open representative stanzas from the local index. If you use TypeScript, also check for remaining type-resolution errors with the project's type-checking procedure or editor.

### Embedding in Existing Pages

Check existing pages that embed your stanzas. Confirm that they load V4 outputs and that references to JavaScript, CSS, images, data, and other resources remain valid.

### Display, Interaction, and Data Integration

- Does the required display work with the same data and parameters as before migration?
- Do parameter changes, menus, and other interactions work?
- Do external data loading and any inter-stanza communication you use work?

After verification, review configuration and source changes along with dependency changes in `package.json` and the lockfile. Record the stanzas or pages tested, the results, and any required fixes.

## Troubleshooting

### An Import Cannot Be Resolved

Inspect the import string in the error. For a relative path, check the file location; for a package name, check dependency installation; for an alias, check the key and target in `vite.resolve.alias`. If the editor resolves an import but the build fails, check whether the mapping exists only in `paths`.

### TogoStanza Types Cannot Be Found

Confirm that V4 is installed and identify the `tsconfig.json` applying to the file. Check whether `moduleResolution` still uses the older `node` value or inherits it from another configuration.

### A Warning Mentions a V3 Configuration File

The warning means that `togostanza-build.mjs` / `togostanza-build.js` was found but not executed. Check that required settings have been moved to `togostanza.config.js`. After migration, you can delete legacy configuration files that are no longer needed as records.

If you use `alpha.0`, check `togostanza.config.ts` as the migration target instead.

### Multiple Configuration Files or a Loading Failure

If a V4 version with JavaScript configuration support reports multiple candidates, keep only one of `.js` / `.mjs` / `.ts`. For a loading failure, inspect the file and cause named in the diagnostic and fix the syntax or import target. There is no fallback to another format or to no configuration; resolve the error before retrying.

### Report a Problem

If the issue persists, follow the README's [feedback instructions](../../../README.md#report-issues-and-verification-results). Along with the version and reproduction steps, include the failing import, related configuration, and error logs to help identify the cause.
