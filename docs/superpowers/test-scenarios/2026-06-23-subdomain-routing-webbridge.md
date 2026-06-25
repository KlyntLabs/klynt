# Subdomain Routing — WebBridge Test Scenarios

Date: 2026-06-23

## Preconditions

- Backend running on `http://localhost:3001`.
- Frontend dev server running on `http://lvh.me:5174`.
- `VITE_APP_DOMAIN=lvh.me` and `VITE_APP_PROTOCOL=http`.
- A registered user exists (e.g., `jayden`).
- A tenant exists (e.g., `acme`).

## Scenarios

### 1. Unauthenticated tenant deep link → login subdomain with `?from=`

1. Ensure you are logged out (clear cookies / local storage).
2. Navigate to `http://acme.lvh.me:5174/members`.
3. **Expected:** browser lands on `http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers`.

### 2. Login → return to tenant deep link

1. Start from the login URL produced in scenario 1.
2. Enter valid credentials and submit.
3. **Expected:** browser returns to `http://acme.lvh.me:5174/members` and the tenant desktop loads.

### 3. Public profile subdomain renders

1. Navigate to `http://u.jayden.lvh.me:5174/`.
2. **Expected:** the public profile page loads, showing the username.
3. If logged in as `jayden`, it should indicate "This is your public profile."

### 4. Non-admin admin subdomain → apex home

1. Log in as a non-admin user (e.g., `student`).
2. Navigate to `http://admin.lvh.me:5174/`.
3. **Expected:** browser is redirected to `http://lvh.me:5174/`.

### 5. Apex tenant path → tenant subdomain

1. Navigate to `http://lvh.me:5174/tenants/acme/members`.
2. **Expected:** browser is redirected to `http://acme.lvh.me:5174/members`.

### 6. Apex `/:username` → profile subdomain

1. Navigate to `http://lvh.me:5174/jayden`.
2. **Expected:** browser is redirected to `http://u.jayden.lvh.me:5174/`.

### 7. Authenticated login subdomain → apex dashboard

1. Log in as any user.
2. Navigate to `http://login.lvh.me:5174/`.
3. **Expected:** browser is redirected to `http://lvh.me:5174/dashboard`.
