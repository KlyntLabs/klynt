#!/usr/bin/env python3
"""Seed the local Klynt environment for the Virtual Desktop end-to-end plan."""

import json
import subprocess
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3001"
API = f"{BASE}/api/v1"

ADMIN_EMAIL = "test@klynt.dev"
MEMBER_EMAIL = "member@klynt.dev"
PASSWORD = "TestPass123!"
TENANT_SLUG = "acme-test"


def request(method, path, body=None, headers=None):
    url = f"{API}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
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


def register_and_activate(email):
    username = email.split("@")[0]
    status, body = request("POST", "/auth/register", {
        "email": email,
        "username": username,
        "password": PASSWORD,
        "full_name": username,
        "role": "student",
    })
    if status not in (201, 409):
        print(f"Unexpected register status for {email}: {status} {body}")
        sys.exit(1)
    activate_user(email)
    status, body = request("POST", "/auth/login", {
        "email": email,
        "password": PASSWORD,
    })
    if status != 200:
        print(f"Login failed for {email}: {status} {body}")
        sys.exit(1)
    token = body.get("data", {}).get("access_token")
    return token


def main():
    print("Seeding Virtual Desktop end-to-end data...")

    admin_token = register_and_activate(ADMIN_EMAIL)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create tenant (idempotent: ignore ownership limit if already present)
    status, body = request("POST", "/tenants", {"slug": TENANT_SLUG, "name": "Acme Test"}, admin_headers)
    if status == 200:
        print(f"Created tenant {TENANT_SLUG}")
    elif status == 409:
        print(f"Tenant {TENANT_SLUG} already exists")
    elif status == 403 and body.get("code") == "TENANT_LIMIT_REACHED":
        print(f"Tenant {TENANT_SLUG} likely already exists (ownership limit reached)")
    else:
        print(f"Failed to create tenant: {status} {body}")
        sys.exit(1)

    # Invite and accept a member user
    member_token = register_and_activate(MEMBER_EMAIL)
    status, body = request("POST", f"/tenants/{TENANT_SLUG}/invites", {
        "email": MEMBER_EMAIL,
        "role": "member",
    }, admin_headers)
    if status not in (200, 201):
        print(f"Failed to create invite: {status} {body}")
        sys.exit(1)
    invite_token = body.get("data", {}).get("token")
    if not invite_token:
        print(f"Invite response missing token: {body}")
        sys.exit(1)

    member_headers = {"Authorization": f"Bearer {member_token}"}
    status, body = request("POST", f"/tenants/invites/{invite_token}/accept", headers=member_headers)
    if status == 200:
        print(f"Added {MEMBER_EMAIL} as member of {TENANT_SLUG}")
    elif status == 409:
        print(f"{MEMBER_EMAIL} is already a member of {TENANT_SLUG}")
    else:
        print(f"Failed to accept invite: {status} {body}")
        sys.exit(1)

    # Ensure shared layout exists with an empty icon tree
    layout = {
        "version": 1,
        "background_preset_id": "default",
        "icon_tree": [],
        "windows": [],
    }
    status, body = request("GET", f"/tenants/{TENANT_SLUG}/desktop-layout", headers=admin_headers)
    current_etag = body.get("data", {}).get("etag", "") if status == 200 else ""
    status, body = request("PUT", f"/tenants/{TENANT_SLUG}/desktop-layout", {**layout, "etag": current_etag}, admin_headers)
    if status not in (200, 201):
        print(f"Failed to seed shared layout: {status} {body}")
        sys.exit(1)
    print(f"Seeded empty shared layout for {TENANT_SLUG}")

    print("Seed complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
