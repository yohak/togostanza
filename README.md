# TogoStanza V4 Alpha

## About This Project

TogoStanza is a tool for creating stanzas, such as data visualizations, and distributing them for embedding in web pages. Stanzas run as Web Components and can be loaded from HTML.

V4 is Yohak's redesign of the CLI, build environment, and runtime based on the [original TogoStanza](https://github.com/togostanza/togostanza). It updates the toolchain to Node.js 24 and Vite 8 while preserving existing stanza source and embedding methods where possible. Existing projects may need some configuration or source changes.

The project is currently releasing Alpha versions and checking builds, display, interaction, and migration procedures in real projects ahead of the official release. This README explains how to try the published `v4.0.0-alpha.0`. Install Alpha from Git tags in `yohak/togostanza`, not from the npm registry.

After Alpha verification, the planned steps are integration into the official repository, a Beta release on npm, and the stable `4.0.0` release. See the [release roadmap](./docs/for-maintainers/release/official-integration-plan.md) for the conditions at each stage.

## Try the Alpha

The following steps use JavaScript to create stanzas. Using V4 does not require rewriting existing stanzas in TypeScript.

### Prerequisites

- Node.js 24 or later.
- npm, or pnpm 11 or later. For existing projects, use the package manager already in use.
- Git.

Run these commands in the stanza project you want to try, not in the TogoStanza development repository. For a new project, start in the parent directory where you want to create it.

### Try in an Existing Project

Create a working branch and commit the pre-migration `package.json` and lockfile to Git before proceeding. Existing configuration is not converted automatically, so review it after updating the dependency.

**1. Update the Dependency to Alpha**

Change `devDependencies.togostanza` in `package.json` to the following Git tag. If `togostanza` is in `dependencies`, move it to `devDependencies`. Keep other dependencies unchanged.

```json
{
  "devDependencies": {
    "togostanza": "github:yohak/togostanza#v4.0.0-alpha.0"
  }
}
```

Then install from the project root with your package manager.

With npm:

```sh
npm install
npm exec -- togostanza --version
```

With pnpm:

```sh
pnpm install
pnpm exec togostanza --version
```

Confirm that the displayed version is `4.0.0-alpha.0`.

**2. Review Existing Configuration**

If either condition applies, follow the [source and configuration migration guide](./docs/for-developers/guides/v3-to-v4.md):

- If you use `togostanza-build.js` / `togostanza-build.mjs`, move the configuration to `togostanza.config.ts`.
- If you use `paths` in `tsconfig.json` or custom import aliases, define aliases needed for the build in `vite.resolve.alias`.

For the published `v4.0.0-alpha.0` installed by this README, write any required build configuration in `togostanza.config.ts`, even for JavaScript stanzas. Type annotations and conversion of stanza source to TypeScript are unnecessary. If no additional configuration is needed, no configuration file is required.

The upcoming `4.0.0-alpha.1` uses `togostanza.config.js` as the standard and supports `.mjs` and optional `.ts` configuration. Its Git tag has not been published, and this JavaScript configuration support is not included in `alpha.0`. To use the [migration guide's](./docs/for-developers/guides/v3-to-v4.md) JavaScript configuration examples with `alpha.0`, use the filename `togostanza.config.ts` instead.

> TypeScript supplement: `index.ts` / `index.tsx` are also supported. See the migration guide's [TypeScript supplement](./docs/for-developers/guides/v3-to-v4.md#supplement-using-typescript) for type-resolution settings.

**3. Verify the Build and Browser Display**

With npm:

```sh
npm exec -- togostanza build
npm exec -- togostanza serve
```

With pnpm:

```sh
pnpm exec togostanza build
pnpm exec togostanza serve
```

After startup, open [http://localhost:8080/](http://localhost:8080/) and choose a stanza from the index. Check representative stanzas for display, parameter changes, and interaction. If you have existing pages that embed stanzas, check their display and data integration too.

Stop the server with `Ctrl+C`. Review changes to `package.json` and the lockfile, and record them alongside any required configuration or source changes.

### Try in a New Project

Choose either npm or pnpm and follow its steps below. Replace `my-stanza-repository` with the directory name you want to create.

`init` creates the project scaffold, initializes Git, and installs dependencies. `TOGOSTANZA_DEPENDENCY_SPEC` pins the generated TogoStanza dependency to the same Alpha version as the CLI being run.

The `alpha.0` scaffold includes `tsconfig.json`, but generated stanzas can be used in JavaScript. The upcoming `alpha.1` stops generating this configuration automatically; add it only if you use TypeScript.

With npm:

```sh
TOGOSTANZA_DEPENDENCY_SPEC=github:yohak/togostanza#v4.0.0-alpha.0 \
npm exec --yes --package github:yohak/togostanza#v4.0.0-alpha.0 -- \
  togostanza init --name my-stanza-repository --package-manager npm

cd my-stanza-repository
npm exec -- togostanza --version
npm exec -- togostanza generate stanza hello
npm run build
npm run serve
```

With pnpm:

```sh
TOGOSTANZA_DEPENDENCY_SPEC=github:yohak/togostanza#v4.0.0-alpha.0 \
pnpm --package github:yohak/togostanza#v4.0.0-alpha.0 dlx togostanza \
  init --name my-stanza-repository --package-manager pnpm

cd my-stanza-repository
pnpm exec togostanza --version
pnpm exec togostanza generate stanza hello
pnpm build
pnpm serve
```

After startup, open [http://localhost:8080/hello.html](http://localhost:8080/hello.html) and confirm that `Hello, world!` appears. Changing the `say-to` parameter changes who is greeted.

The generated stanza is in `stanzas/hello/`, with JavaScript source in `index.js`. Edit the source or styles and reload the browser after rebuilding to see the changes. Stop the server with `Ctrl+C`.

Include `package.json` and the lockfile—`package-lock.json` for npm or `pnpm-lock.yaml` for pnpm—in the same commit.

### Update the Alpha Version

To try another Alpha, change `devDependencies.togostanza` in `package.json` to the next published Git tag you want to test. Run `npm install` or `pnpm install`, then recheck the displayed version, the build, and representative stanzas in the browser.

Keep the dependency pinned to a Git tag; do not switch back to a tagless reference or a branch. Published tags are not overwritten; fixes are published as new versions. Review the updated `package.json` and lockfile together and include them in the same commit. Record verification results and any required migration changes.

## Report Issues and Verification Results

Report defects or migration difficulties in [yohak/togostanza Issues](https://github.com/yohak/togostanza/issues). Successful verification results also help evaluate the Alpha.

Include the following:

- The Alpha version and Git tag used.
- The target project and commit, and Node.js and package manager versions.
- Commands run and whether installation and building succeeded.
- Stanzas or pages checked, expected behavior, and actual results. Include logs or reproduction steps for errors.
- Configuration or source changes required for migration.

## Development Documentation

- [Documentation for Stanza Authors](./docs/for-developers/README.md): Installation, configuration migration, and the current V4 specification.
- [TogoStanza Development and Maintenance](./docs/for-maintainers/README.md): Quality checks, development environments, and release procedures.
- [Development Documentation Index](./docs/README.md): Entry point for plans, designs, and investigation records.
- [V4 Specification](./docs/v4-migration/spec/index.md): CLI, configuration, stanza source APIs, runtime behavior, and other contracts.
- [Release Roadmap](./docs/for-maintainers/release/official-integration-plan.md): Conditions and steps for moving through Alpha, Beta, and the stable release.
