# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — domain glossary, canonical ports, crate map, frontend deep modules.
- **`UBIQUITOUS_LANGUAGE.md`** at the repo root — a complementary domain-language glossary. Read it alongside `CONTEXT.md` when a term's definition matters.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Layout: single-context

```
/
├── CONTEXT.md
├── UBIQUITOUS_LANGUAGE.md
├── docs/adr/
│   ├── 0001-...
│   └── ...
└── backend/, frontend/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md` / `UBIQUITOUS_LANGUAGE.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0008 (permission and role model) — but worth reopening because…_
