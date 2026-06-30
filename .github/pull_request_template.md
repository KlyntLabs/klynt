## Summary

## Changes

## CI Checklist
- [ ] `just check` and `just test-coverage` pass locally
- [ ] CI is green on this PR before merge (deploys are gated on `ci.yml` success)

## Security Checklist
- [ ] No secrets or credentials added (verified by `gitleaks`)
- [ ] New dependencies reviewed
- [ ] New environment variables documented in `.env.example`
- [ ] Input validation added for new endpoints/forms
- [ ] No new HIGH/CRITICAL SAST findings introduced
