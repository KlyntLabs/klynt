# ADR-006: Use Biome for Frontend Linting and Formatting

## Status
Accepted

## Date
2026-06-18

## Context
The frontend initially used ESLint 9 + Prettier for linting and formatting. After upgrading to the latest stable versions, we re-evaluated the tooling to reduce configuration complexity and improve speed.

## Decision
Use Biome as the single tool for frontend linting and formatting.

## Alternatives Considered

### ESLint 10 + Prettier
- Pros: Large ecosystem, type-aware lint rules, widely adopted
- Cons: Multiple tools and configs, slower, more dependencies
- Rejected: Biome provides sufficient linting and formatting with one fast tool and one config

### Oxlint
- Pros: Very fast
- Cons: Formatter not as mature, smaller rule set than Biome
- Rejected: Biome covers both linting and formatting in one toolchain

## Consequences
- One `biome.json` config for both linting and formatting
- Faster pre-commit checks
- Fewer dependencies
- Some advanced ESLint rules are not available; add them back only if needed
