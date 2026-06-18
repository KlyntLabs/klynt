# ADR-003: Use a Root-Level Monorepo

## Status
Accepted

## Date
2026-06-18

## Context
We need a repository structure that supports backend and frontend development with clear separation and easy onboarding.

## Decision
Use a root-level monorepo with `backend/`, `frontend/`, `docs/`, `.github/`, and shared DX files at the root.

## Alternatives Considered

### Separate repositories
- Pros: Independent versioning, smaller repos
- Cons: Cross-repo coordination, harder to keep contracts in sync
- Rejected: A single repo improves coordination for a small team

### `apps/` or `crates/` workspace structure
- Pros: Scalable for many apps/packages
- Cons: Adds indirection for two apps, complicates native tooling paths
- Rejected: Root-level `backend/` and `frontend/` are simpler and conventional for Cargo/npm

## Consequences
- Simple onboarding: `just setup` and `just dev`
- Native tooling works without extra configuration
- Can evolve into a workspace structure when a third app/package is needed
