# Onboarding

## Local development URLs

The frontend uses subdomains for tenants, profiles, login, and admin.
Local development relies on `lvh.me` wildcard DNS pointing to `127.0.0.1`.

Useful local URLs (assuming the default `VITE_APP_DOMAIN=lvh.me` and `KLYNT_FRONTEND_PORT=5174`):

- `http://lvh.me:5174/` — marketing home
- `http://login.lvh.me:5174/` — login
- `http://admin.lvh.me:5174/` — admin dashboard
- `http://acme.lvh.me:5174/` — tenant desktop (replace `acme` with a real slug)
- `http://u.jayden.lvh.me:5174/` — public profile (replace `jayden` with a real username)
