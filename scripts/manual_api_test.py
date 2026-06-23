#!/usr/bin/env python3
"""Manual end-to-end API test suite against the Dockerized Klynt backend."""

import json
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "http://127.0.0.1:3001"
API = f"{BASE}/api/v1"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


def now():
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")


def request(method, path, body=None, headers=None):
    url = f"{API}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw}


def psql(query):
    cmd = [
        "docker", "compose", "-f", "docker-compose.yml",
        "exec", "-T", "postgres",
        "psql", "-U", "klynt", "-d", "klynt", "-t", "-A", "-c", query,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def activate_user(email):
    psql(f"UPDATE users SET status='active' WHERE email='{email}'")


def assert_status(desc, status, expected):
    if status == expected:
        print(f"  {PASS} {desc} ({status})")
        return True
    print(f"  {FAIL} {desc}: expected {expected}, got {status}")
    return False


def assert_field(desc, data, key, expected):
    actual = data.get(key) if isinstance(data, dict) else None
    if actual == expected:
        print(f"  {PASS} {desc} ({key}={expected})")
        return True
    print(f"  {FAIL} {desc}: expected {key}={expected}, got {actual}")
    return False


def main():
    all_ok = True
    print(f"[{now()}] Starting manual API tests against {API}\n")

    # ------------------------------------------------------------------
    # Health checks (mounted at root, not under /api/v1)
    # ------------------------------------------------------------------
    print("Scenario 1: Health endpoints")
    try:
        with urllib.request.urlopen(f"{BASE}/health/live", timeout=10) as resp:
            status = resp.status
    except urllib.error.HTTPError as e:
        status = e.code
    all_ok &= assert_status("/health/live", status, 200)

    try:
        with urllib.request.urlopen(f"{BASE}/health/ready", timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
            body = json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        status = e.code
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw}
    all_ok &= assert_status("/health/ready", status, 200)
    if isinstance(body, dict) and body.get("healthy"):
        print(f"  {PASS} readiness reports healthy")
    else:
        print(f"  {FAIL} readiness body: {body}")
        all_ok = False

    # ------------------------------------------------------------------
    # Auth: registration validation
    # ------------------------------------------------------------------
    print("\nScenario 2: Registration input validation")
    suffix = now()
    user_a_email = f"user_a_{suffix}@example.com"
    user_b_email = f"user_b_{suffix}@example.com"
    password = "TestPass123!"

    status, body = request("POST", "/auth/register", {
        "email": f"bad_{suffix}@example.com",
        "password": "short",
        "full_name": "Bad",
        "role": "student",
    })
    all_ok &= assert_status("short password rejected", status, 400)

    status, body = request("POST", "/auth/register", {
        "email": user_a_email,
        "password": password,
        "full_name": "User A",
        "role": "student",
    })
    all_ok &= assert_status("register user A", status, 201)

    # ------------------------------------------------------------------
    # Login before activation should fail
    # ------------------------------------------------------------------
    print("\nScenario 3: Login before email verification")
    status, body = request("POST", "/auth/login", {
        "email": user_a_email,
        "password": password,
    })
    all_ok &= assert_status("login before activation rejected", status, 401)

    # Activate user A directly in the database (dev/testing helper)
    print("\nScenario 4: Activate user A via DB and login")
    activate_user(user_a_email)
    status, body = request("POST", "/auth/login", {
        "email": user_a_email,
        "password": password,
    })
    all_ok &= assert_status("login user A", status, 200)
    token_a = body.get("data", {}).get("access_token")
    if token_a:
        print(f"  {PASS} received access token")
    else:
        print(f"  {FAIL} missing access_token in login response: {body}")
        all_ok = False

    headers_a = {"Authorization": f"Bearer {token_a}"}

    # ------------------------------------------------------------------
    # Current user profile
    # ------------------------------------------------------------------
    print("\nScenario 5: Current user profile")
    status, body = request("GET", "/users/me", headers=headers_a)
    all_ok &= assert_status("GET /users/me", status, 200)
    all_ok &= assert_field("profile email", body.get("data", {}), "email", user_a_email)

    status, body = request("PATCH", "/users/me", {"full_name": "User A Updated"}, headers=headers_a)
    all_ok &= assert_status("PATCH /users/me", status, 200)
    all_ok &= assert_field("updated full name", body.get("data", {}), "full_name", "User A Updated")

    # ------------------------------------------------------------------
    # Change password
    # ------------------------------------------------------------------
    print("\nScenario 6: Change password")
    new_password = "NewPass456!"
    status, body = request("POST", "/users/me/password", {
        "current_password": password,
        "new_password": new_password,
    }, headers=headers_a)
    all_ok &= assert_status("change password", status, 200)

    status, body = request("POST", "/auth/login", {
        "email": user_a_email,
        "password": new_password,
    })
    all_ok &= assert_status("login with new password", status, 200)
    token_a = body.get("data", {}).get("access_token")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # ------------------------------------------------------------------
    # Tenant lifecycle and ownership limit
    # ------------------------------------------------------------------
    print("\nScenario 7: Tenant lifecycle")
    slug_alpha = f"alpha-{suffix}"
    slug_beta = f"beta-{suffix}"
    slug_gamma = f"gamma-{suffix}"

    status, body = request("POST", "/tenants", {"slug": slug_alpha, "name": "Alpha Team"}, headers=headers_a)
    all_ok &= assert_status("create tenant alpha", status, 200)

    status, body = request("GET", "/tenants", headers=headers_a)
    all_ok &= assert_status("list my tenants", status, 200)
    tenants = body.get("data", [])
    if len(tenants) == 1 and tenants[0].get("slug") == slug_alpha:
        print(f"  {PASS} listed 1 tenant with expected slug")
    else:
        print(f"  {FAIL} expected 1 tenant with slug {slug_alpha}, got: {tenants}")
        all_ok = False

    status, body = request("GET", f"/tenants/{slug_alpha}", headers=headers_a)
    all_ok &= assert_status("get tenant alpha", status, 200)

    status, body = request("PATCH", f"/tenants/{slug_alpha}", {"name": "Alpha Team Renamed"}, headers=headers_a)
    all_ok &= assert_status("update tenant alpha", status, 200)
    all_ok &= assert_field("tenant name updated", body.get("data", {}), "name", "Alpha Team Renamed")

    status, body = request("POST", "/tenants", {"slug": slug_beta, "name": "Beta Team"}, headers=headers_a)
    all_ok &= assert_status("create tenant beta", status, 200)

    status, body = request("POST", "/tenants", {"slug": slug_gamma, "name": "Gamma Team"}, headers=headers_a)
    all_ok &= assert_status("third tenant blocked by ownership limit", status, 403)
    if isinstance(body, dict) and body.get("code") == "TENANT_LIMIT_REACHED":
        print(f"  {PASS} error code TENANT_LIMIT_REACHED")
    else:
        print(f"  {FAIL} expected TENANT_LIMIT_REACHED, got: {body}")
        all_ok = False

    # ------------------------------------------------------------------
    # Cross-tenant access control
    # ------------------------------------------------------------------
    print("\nScenario 8: Cross-tenant isolation")
    status, body = request("POST", "/auth/register", {
        "email": user_b_email,
        "password": password,
        "full_name": "User B",
        "role": "student",
    })
    all_ok &= assert_status("register user B", status, 201)
    activate_user(user_b_email)

    status, body = request("POST", "/auth/login", {
        "email": user_b_email,
        "password": password,
    })
    all_ok &= assert_status("login user B", status, 200)
    token_b = body.get("data", {}).get("access_token")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    status, body = request("GET", f"/tenants/{slug_alpha}", headers=headers_b)
    all_ok &= assert_status("non-member cannot access tenant alpha", status, 403)

    status, body = request("GET", "/tenants", headers=headers_b)
    all_ok &= assert_status("user B tenant list", status, 200)
    if len(body.get("data", [])) == 0:
        print(f"  {PASS} user B sees no tenants")
    else:
        print(f"  {FAIL} user B should see no tenants, got: {body}")
        all_ok = False

    # ------------------------------------------------------------------
    # Password reset enumeration protection
    # ------------------------------------------------------------------
    print("\nScenario 9: Password reset enumeration protection")
    status, body = request("POST", "/auth/request-password-reset", {"email": user_a_email})
    all_ok &= assert_status("request password reset existing", status, 200)
    status, body = request("POST", "/auth/request-password-reset", {"email": f"unknown_{suffix}@example.com"})
    all_ok &= assert_status("request password reset unknown", status, 200)

    # ------------------------------------------------------------------
    # Logout and token invalidation
    # ------------------------------------------------------------------
    print("\nScenario 10: Logout")
    status, body = request("POST", "/auth/logout", {"session_token": token_a}, headers=headers_a)
    all_ok &= assert_status("logout user A", status, 200)

    status, body = request("GET", "/users/me", headers=headers_a)
    all_ok &= assert_status("protected route rejects revoked token", status, 401)

    # ------------------------------------------------------------------
    # Metrics endpoint
    # ------------------------------------------------------------------
    print("\nScenario 11: Metrics endpoint")
    url = f"{BASE}/metrics"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        status = e.code
    all_ok &= assert_status("GET /metrics", status, 200)
    if "http_requests_total" in raw:
        print(f"  {PASS} metrics contain http_requests_total")
    else:
        print(f"  {FAIL} metrics missing expected counters")
        all_ok = False

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    if all_ok:
        print(f"{PASS} All manual API scenarios passed.")
        return 0
    print(f"{FAIL} One or more manual API scenarios failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
