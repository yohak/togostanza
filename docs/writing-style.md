# Writing Documentation for Ongoing Development

This document guides new TogoStanza V4 documentation for developers and maintainers. It supports the current work on context, structure, and content; detailed editorial polishing comes later.

Use the [ongoing glossary](./UBIQUITOUS_LANGUAGE.md) for terminology. For migration documents, also consult the [migration writing style](./v4-migration/writing-style.md).

## Audience and Purpose

- Developer documentation covers stanza creation, configuration, building, publication, and embedding. It should be understandable without first reading migration phases or investigation records.
- Maintainer documentation covers development, quality checks, maintenance, and releases of TogoStanza itself.
- V3 observations, compatibility decisions, and migration work records remain in `v4-migration/`. Instructions for developers moving their own projects from V3 belong in developer documentation.

## Sources of Truth

The current V4 specification remains [v4-migration/spec/index.md](./v4-migration/spec/index.md) until the documentation handoff is complete. Writing English documents does not switch the specification's source of truth.

Keep external contracts, internal invariants, and decision rationale distinct. Link to authoritative specifications instead of duplicating them. Examples and observed implementation behavior do not establish new contracts.

## Instructions and Examples

README and guide examples use JavaScript as the starting point, with TypeScript supplements where needed. Do not require TypeScript configuration for ordinary JavaScript use.

- State the working directory, prerequisites, command, and expected result for a procedure.
- Match configuration and API examples to the documented version.
- Distinguish published functionality from changes prepared for the next release. A package version change alone does not establish that a release is available.
- In migration guidance, explain when a change is necessary and how to make it.

## Terminology and Presentation

Use the glossary's role names and concept boundaries. Keep commands, file names, package names, APIs, attributes, and configuration keys unchanged and format them as code.

Identify versions and paths explicitly. Avoid relying on “current” or “new” to identify a release. Use consistent terms within each document. In Japanese text retained or updated locally, prefer natural Japanese or established loanwords while preserving technical identifiers.

## Preparation Sequence

Follow the official integration plan: organize external contracts, restructure self-contained tests around them, prepare package and generated dependencies, then complete formal-release documentation. Terminology, audience definitions, inventories, and outlines can be prepared now. Full manuals and editorial polishing follow the contract and verification work.
