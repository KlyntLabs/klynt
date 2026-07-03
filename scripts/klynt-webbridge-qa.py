#!/usr/bin/env python3
"""WebBridge-based QA harness for the Klynt virtual desktop."""

import json
import subprocess
import sys
import time
from pathlib import Path

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "klynt-vd-qa"


def wb(action: str, args: dict | None = None) -> dict:
    body = {"action": action, "args": args or {}, "session": SESSION}
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", DAEMON, "-H", "Content-Type: application/json", "-d", json.dumps(body)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def ensure_data(resp: dict) -> dict:
    if not resp.get("ok"):
        raise RuntimeError(f"WebBridge error: {resp}")
    return resp.get("data", {})


def set_session_cookie(token: str) -> None:
    ensure_data(
        wb(
            "cdp",
            {
                "method": "Network.setCookie",
                "params": {
                    "name": "session_token",
                    "value": token,
                    "domain": ".lvh.me",
                    "path": "/",
                    "httpOnly": True,
                    "secure": False,
                    "sameSite": "Lax",
                },
            },
        )
    )


def navigate(url: str) -> None:
    ensure_data(wb("navigate", {"url": url}))


def snapshot() -> dict:
    return ensure_data(wb("snapshot"))


def click(selector: str) -> dict:
    return ensure_data(wb("click", {"selector": selector}))


def fill(selector: str, value: str) -> dict:
    return ensure_data(wb("fill", {"selector": selector, "value": value}))


def evaluate(code: str):
    return ensure_data(wb("evaluate", {"code": code})).get("value")


def screenshot(path: str) -> dict:
    return ensure_data(wb("screenshot", {"path": path}))


def open_context_menu() -> None:
    evaluate(
        """
        (() => {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y });
            document.elementFromPoint(x, y).dispatchEvent(ev);
            return 'ok';
        })()
        """
    )


def create_app(app_type: str, title: str) -> None:
    open_context_menu()
    time.sleep(0.5)
    click(f'[data-testid="context-menu-item-new-{app_type}"]')
    time.sleep(0.5)
    fill("#new-app-title", title)
    time.sleep(0.2)
    click('button[type="submit"]')
    time.sleep(1.5)


def find_icon_by_title(tree: dict, title: str) -> str | None:
    """Find a desktop icon button by its visible title; returns @e ref or None."""

    def walk(node):
        if isinstance(node, dict):
            if node.get("role") == "button" and title in (node.get("name") or ""):
                return node.get("ref")
            for child in node.get("children", []):
                found = walk(child)
                if found:
                    return found
        elif isinstance(node, list):
            for child in node:
                found = walk(child)
                if found:
                    return found
        return None

    return walk(tree)


def wait_for_icon(title: str, timeout: float = 10.0) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        ref = find_icon_by_title(snapshot(), title)
        if ref:
            return ref
        time.sleep(0.5)
    raise TimeoutError(f"Icon '{title}' did not appear")


def dispatch_dblclick(ref: str) -> None:
    evaluate(
        f"""
        (() => {{
            const el = document.querySelector('[data-testid="desktop-icon-grid"] [data-ref="{ref}"]') || document.querySelector('[data-ref="{ref}"]');
            if (!el) return 'not found';
            const ev = new MouseEvent('dblclick', {{ bubbles: true, cancelable: true }});
            el.dispatchEvent(ev);
            return 'dispatched';
        }})()
        """
    )


def main() -> int:
    token = Path("/tmp/klynt-token.txt").read_text().strip()
    set_session_cookie(token)
    navigate("http://acme-test.lvh.me:5174/")
    time.sleep(3)

    print("[QA] Creating folder...")
    create_app("folder", "QA Folder 2")
    wait_for_icon("QA Folder 2")
    print("[QA] Folder created.")

    print("[QA] Creating markdown app...")
    create_app("markdown", "QA Markdown")
    wait_for_icon("QA Markdown")
    print("[QA] Markdown app created.")

    print("[QA] Creating notes app...")
    create_app("notes", "QA Notes")
    wait_for_icon("QA Notes")
    print("[QA] Notes app created.")

    print("[QA] Creating video app...")
    create_app("video", "QA Video")
    wait_for_icon("QA Video")
    print("[QA] Video app created.")

    screenshot("/tmp/klynt-all-apps.png")
    print("[QA] Screenshot saved to /tmp/klynt-all-apps.png")

    return 0


if __name__ == "__main__":
    sys.exit(main())
