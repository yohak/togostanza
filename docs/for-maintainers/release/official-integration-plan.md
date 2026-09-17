# Official Integration Plan

This document defines the process for integrating the remake into the official V4 release line in `togostanza/togostanza`.

The plan assumes a feature freeze after Phase 14. Integration preparation covers documenting V4 contracts, restructuring tests around those contracts, preparing official documentation and distribution paths, and resolving integration blockers. It does not add new features.

## Goals

- Complete the V4 Alpha phase in `yohak/togostanza`.
- Integrate into `togostanza/togostanza` through a single PR and begin the V4 Beta phase.
- Transfer only product code, self-contained tests based on the V4 specification, developer documentation, and maintainer documentation to the official repository.
- Archive this repository while keeping remake-specific investigation materials, phase documents, and comparison assets available for reference.

## Principles

### Feature Freeze

Integration targets the features present at the end of Phase 14. During Alpha and the integration PR, limit changes to:

- Mismatches between the V4 specification and tests.
- Removal of external or remake-specific dependencies that cannot be transferred to the official repository.
- Official-release preparation for package metadata, generated dependencies, CI, distribution, and documentation.
- Integration blockers found through real-project Alpha checks.
- Concerns raised in the official integration PR.
- Serious defects.

Handle other feature additions separately after official integration.

### Switch the Editing Destination

Until Alpha is complete, edit only this repository. When creating the official PR, prepare a separate writable checkout of the official repository instead of using `references/togostanza`.

After fixing the export source commit, switch the implementation's source of truth to the official repository. Address PR review only there; do not keep copying the same fixes back to this repository.

### Exclude from the Official Repository

- Phase documents in `docs/v4-migration/implementation/`.
- Investigation records in `docs/v4-migration/investigation/`.
- Comparison environments in `workbench/`.
- `references/` and `sandbox/`.
- The glossary, setup documents, and working guides specific to the remake effort.
- Tests that require comparative execution of V3 and V4.

When an official Decision Record needs detailed evidence, link to a fixed final tag or commit SHA in this repository.

## Release Stages

### Alpha

Run the V4 Alpha phase in `yohak/togostanza`. Distribute through immutable Git tags without publishing to the npm registry.

```text
v4.0.0-alpha.0
v4.0.0-alpha.1
v4.0.0-alpha.2
```

For each Alpha, align the root `package.json.version` with the Git tag. Do not move, overwrite, or reuse a published tag.

Stanza repositories using Alpha place TogoStanza in `devDependencies`, pinned to an exact Git tag.

```json
{
  "devDependencies": {
    "togostanza": "github:yohak/togostanza#v4.0.0-alpha.0"
  }
}
```

