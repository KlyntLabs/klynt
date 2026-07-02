#!/usr/bin/env python3
"""Run Phase B API checks for the Virtual Desktop end-to-end plan."""

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3001"
API = f"{BASE}/api/v1"

ADMIN_EMAIL = "test@klynt.dev"
MEMBER_EMAIL = "member@klynt.dev"
PASSWORD = "TestPass123!"
TENANT_SLUG = "acme-test"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

results = []


def request(method, path, body=None, headers=None):
    url = f"{API}{path}" if path.startswith("/") else f"{BASE}/{path}"
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


def check(desc, ok):
    results.append((desc, ok))
    print(f"  {PASS if ok else FAIL} {desc}")


def login(email):
    status, body = request("POST", "/auth/login", {"email": email, "password": PASSWORD})
    if status != 200:
        print(f"  {FAIL} login {email}: {status} {body}")
        sys.exit(1)
    return body["data"]["access_token"]


def main():
    print(f"Phase B — API verification against {API}\n")

    admin_token = login(ADMIN_EMAIL)
    member_token = login(MEMBER_EMAIL)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # Health (mounted at the gateway root, not under /api/v1)
    print("Health endpoints")
    status, _ = request("GET", "health/live")
    check("GET /health/live returns 200", status == 200)
    status, body = request("GET", "health/ready")
    check("GET /health/ready returns 200", status == 200 and body.get("healthy") is True)

    # Clean slate
    status, bundle = request("GET", f"/tenants/{TENANT_SLUG}/desktop", headers=admin_headers)
    for app in bundle.get("data", {}).get("apps", []):
        request("DELETE", f"/tenants/{TENANT_SLUG}/apps/{app['id']}", headers=admin_headers)

    # Auth
    print("\nAuthentication")
    check("admin login returns token", bool(admin_token))

    # App CRUD
    print("\nApp CRUD")

    def create_app(app_type, title, content=None):
        body = {"type": app_type, "title": title}
        if content is not None:
            body["content"] = content
        return request("POST", f"/tenants/{TENANT_SLUG}/desktop/apps", body, admin_headers)

    status, folder = create_app("folder", "Test Folder")
    check("create folder app returns 201", status == 201)

    status, markdown = create_app("markdown", "Test Markdown", {"markdown": "# Hello"})
    check("create markdown app returns 201", status == 201)

    status, notes = create_app("notes", "Test Notes", {"text": "hello"})
    check("create notes app returns 201", status == 201)

    status, video = create_app("video", "Test Video", {"src": "https://example.com/video.mp4"})
    check("create video app with HTTPS src returns 201", status == 201)

    status, _ = create_app("video", "Bad Video", {"src": "http://example.com/video.mp4"})
    check("create video app with HTTP src returns 422", status == 422)

    big_markdown = "a" * (256 * 1024 + 1)
    status, _ = create_app("markdown", "Big Markdown", {"markdown": big_markdown})
    check("create markdown app >256KB returns 422", status == 422)

    status, bundle = request("GET", f"/tenants/{TENANT_SLUG}/desktop", headers=admin_headers)
    check("GET desktop bundle returns apps and etag", status == 200 and "apps" in bundle.get("data", {}) and "etag" in bundle.get("data", {}))

    app_id = folder["data"]["id"]
    status, full = request("GET", f"/tenants/{TENANT_SLUG}/apps/{app_id}", headers=admin_headers)
    check("GET app returns full app with content", status == 200 and "content" in full.get("data", {}))

    etag = full["data"]["etag"]
    status, updated = request("PATCH", f"/tenants/{TENANT_SLUG}/apps/{app_id}", {"etag": etag, "title": "Renamed Folder"}, admin_headers)
    check("PATCH app with correct etag returns 200", status == 200)

    status, _ = request("PATCH", f"/tenants/{TENANT_SLUG}/apps/{app_id}", {"etag": etag, "title": "Stale"}, admin_headers)
    check("PATCH app with stale etag returns 409", status == 409)

    status, _ = request("DELETE", f"/tenants/{TENANT_SLUG}/apps/{app_id}", headers=admin_headers)
    check("DELETE app as owner returns 204", status == 204)

    status, _ = request("GET", f"/tenants/{TENANT_SLUG}/apps/{app_id}", headers=admin_headers)
    check("GET deleted app returns 404", status == 404)

    # Layout persistence
    print("\nLayout persistence")
    status, layout = request("GET", f"/tenants/{TENANT_SLUG}/desktop-layout", headers=admin_headers)
    layout_etag = layout.get("data", {}).get("etag", "") if status == 200 else ""

    status, _ = request("PUT", f"/tenants/{TENANT_SLUG}/desktop-layout", {
        "version": 1,
        "background_preset_id": "default",
        "icon_tree": [],
        "windows": [],
        "etag": layout_etag,
    }, admin_headers)
    check("PUT empty shared layout succeeds", status in (200, 201))

    status, layout = request("GET", f"/tenants/{TENANT_SLUG}/desktop-layout", headers=admin_headers)
    check("GET shared layout returns persisted icon_tree", status == 200 and layout.get("data", {}).get("icon_tree") == [])

    # Icon tree removal on delete
    status, folder2 = create_app("folder", "Folder to Delete")
    folder2_id = folder2["data"]["id"]
    layout_etag = layout["data"]["etag"]
    tree = [{"app_id": folder2_id, "x": 10, "y": 10}]
    status, _ = request("PUT", f"/tenants/{TENANT_SLUG}/desktop-layout", {
        "version": 1,
        "background_preset_id": "default",
        "icon_tree": tree,
        "windows": [],
        "etag": layout_etag,
    }, admin_headers)
    check("PUT layout with one icon succeeds", status in (200, 201))

    request("DELETE", f"/tenants/{TENANT_SLUG}/apps/{folder2_id}", headers=admin_headers)
    status, layout = request("GET", f"/tenants/{TENANT_SLUG}/desktop-layout", headers=admin_headers)
    check("Deleting app removes it from icon_tree", status == 200 and layout.get("data", {}).get("icon_tree") == [])

    # Ownership / permissions
    print("\nOwnership / permissions")
    status, owner_app = create_app("notes", "Owner Notes")
    owner_app_id = owner_app["data"]["id"]

    status, _ = request("DELETE", f"/tenants/{TENANT_SLUG}/apps/{owner_app_id}", headers=member_headers)
    check("member cannot delete admin's app (403)", status == 403)

    status, _ = request("GET", f"/tenants/{TENANT_SLUG}/apps/{owner_app_id}", headers=member_headers)
    check("member cannot read admin's private app (403)", status == 403)

    # Cleanup
    request("DELETE", f"/tenants/{TENANT_SLUG}/apps/{owner_app_id}", headers=admin_headers)
    status, final_layout = request("GET", f"/tenants/{TENANT_SLUG}/desktop-layout", headers=admin_headers)
    final_etag = final_layout.get("data", {}).get("etag", "") if status == 200 else ""
    request("PUT", f"/tenants/{TENANT_SLUG}/desktop-layout", {
        "version": 1,
        "background_preset_id": "default",
        "icon_tree": [],
        "windows": [],
        "etag": final_etag,
    }, admin_headers)

    # Summary
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    if passed == total:
        print(f"{PASS} All {total} API checks passed.")
        return 0
    print(f"{FAIL} {total - passed} of {total} API checks failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
