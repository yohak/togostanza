# V4 Alpha Release Checklist

This checklist covers checks before and after releasing a V4 Alpha from `yohak/togostanza` for internal preview.

Alpha releases are not published to the npm registry. Align source, built `dist/`, package version, and Git tag on the same commit, and distribute through an immutable tag.

## Release Unit

The first Alpha uses:

```text
package version: 4.0.0-alpha.0
Git tag: v4.0.0-alpha.0
dependency spec: github:yohak/togostanza#v4.0.0-alpha.0
```

Do not reuse published versions or tags. For fixes, increment the version, for example to `4.0.0-alpha.1`.

## Before Publication

- [ ] Only changes permitted after the feature freeze are included.
- [ ] `package.json.version` matches the planned release tag.
- [ ] `package.json.private` remains `true`; npm publication has not been enabled.
- [ ] The entry for the target version in `CHANGELOG.md` is updated.
- [ ] The version and commands in the [Alpha installation instructions](../../../README.md#try-the-alpha) are consistent.
- [ ] `init` rejects installation without a concrete dependency spec.
- [ ] `TOGOSTANZA_DEPENDENCY_SPEC` can pin the generated repository's `devDependencies.togostanza` to the same Alpha tag.
- [ ] No `packageManager` field is added to the generated repository.
- [ ] The Node.js requirement is `>=24.0.0`.

Run the standard checks:

```sh
mise exec -- pnpm run check:alpha
git diff --check
```

Also run the real-project checks in this repository. Passing these checks alone does not satisfy Alpha completion conditions.

```sh
mise exec -- pnpm run test:compat:local
```

## Release Commit

The Alpha tag must include built `dist/`. Build in the same worktree as the source and include the output in the release commit.

```sh
mise exec -- pnpm run build
git add package.json CHANGELOG.md README.md docs src
git add -f dist
git status --short
git diff --cached --check
```

Review the actual changes and adjust the staging targets. Do not include existing uncommitted changes indiscriminately.

After creating the release commit, check the tag and commit contents:

```sh
ALPHA_VERSION=4.0.0-alpha.0
ALPHA_TAG=v${ALPHA_VERSION}

git status --short
git show HEAD:package.json
git ls-tree -r --name-only HEAD -- bin dist package.json
git tag --list ${ALPHA_TAG}
git ls-remote --tags yohak-github ${ALPHA_TAG}
```

Confirm that the worktree is clean, `bin/`, `dist/`, and `package.json` are included in the release commit, and the tag does not already exist locally or remotely.

## Create and Publish the Tag

Create and push the tag after a human has reviewed the release commit.

```sh
git tag -a ${ALPHA_TAG} -m "TogoStanza ${ALPHA_VERSION}"
git push yohak-github ${ALPHA_TAG}
```

If also updating a publication branch, review the target branch and push contents separately. The tag alone can start the internal preview; updating the default branch is not a prerequisite for Alpha distribution.

## After Publication

Generate a new stanza repository from the published tag with both npm and pnpm. Use the commands in the [new-project installation instructions](../../../README.md#try-in-a-new-project) unchanged.

Check the following:

- [ ] `togostanza --version` displays the target Alpha version.
- [ ] The generated repository's `devDependencies.togostanza` is pinned to the target tag.
- [ ] The lockfile pins the published tag's commit.
- [ ] Representative `generate stanza`, `build`, and `serve` workflows work.
- [ ] GitHub Pages workflows can be generated for both npm and pnpm.

Record the tag, commit SHA, Node.js and package manager versions, commands, and results.

## Difference from Alpha Completion

Completing this checklist means an Alpha can be provided for internal preview. Completing the entire Alpha phase also requires confirmation from the owners of `metastanza` and TogoMedium Stanza.

Follow the [Official Integration Plan](./official-integration-plan.md) for Alpha completion conditions and the transition to the official Beta.
