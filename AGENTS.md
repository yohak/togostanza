# Agent Instructions

Within this repository, read this file for every task. Read other documents only as needed for the task, focusing on relevant sections rather than entire document sets. Reading requirements from applicable instructions outside this repository still apply.

## Working Rules

- Confirm the requested purpose and target files, and check existing changes with `git status --short`.
- Do not revert existing uncommitted changes without authorization.
- Do not edit based solely on a question, consultation, or review request.
- Consult the user before changing the meaning of a specification or policy.
- Before expanding compatibility scope, check evidence from the existing implementation, real projects, and verification cases.
- Do not finalize unresolved matters without authorization; retain them as a follow-up or open question.

## Language

- Respond in the language used by the user.
- Write documents under `docs/v4-migration/` in Japanese, including both existing and newly created documents. This preserves continuity with the V4 migration work, which has been conducted in Japanese.
- Write documents outside `docs/v4-migration/` in English, including README and AGENTS files.
- Transition existing documents outside `docs/v4-migration/` to English incrementally. Small updates do not require translating the entire document; use English when creating or fully rewriting one.
- Preserve quotations in their original language. Keep API names, commands, paths, proper names, and Japanese glossary equivalents where needed.
- Keep language selection policy in this file; writing-style documents cover structure, terminology, and presentation.

## Documentation Map

Guidance for stanza authors belongs in `docs/for-developers/`; documentation for developing and maintaining TogoStanza itself belongs in `docs/for-maintainers/`. Use the following map to find the relevant material.

| Task | Read as needed |
| --- | --- |
| Find documentation | [Documentation index](docs/README.md), then the [developer](docs/for-developers/README.md) or [maintainer](docs/for-maintainers/README.md) entry point |
| Write or edit ongoing-development documentation | [Glossary](docs/UBIQUITOUS_LANGUAGE.md) and [writing guide](docs/writing-style.md) |
| Write or edit migration documentation or comparative verification records | [Migration glossary](docs/v4-migration/UBIQUITOUS_LANGUAGE.md) and [migration writing style](docs/v4-migration/writing-style.md) |
| Implement or fix TogoStanza itself | Relevant [specification](docs/v4-migration/spec/index.md) sections and [quality checks](docs/v4-migration/setup/quality.md) |
| Decide specification or compatibility policy | [Project charter](docs/v4-migration/project-charter.md) and relevant entries in [remake policy](docs/v4-migration/spec/remake-policy.md), [follow-ups](docs/v4-migration/investigation/follow-ups.md), or [open questions](docs/v4-migration/investigation/open-questions.md) |
| Investigate or compare migration behavior | [Investigation entry point](docs/v4-migration/investigation/README.md) and the relevant `workbench/cases/*/README.md` |
| Change development environment or package layout | [Package layout](docs/v4-migration/setup/package-layout.md) and [setup](docs/v4-migration/setup/index.md) |
| Prepare integration or publication | [Official integration plan](docs/for-maintainers/release/official-integration-plan.md) and [Alpha release checklist](docs/for-maintainers/release/v4-alpha-release-checklist.md) |

## Development and Validation

- Treat the remake package as a single Node package at the repository root.
- Use the root `package.json` and `mise.toml` as authoritative, and run Node.js / pnpm commands through `mise exec -- ...`.
- For quality checks and browser tests, prioritize approved normal execution in the user's local environment over a sandbox execution environment such as Codex's.
- `docs/`, `references/`, and `workbench/` are not Node workspaces and are not included in the normal scope of quality-check scripts.
- Treat `references/` as reference material, `workbench/` as the verification area, and `sandbox/` as the temporary verification area.
- When changing a specification, also check the corresponding verification case's `README.md`.
- For documentation updates, run at least `git diff --check`.

## V4 Migration Constraints

- Keep `docs/v4-migration/spec/index.md` as the source of truth for the remake specification until documentation organization and handoff are complete.
- Record observed facts in `docs/v4-migration/investigation/`, adoption decisions in `docs/v4-migration/spec/remake-policy.md`, and unresolved matters in `docs/v4-migration/investigation/follow-ups.md` or `docs/v4-migration/investigation/open-questions.md` as appropriate.
- Apply the migration glossary and writing style to `docs/v4-migration/` and comparative verification, including the authoritative specification while it remains there. Apply the ongoing-development glossary and writing guide to ongoing-development documentation.