For `init`, use `TOGOSTANZA_DEPENDENCY_SPEC` to align the CLI's source tag with the generated dependency. Document npm and pnpm usage in the README's [Alpha installation instructions](../../../README.md#try-the-alpha). Retain this environment variable as an override for Alpha verification and maintenance; do not include it in general usage instructions for the official release.

### Beta

After Alpha completion, set the version to `4.0.0-beta.0` in the official PR. After merging into the official repository, publish with npm's `beta` dist-tag.

Beta `init` pins the generated repository's `devDependencies.togostanza` to the exact npm version of the running CLI.

```json
{
  "devDependencies": {
    "togostanza": "4.0.0-beta.0"
  }
}
```

### Stable

Publish `4.0.0` and switch npm's `latest` to V4 once Beta usage shows no serious compatibility issues and documentation, migration, release operations, and maintenance arrangements are settled.

Promotion criteria for Alpha, Beta, and Stable are based on readiness. Agree on them with the official repository owner and record them as checklists in the official `docs/for-maintainers/`.

## Alpha Preparation

### 1. Organize the V4 Specification

Start from the current `docs/v4-migration/spec/index.md` and organize the V4 external contracts to maintain in the official release. Matching V3 behavior alone is not a test requirement.

The transferred external specification must cover at least:

- CLI.
- Stanza repository layout.
- Configuration.
- Metadata.
- Stanza source APIs.
- Build outputs.
- Runtime and custom elements.
- Framework support.
- Publication and embedding.
- Supported Node.js versions and package managers.
- Supported, Experimental, and Internal stability classifications.

### 2. Restructure Tests

Tests verify that the implementation satisfies the documented V4 specification.

- Do not transfer comparative execution against V3 into official tests.
- Remove dependencies on `references/` and `workbench/`.
- Extract only the minimal required inputs as self-contained fixtures.
- Describe the specification or contract verified by each fixture.
- Run lint, type checks, unit, integration, browser, and build checks with Node.js 24 and pnpm 11.
- Verify package tarball installation, `init`, and builds with both npm and pnpm.
- Do not officially support yarn or Node.js 22 and earlier.

Run real-project checks in this repository for issue discovery and preliminary verification. Passing them alone does not establish Alpha completion.

### 3. Prepare the Package and Generated Dependencies

- Require Node.js `>=24.0.0`.
- Pin the maintenance environment for TogoStanza itself to pnpm 11.
- Allow generated stanza repositories to choose npm or pnpm.
- Do not write a `packageManager` field into generated repositories.
- Place the generated TogoStanza dependency in `devDependencies`, not `dependencies`.
- After npm publication, pin generated dependencies to the exact running CLI version rather than a caret range.
- Do not add a dedicated `upgrade` command. Describe upgrades as ordinary package updates.
- Use the root `package.json.version` as the source of truth for CLI display, generated dependencies, npm versions, Git tags, GitHub Releases, and the changelog.

### 4. Rewrite Documentation for the Official Release

Write transferred documentation in English. Rewrite it around V4 as the source of truth rather than extending V3 documents, then compare its coverage against the V3 documentation.

Use the following base structure. Determine individual filenames and granularity after inventorying the material to transfer.

```text
README.md
docs/
  for-developers/
  for-maintainers/
CONTRIBUTING.md
CHANGELOG.md
```

`docs/for-developers/` contains public documentation for developers creating stanzas with TogoStanza: Getting Started, guides, external references, and a V3-to-V4 migration guide.

`docs/for-maintainers/` covers maintenance of TogoStanza itself: internal specifications, architecture, the V4 update policy, Decision Records, quality policy, and release procedures.

Make `docs/for-developers/` authoritative for externally observable contracts. Put internal invariants in `docs/for-maintainers/` and link to external specifications instead of duplicating them.

Separate important decisions into Decision Records rather than mixing their rationale into specifications. Each Decision Record has at least `Status`, `Context`, `Decision`, and `Consequences`. When needed, reference a fixed ref in this repository as `Evidence`.

Separate `docs/for-developers/migration/v3-to-v4.md` for stanza authors from `docs/for-maintainers/v4-update-policy.md` for maintainers. Do not use `Remake` as the primary name in the official release.

Delete the existing V3 `doc/` without leaving redirect stubs. Do not introduce a dedicated documentation site or documentation-only CI.

Start `CHANGELOG.md` at `4.0.0-alpha.0`, recording breaking changes, known issues, and links to the migration guide.

### 5. Verify Alpha Tags

For each Alpha tag, verify at least:

- The CLI can start from the Git tag with both npm and pnpm.
- `init` writes the same Git tag to `devDependencies.togostanza`.
- The lockfile pins the resolved commit.
- Installation, building, and local serving work after generation.
- The package tarball excludes development materials, tests, and fixtures.
- Standard quality checks pass.

## Real-Project Acceptance

Confirmation by the owners of `metastanza` and TogoMedium Stanza is central to Alpha completion.

Run checks in this repository too, but do not count their success as Alpha completion. Ask each owner to verify a fixed Alpha tag and provide traceable results through an Issue, PR comment, GitHub Discussion, or similar record.

Each record includes at least:

- The verified `v4.0.0-alpha.*` version.
- The target project's commit.
- Whether the build and primary displays work.
- Required migration changes.
- Whether any issues block the transition to Beta.

Changes in the real projects do not have to be merged before Beta. It is sufficient for each owner to confirm that migration to the fixed Alpha tag is possible with the required changes and that no issues block Beta.

## Alpha Completion Conditions

- V4 external specifications and self-contained tests are ready.
- Initial public `docs/for-developers/` and `docs/for-maintainers/` are ready.
- `init`, installation, and builds work from Alpha tags with both npm and pnpm.
- Acceptance by the owners of `metastanza` and TogoMedium Stanza is recorded.
- Integration blockers discovered through real-project checks are resolved.
- The V3-to-V4 migration guide and V4 update policy are ready for review.
- Package contents and the official release workflow can be checked in advance.
- The export source commit can be fixed.

Do not set a fixed number of Alpha releases or a fixed deadline.

## Official Integration PR

### Preparation

Apply an immutable tag to the export source commit when Alpha is complete. Prepare a writable checkout of the official repository and record the source SHA before starting.

Use a single official PR with logical commits that are easy to review. Do not merge the remake's entire history.

Determine the exact commit breakdown after inspecting the official repository's existing structure. Use these units as a starting point:

1. V4 package and source.
2. V4 specifications and self-contained tests.
3. Developer documentation and migration guide.
4. Maintainer documentation and Decision Records.
5. Package metadata, CI, and release workflow.
6. Removal of V3-specific files and unnecessary compatibility assets.

### V3 Assets

Do not port V3 tests file by file. If important behavior lacks V4 coverage, define the V4 contract first, then write new tests.

Use V3 documents to check topic coverage and rewrite the content for V4. Omit V3-specific details and place only differences needed by developers in the migration guide.

## Beta Publication

Do not automatically publish official releases on pushes to `main`. Separate PR merging from npm publication and publish through a manually triggered GitHub Actions workflow.

Use this publication sequence:

1. Validate the version, dist-tag, and package contents on `main`.
2. Run the build and tests.
3. Publish with npm's `beta` dist-tag.
4. After npm publication succeeds, create a Git tag on the same commit.
5. Create a GitHub Release using the corresponding `CHANGELOG.md` entry.

Derive the dist-tag from `package.json.version` rather than entering it manually.

- `4.0.0-beta.*` uses `beta`.
- `4.0.0` without a prerelease suffix uses `latest`.
- Stop publication for version formats that have not been allowed.

On a repeated workflow run, do not republish a version already on npm. Allow the run to create only a missing tag or GitHub Release.

Prefer OIDC through npm Trusted Publishing for authentication. The official owner configures trust on npm, and GitHub Actions does not hold a long-lived publish token. Whether OIDC can be adopted remains a question for the official owner.

Document normal-release version rules, changelog handling, workflows, OIDC, failure recovery, and promotion from Beta to Stable in the official `docs/for-maintainers/`.

## Post-Publication Checks and Archiving

Do not archive this repository merely because the official PR has merged. Complete Beta publication and minimal installation verification first.

1. Merge the official PR.
2. Publish `4.0.0-beta.0` to npm.
3. Verify `npx togostanza@beta init` and the corresponding pnpm path.
4. Confirm that generated dependencies are pinned exactly to `4.0.0-beta.0`.
5. Check installation, builds, and representative outputs with npm and pnpm.
6. Update this repository's README to direct readers to the official repository and npm package.
7. Create a final archive tag in this repository.
8. Have this repository's owner enable GitHub's Archive setting.

After archiving, retain this repository as a read-only investigation and implementation record that official Decision Records can reference.

## Questions for the Official Owner

- Can npm Trusted Publishing with OIDC be adopted?
- Can the Alpha, Beta, and Stable promotion criteria be adopted as official operating standards?
- Who will merge the official PR and publish `4.0.0-beta.0`?

## Next Work

### Remaining Work for the Beta Transition

- [ ] Consider and implement JavaScript / TypeScript selection during `init`, with JavaScript as the default and TypeScript optional. Track generated content, persistence of the selection, and other details in the [follow-up](../../v4-migration/investigation/follow-ups.md#init時のjavascript--typescript選択).

This is a user-requested follow-up for the Beta transition. It is excluded from `alpha.1` implementation and tracked separately from the current feature-freeze scope. Detailed behavior and timing remain undecided; it is not added to the current Alpha completion conditions.

### Integration Preparation

1. Restructure the V4 specification as external contracts for the official release.
2. Restructure self-contained tests for transfer, using V4 contracts as their basis.
3. Prepare Alpha dependency generation and usage instructions.
4. Inventory the detailed official documentation structure and its source materials.
5. Proceed to quality checks and tag creation for `4.0.0-alpha.0`.
