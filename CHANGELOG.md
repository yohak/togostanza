# Changelog

All notable changes to TogoStanza v4 will be documented in this file.

## [4.0.0-alpha.1]

### Added

- JavaScript configuration through `togostanza.config.js` and `togostanza.config.mjs`, using ES module syntax without requiring `type: "module"` in the project package.
- A JavaScript-first [V3-to-V4 source and configuration migration guide](./docs/for-developers/guides/v3-to-v4.md), with optional TypeScript guidance.

### Changed

- Updated the development test framework to Vitest 5.0.1.
- JavaScript is the standard configuration format; existing `togostanza.config.ts` files remain supported.
- Multiple configuration candidates are rejected before any is loaded. Configuration load failures stop the build without falling back to another file or to no configuration.
- `init` no longer generates `tsconfig.json`. TypeScript projects can add their own configuration; existing TypeScript settings are preserved.
- Reorganized documentation around developers, maintainers, and V4 migration work. Added a V4 specification inventory and separate terminology and writing guidance for ongoing development.
- Translated the README, agent instructions, and developer and maintainer documentation into English while retaining V4 migration documents in Japanese.

### Notes

- The distribution target is the `v4.0.0-alpha.1` Git tag; this Alpha is not published to the npm registry. The README installation commands target that tag and require it to be available on GitHub.
- Preparing this release does not complete the Alpha phase; project-owner acceptance and the remaining integration conditions are tracked separately.

## [4.0.0-alpha.0]

### Added

- Initial internal preview of the rewritten TogoStanza CLI and runtime.
- Node.js 24 support with npm and pnpm project workflows.
- Vite-based build and development server.
- Stanza runtime, configuration, framework, preview, and menu support covered by the remake phases.

### Changed

- Generated Stanza repositories declare TogoStanza as a development dependency.
- Internal preview projects pin TogoStanza to an immutable `yohak/togostanza` alpha tag.

### Notes

- This alpha is distributed from GitHub tags and is not published to the npm registry.
- Migration details and the supported v4 contract will be expanded before the official beta.
