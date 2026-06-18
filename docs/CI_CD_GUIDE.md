# CI/CD Guide

## Workflows

- `ci.yml` — format, lint, test, build on `dev`/`main` and PRs
- `audit.yml` — weekly dependency audit
- `deploy-staging.yml` — placeholder for `dev` deployments
- `deploy-production.yml` — placeholder for `main` deployments

## Branch Protection

- `dev`: require PR + 1 approval + CI status
- `main`: require PR + 2 approvals + CI status + up-to-date branch

## Path Filtering

CI skips backend checks if only frontend files changed, and vice versa.
