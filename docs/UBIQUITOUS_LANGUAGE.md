# Ubiquitous Language for Ongoing Development

This glossary supports TogoStanza V4 documentation for developers and maintainers. English terms are paired with their Japanese equivalents. Definitions marked as unresolved remain unresolved; creating this glossary does not finalize them.

The [migration glossary](./v4-migration/UBIQUITOUS_LANGUAGE.md) retains the terminology used for V3 investigation, compatibility decisions, and comparative verification. In ongoing documentation, use V3, V4, or a specific release number instead of the migration-relative terms “current version” and “remake.”

## Roles

| Preferred term | Definition | Avoid | Existing names and Japanese equivalents | Status |
| --- | --- | --- | --- | --- |
| **maintainer** | A party responsible for upstream provision of TogoStanza itself, templates, or distributed stanzas. | Confusing this role with developer or user | 提供者, Stanza提供者, 提供側 | English mapping confirmed; upstream scope unresolved |
| **developer** | A person who creates stanzas with TogoStanza and handles their embedding, configuration, and data integration. | End user, viewer | 開発者, Stanza開発者, 埋め込み管理者 | Confirmed |
| **user** | An end user who uses an embedded stanza in a web browser. | Developer, embedding administrator | 利用者, Stanza利用者, 閲覧者 | Confirmed |

`docs/for-developers/` addresses developers. `docs/for-maintainers/` addresses maintainers of TogoStanza itself. This narrower documentation audience does not redefine the full scope of the maintainer role.

## Authoring and Distribution

| Preferred term | Definition | Avoid | Existing names and Japanese equivalents | Status |
| --- | --- | --- | --- | --- |
| **stanza** | An individual Web Component unit handled by TogoStanza. | Component or widget without context | Stanza, スタンザ | English spelling adopted; definition boundary unresolved |
| **stanza repository** | A repository or package containing one or more stanzas and their associated configuration. | Confusion with the TogoStanza source repository | stanza repo, stanza collection, stanzaリポジトリ, stanza集 | Definition and equivalence with “collection” unresolved |

Input layout, outputs, and API behavior are defined by the [current V4 specification](./v4-migration/spec/index.md). This glossary does not redefine those contracts.

## Relationships

- A **maintainer** provides infrastructure or distributions used by a **developer**.
- A **developer** creates a **stanza** and handles embedding it in a web page.
- A **user** interacts with a **stanza** embedded in a web page.
- A **stanza repository** is distinct from the TogoStanza source repository.

## Usage Examples

> **Writer:** “Are installation instructions for users?”
> **Reviewer:** “Instructions for creating stanzas are for developers.”
>
> **Writer:** “Are TogoStanza release instructions also for developers?”
> **Reviewer:** “They are for maintainers of TogoStanza itself.”
>
> **Writer:** “Do we call the person embedding a stanza a user?”
> **Reviewer:** “Embedding is a developer task. The user interacts with the embedded stanza in the browser.”

## Ambiguities and Open Questions

- “Developer” can also mean a contributor to TogoStanza itself. In documentation audience labels, use developer for stanza authors and maintainer for those developing and maintaining TogoStanza itself.
- “User documentation” can mean either developer instructions or end-user guidance. Name the intended role explicitly.
- The scope of maintainer, the definition of stanza, and the relationship between stanza repository and stanza collection are inherited questions. Confirm them with the project owner before finalizing public definitions.
- Preserve the distinction between fixture, case input, and observed contract in the [migration glossary](./v4-migration/UBIQUITOUS_LANGUAGE.md). Terminology for the formal release's self-contained tests will be addressed during test restructuring.
