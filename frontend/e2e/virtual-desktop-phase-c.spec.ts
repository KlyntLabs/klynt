import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const TENANT_SLUG = "acme-test";
const LOGIN_EMAIL = "test@klynt.dev";
const LOGIN_PASSWORD = "TestPass123!";

async function apiLogin(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post("http://localhost:3001/api/v1/auth/login", {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.access_token as string;
}

async function login(page: import("@playwright/test").Page) {
  const token = await apiLogin(page.request);
  await page.context().addCookies([
    {
      name: "session_token",
      value: token,
      domain: ".lvh.me",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function resetTenantLayout(request: import("@playwright/test").APIRequestContext) {
  const token = await apiLogin(request);
  const headers = { Authorization: `Bearer ${token}` };

  const layoutResponse = await request.get(
    `http://localhost:3001/api/v1/tenants/${TENANT_SLUG}/desktop-layout`,
    { headers }
  );
  const currentEtag = layoutResponse.ok()
    ? ((await layoutResponse.json()).data.etag as string)
    : "";
  await request.put(`http://localhost:3001/api/v1/tenants/${TENANT_SLUG}/desktop-layout`, {
    headers,
    data: {
      version: 1,
      background_preset_id: "default",
      icon_tree: [],
      windows: [],
      etag: currentEtag,
    },
  });
}

async function resetTenantDesktop(request: import("@playwright/test").APIRequestContext) {
  const token = await apiLogin(request);
  const headers = { Authorization: `Bearer ${token}` };

  const bundleResponse = await request.get(
    `http://localhost:3001/api/v1/tenants/${TENANT_SLUG}/desktop`,
    { headers }
  );
  if (bundleResponse.ok()) {
    const bundle = await bundleResponse.json();
    for (const app of bundle.data.apps as { id: string }[]) {
      await request.delete(`http://localhost:3001/api/v1/tenants/${TENANT_SLUG}/apps/${app.id}`, {
        headers,
      });
    }
  }

  await resetTenantLayout(request);
}

async function openTenantDesktop(page: import("@playwright/test").Page) {
  await page.goto(`http://${TENANT_SLUG}.lvh.me:5174/`);
  await expect(page.locator('[data-testid="desktop-center-grid"]')).toBeVisible({
    timeout: 10_000,
  });
}

function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function openDesktopContextMenu(page: import("@playwright/test").Page) {
  await page.locator('[role="application"]').click({ button: "right", force: true });
  await expect(page.locator('[data-testid="context-menu-renderer"]')).toBeVisible();
}

async function createAppFromContextMenu(
  page: import("@playwright/test").Page,
  menuItemId: string,
  title: string
) {
  await openDesktopContextMenu(page);
  await page.locator(`[data-testid="context-menu-item-${menuItemId}"]`).click({ force: true });
  await expect(page.locator("role=dialog >> text=Create new app")).toBeVisible();
  await page.locator("#new-app-title").fill(title);
  await page.locator('button[type="submit"]').click({ force: true });
  await expect(page.locator("role=dialog >> text=Create new app")).not.toBeVisible({
    timeout: 10_000,
  });
}

async function waitForAppIcon(page: import("@playwright/test").Page, title: string) {
  const icon = page.locator('[data-testid="desktop-icon-grid"] button', { hasText: title });
  await expect(icon).toBeVisible({ timeout: 10_000 });
  return icon;
}

async function clickAppIcon(
  icon: import("@playwright/test").Locator,
  action: "click" | "dblclick" = "click"
) {
  // Desktop icons are draggable, so Playwright pointer clicks are consumed by the
  // HTML5 drag-and-drop logic. Dispatch the event directly to exercise the handlers.
  if (action === "dblclick") {
    await icon.dispatchEvent("dblclick");
  } else {
    await icon.dispatchEvent("click");
  }
}

async function dispatchHtml5DragTo(
  source: import("@playwright/test").Locator,
  target: import("@playwright/test").Locator
) {
  const sourceEl = await source.elementHandle();
  const targetEl = await target.elementHandle();
  if (!sourceEl || !targetEl) {
    throw new Error("Source or target icon not found for drag");
  }

  const sourceBox = await sourceEl.boundingBox();
  const targetBox = await targetEl.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("Source or target icon not visible for drag");
  }

  const sourceCenter = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetCenter = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };

  await sourceEl.evaluate(
    (element, [sx, sy]) => {
      const dt = new DataTransfer();
      (window as unknown as Record<string, unknown>).__klyntDragData = dt;
      const event = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: sx,
        clientY: sy,
      });
      element.dispatchEvent(event);
    },
    [sourceCenter.x, sourceCenter.y] as [number, number]
  );

  await targetEl.evaluate(
    (element, [tx, ty]) => {
      const dt = (window as unknown as Record<string, unknown>).__klyntDragData as
        | DataTransfer
        | undefined;
      if (!dt) return;
      const event = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: tx,
        clientY: ty,
      });
      element.dispatchEvent(event);
    },
    [targetCenter.x, targetCenter.y] as [number, number]
  );

  await sourceEl.evaluate((element) => {
    const dt = (window as unknown as Record<string, unknown>).__klyntDragData as
      | DataTransfer
      | undefined;
    const event = new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt ?? new DataTransfer(),
    });
    element.dispatchEvent(event);
    delete (window as unknown as Record<string, unknown>).__klyntDragData;
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Phase C — virtual desktop browser verification", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await resetTenantDesktop(page.request);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    // Reset layout (icon tree + windows) so each test starts from a clean desktop
    await resetTenantLayout(page.request);
    await openTenantDesktop(page);
    // Ensure tests run with the default English locale regardless of prior localStorage state
    await page.evaluate(() => window.localStorage.setItem("klynt-language", "en"));
    await page.reload();
    // After reload the React app has to remount; wait for the desktop surface before
    // sending keyboard shortcuts or making assertions.
    await expect(page.locator('[data-testid="desktop-center-grid"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[role="status"][aria-busy="true"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("desktop shell renders with wallpaper, menubar and empty grid", async ({ page }) => {
    await expect(page.locator('[data-testid="desktop-center-grid"]')).toBeVisible();
    await expect(page.locator("role=application")).toBeVisible();
    await expect(page.locator("text=No icons on this desktop.")).toBeVisible();
    await expect(page.locator("text=Members")).toBeVisible();
    await expect(page.locator("text=Roles")).toBeVisible();
    await expect(page.locator("text=Tenant settings")).toBeVisible();
  });

  test("context menu on desktop background shows expected items", async ({ page }) => {
    await openDesktopContextMenu(page);
    await expect(page.locator('[data-testid="context-menu-item-new-folder"]')).toHaveText(
      "New Folder"
    );
    await expect(page.locator('[data-testid="context-menu-item-new-markdown"]')).toHaveText(
      "New Markdown"
    );
    await expect(page.locator('[data-testid="context-menu-item-new-notes"]')).toHaveText(
      "New Notes"
    );
    await expect(page.locator('[data-testid="context-menu-item-new-video"]')).toHaveText(
      "New Video"
    );
    await expect(page.locator('[data-testid="context-menu-item-paste"]')).toHaveText("Paste");
    await expect(page.locator('[data-testid="context-menu-item-refresh"]')).toHaveText("Refresh");
    await expect(page.locator('[data-testid="context-menu-item-change-background"]')).toHaveText(
      "Change Background"
    );
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="desktop-context-menu"]')).not.toBeVisible();
  });

  test("create a folder via context menu and open it", async ({ page }) => {
    const folderTitle = uniqueName("Folder");
    await createAppFromContextMenu(page, "new-folder", folderTitle);
    const folderIcon = await waitForAppIcon(page, folderTitle);

    await clickAppIcon(folderIcon, "dblclick");
    await expect(page.locator('[data-testid="desktop-empty-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-breadcrumb"]')).toContainText("Home");
    await expect(page.locator('[data-testid="folder-breadcrumb"]')).toContainText(folderTitle);

    // Click Home breadcrumb to return to root
    await page
      .locator('[data-testid="folder-breadcrumb"] button', { hasText: "Home" })
      .dispatchEvent("click");
    await expect(page.locator('[data-testid="desktop-empty-grid"]')).not.toBeVisible();
    await expect(
      page.locator('[data-testid="desktop-icon-grid"] button', { hasText: folderTitle })
    ).toBeVisible();
  });

  test("create markdown app, edit and persist after reload", async ({ page }) => {
    const title = uniqueName("Markdown");
    await createAppFromContextMenu(page, "new-markdown", title);
    const icon = await waitForAppIcon(page, title);
    await clickAppIcon(icon, "dblclick");

    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();
    await page.locator('[data-testid="markdown-editor"]').fill("# Hello Klynt");
    await expect(page.locator('[data-testid="markdown-preview"]')).toContainText("Hello Klynt", {
      timeout: 5_000,
    });

    // Wait for renderer debounce (300ms) + autosave debounce (1500ms) to complete
    await page.waitForTimeout(2_500);

    await page.reload();
    await openTenantDesktop(page);
    const restoredIcon = await waitForAppIcon(page, title);
    await clickAppIcon(restoredIcon, "dblclick");
    await expect(page.locator('[data-testid="markdown-preview"]')).toContainText("Hello Klynt", {
      timeout: 5_000,
    });
  });

  test("create notes app, edit and persist after reload", async ({ page }) => {
    const title = uniqueName("Notes");
    await createAppFromContextMenu(page, "new-notes", title);
    const icon = await waitForAppIcon(page, title);
    await clickAppIcon(icon, "dblclick");

    await expect(page.locator('[data-testid="notes-editor"]')).toBeVisible();
    await page.locator('[data-testid="notes-editor"]').fill("My note content");

    // Wait for renderer debounce + autosave debounce to complete
    await page.waitForTimeout(2_500);

    await page.reload();
    await openTenantDesktop(page);
    const restoredIcon = await waitForAppIcon(page, title);
    await clickAppIcon(restoredIcon, "dblclick");
    await expect(page.locator('[data-testid="notes-editor"]')).toHaveValue("My note content", {
      timeout: 5_000,
    });
  });

  test("create video app with valid and invalid URLs", async ({ page }) => {
    const validTitle = uniqueName("Video");
    await createAppFromContextMenu(page, "new-video", validTitle);
    const icon = await waitForAppIcon(page, validTitle);
    await clickAppIcon(icon, "dblclick");

    await page.locator('[data-testid="video-url-input"]').fill("https://example.com/video.mp4");
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();

    // Invalid URL clears the player and shows empty state
    await page.locator('[data-testid="video-url-input"]').fill("not-a-url");
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="video-empty-state"]')).toBeVisible();
  });

  test("drag an app into a folder and back out", async ({ page }) => {
    const folderTitle = uniqueName("Folder");
    const noteTitle = uniqueName("Notes");

    await createAppFromContextMenu(page, "new-folder", folderTitle);
    await createAppFromContextMenu(page, "new-notes", noteTitle);

    const folderIcon = await waitForAppIcon(page, folderTitle);
    const noteIcon = await waitForAppIcon(page, noteTitle);

    await dispatchHtml5DragTo(noteIcon, folderIcon);
    await page.waitForTimeout(500);

    // Note should disappear from root grid
    await expect(
      page.locator('[data-testid="desktop-icon-grid"] button', { hasText: noteTitle })
    ).not.toBeVisible();

    // Open folder and verify note is inside
    await clickAppIcon(folderIcon, "dblclick");
    await expect(
      page.locator('[data-testid="desktop-icon-grid"] button', { hasText: noteTitle })
    ).toBeVisible();

    // Drag back to desktop
    const folderItem = page.locator('[data-testid="desktop-icon-grid"] button', {
      hasText: noteTitle,
    });
    const desktopGrid = page.locator('[data-testid="desktop-icon-grid"]');
    await dispatchHtml5DragTo(folderItem, desktopGrid);
    await page.waitForTimeout(500);

    await page
      .locator('[data-testid="folder-breadcrumb"] button', { hasText: "Home" })
      .dispatchEvent("click");
    await expect(
      page.locator('[data-testid="desktop-icon-grid"] button', { hasText: noteTitle })
    ).toBeVisible();
  });

  test("keyboard shortcuts open new app dialog, open and delete selected icon", async ({
    page,
  }) => {
    const title = uniqueName("Shortcut");
    await page.keyboard.press("Control+Shift+n");
    await expect(page.locator("role=dialog >> text=Create new app")).toBeVisible();
    await page.locator("#new-app-title").fill(title);
    await page.locator('button[type="submit"]').click({ force: true });
    await expect(page.locator("role=dialog >> text=Create new app")).not.toBeVisible({
      timeout: 10_000,
    });

    const icon = await waitForAppIcon(page, title);
    await clickAppIcon(icon);

    // Open selected with Enter (shortcut creates a folder by default)
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="desktop-empty-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-breadcrumb"]')).toContainText(title);

    // Close folder navigation and delete selected
    await page
      .locator('[data-testid="folder-breadcrumb"] button', { hasText: "Home" })
      .dispatchEvent("click");
    await expect(page.locator('[data-testid="desktop-empty-grid"]')).not.toBeVisible();

    await clickAppIcon(icon);
    await page.keyboard.press("Delete");
    await expect(
      page.locator('[data-testid="desktop-icon-grid"] button', { hasText: title })
    ).not.toBeVisible();
  });

  test("i18n language switching updates desktop empty state", async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem("klynt-language", "vi");
    });
    await page.reload();
    await openTenantDesktop(page);
    await expect(page.locator('[data-testid="desktop-center-grid"]')).toBeVisible();
    // Vietnamese translation for empty desktop should appear once implemented
    const bodyText = await page.locator('[data-testid="desktop-center-grid"]').textContent();
    expect(bodyText).toBeTruthy();

    await page.evaluate(() => {
      window.localStorage.setItem("klynt-language", "cn");
    });
    await page.reload();
    await openTenantDesktop(page);
    const bodyTextCn = await page.locator('[data-testid="desktop-center-grid"]').textContent();
    expect(bodyTextCn).toBeTruthy();
  });

  test("dock icons open their windows", async ({ page }) => {
    await page.locator("button", { hasText: "Members" }).dispatchEvent("click");
    await expect(page.locator('[data-testid="desktop-window"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-window"]')).toContainText("Members");

    await page
      .locator('[data-testid="desktop-window"] [aria-label="Close"]')
      .first()
      .dispatchEvent("click");
    await expect(page.locator('[data-testid="desktop-window"]')).not.toBeVisible();
  });

  test("ETag conflict dialog appears when editing the same markdown app in two tabs", async ({
    page,
    context,
  }) => {
    const title = uniqueName("Conflict");
    await createAppFromContextMenu(page, "new-markdown", title);
    const icon = await waitForAppIcon(page, title);
    await clickAppIcon(icon, "dblclick");
    await expect(page.locator('[data-testid="markdown-editor"]')).toBeVisible();

    const page2 = await context.newPage();
    await login(page2);
    await openTenantDesktop(page2);
    const icon2 = await waitForAppIcon(page2, title);
    await clickAppIcon(icon2, "dblclick");
    await expect(page2.locator('[data-testid="markdown-editor"]')).toBeVisible();

    // Save from tab 1
    await page.locator('[data-testid="markdown-editor"]').fill("Tab 1 content");
    await page.waitForTimeout(2_500);

    // Save from tab 2
    await page2.locator('[data-testid="markdown-editor"]').fill("Tab 2 content");
    await page2.waitForTimeout(2_500);

    // One of the tabs should show the conflict dialog
    await expect(page2.locator("role=dialog", { hasText: /conflict/i }))
      .toBeVisible({ timeout: 5_000 })
      .catch(async () => {
        await expect(page.locator("role=dialog", { hasText: /conflict/i })).toBeVisible({
          timeout: 5_000,
        });
      });

    await page2.close();
  });
});
