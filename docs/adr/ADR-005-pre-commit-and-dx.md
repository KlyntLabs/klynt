# ADR-005: Use `just` and Lefthook for Developer Experience

## Status
Accepted

## Date
2026-06-18

## Context
We want excellent local developer experience with consistent formatting, linting, and pre-commit checks.

## Decision
Use `just` as the task runner and Lefthook for Git hooks.

## Alternatives Considered

### Make
- Pros: Ubiquitous
- Cons: Cross-platform issues, harder syntax
- Rejected: `just` is simpler and self-documenting

### Husky + lint-staged
- Pros: Familiar to JS teams
- Cons: Requires Node for hooks, slower sequential execution
- Rejected: Lefthook is faster, parallel, and supports both Rust and TypeScript in one config

## Consequences
- New contributors install `just` and `lefthook` once
- Fast, parallel pre-commit checks
- Pre-push checks catch logic and type errors before CI
