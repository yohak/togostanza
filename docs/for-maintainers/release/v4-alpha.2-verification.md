# V4 Alpha.2 Release Verification

Release target: `4.0.0-alpha.2`, distributed through the immutable `v4.0.0-alpha.2` tag in `yohak/togostanza`. The package remains private and is not published to npm.

## Scope and Environment

The release includes the parameter compatibility fix (`3957200`) and its migration guidance (`5ffd513`). Missing and empty converted values and getter timing follow V3; the public `Record<string, unknown>` type and V4 render-error reporting remain in place. No new feature or compatibility policy is introduced by the version update.

Verification date: 2026-09-18. Local environment: Node.js `24.5.0`, npm `11.5.1`, pnpm `11.8.0`. Commands run through `mise exec -- ...` from the repository root unless stated otherwise.

Before preparation, local and remote tags contained `v4.0.0-alpha.0` and `v4.0.0-alpha.1`; `v4.0.0-alpha.2` did not exist. No published tag was changed.

## Before Publication

The standard release checks are:

```sh
mise exec -- pnpm run check:alpha
mise exec -- pnpm run test:compat:local
git diff --check
```

The V3 parameter comparison additionally requires the case 004 input to be rebuilt through its installed V3 CLI, as documented in the [case README](../../../workbench/cases/004-runtime-parameters/README.md). That input was rebuilt before these checks.

Results before publication:

| Check | Result |
| --- | --- |
| `check:alpha` | Passed: formatting, lint, type checking, build, 124 unit tests, 23 integration tests, and 12 browser tests. Two local compatibility unit tests are skipped in the standard suite. |
| Tarball distribution smoke | Passed for npm and pnpm with `togostanza@4.0.0-alpha.2`. |
| Local Git dependency smoke | Passed for npm and pnpm with a temporary `v4.0.0-alpha.2-local-smoke` ref. This verifies a local release fixture, not publication to GitHub. |
| `test:compat:local` | Passed: 3 selected unit tests and 6 browser tests, including V3 parameter comparison, all configured metastanza and TogoMedium stanzas, a TogoMedium Web route, Emotion, and `togostanza-utils`. |
| CLI version | `mise exec -- node ./bin/togostanza.mjs --version` returned `togostanza@4.0.0-alpha.2`. |
| `git diff --check` | Passed. |

The existing Sass `@import` deprecation warning remains in the real-project input. It did not fail the checks. The build regenerated `dist/` without changing its tracked contents; the version is read from the root package metadata.

Publication is pending review of the release commit by the project owner, as required by the [Alpha release checklist](./v4-alpha-release-checklist.md#create-and-publish-the-tag). Test success does not mean that the tag has been published or that the Alpha phase is complete.

## After Publication

Resolve the remote annotated tag and its peeled commit, and compare the commit with the approved release commit:

```sh
git ls-remote --tags yohak-github 'v4.0.0-alpha.2*'
```

In separate empty directories, run both sets of [README new-project commands](../../../README.md#try-in-a-new-project), targeting `v4.0.0-alpha.2`. Use the normal npm and pnpm stores and caches. For each generated repository, record:

1. `togostanza --version`: `4.0.0-alpha.2`.
2. `devDependencies.togostanza`: `github:yohak/togostanza#v4.0.0-alpha.2`; no generated `packageManager` field.
3. The lockfile's resolved commit: the peeled commit of the published tag.
4. `generate stanza hello` and `build`: successful.
5. `serve`: the `hello.html` preview displays `Hello, world!` and changing `say-to` updates the greeting. Stop the server after checking.
6. `.github/workflows/publish.yml`: generated with the selected package manager's install/build commands.

Keep the tag SHA, release commit SHA, tool versions, command results, and any failure details in the publication record. Do not move or reuse a tag if a post-publication defect is found; prepare a new Alpha version.
