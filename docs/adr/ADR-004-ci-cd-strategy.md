# ADR-004: GitHub Actions with Branch-Specific Workflows

## Status
Accepted

## Date
2026-06-18

## Context
We need CI/CD that is fast, clear, and runs only on the branches that matter.

## Decision
Use GitHub Actions. Run core checks on `dev` and `main` pushes and pull requests. Use path filtering to skip unnecessary checks. Add placeholder deployment workflows for `dev` and `main`.

## Alternatives Considered

### Run checks on every branch
- Pros: Catch issues early
- Cons: Wastes CI minutes on short-lived feature branches
- Rejected: Checks run on PRs to `dev`/`main`, which is sufficient

### Single monolithic workflow
- Pros: Simpler file
- Cons: Harder to read failure reports, slower due to sequential jobs
- Rejected: Separate jobs improve clarity and allow parallel execution

## Consequences
- Fast feedback via path filtering and caching
- Clear failure reporting per stack
- Branch protection rules depend on a single aggregate `CI status` job
