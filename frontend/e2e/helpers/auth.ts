import type { APIRequestContext, Page } from "@playwright/test";
import { Client } from "pg";

export interface TestUser {
  email: string;
  password: string;
  username: string;
}

function getDbUrl(): string {
  return (
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://klynt:klynt@localhost:5432/klynt"
  );
}

function apiBase(): string {
  return process.env.VITE_API_BASE_URL ?? "http://localhost:3001/api/v1";
}

export async function activateUser(email: string): Promise<void> {
  const client = new Client({ connectionString: getDbUrl() });
  await client.connect();
  try {
    await client.query(
      "UPDATE users SET status = 'active', email_verified_at = NOW() WHERE email = $1",
      [email]
    );
  } finally {
    await client.end();
  }
}

export async function createVerifiedUser(
  request: APIRequestContext,
  options: { role?: string; institutionId?: string } = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@example.com`;
  const username = `e2e_${timestamp}`;
  const password = "Str0ng!passphrase";

  const response = await request.post(`${apiBase()}/auth/register`, {
    data: {
      email,
      username,
      password,
      full_name: "E2E Tester",
      role: options.role ?? "student",
      institution_id: options.institutionId ?? null,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register test user: ${response.status()} ${await response.text()}`);
  }

  await activateUser(email);

  return { email, password, username };
}

export async function loginAndSetCookies(page: Page, user: TestUser): Promise<void> {
  const response = await page.request.post(`${apiBase()}/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
      remember_me: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to log in test user: ${response.status()} ${await response.text()}`);
  }

  const setCookie = response.headers()["set-cookie"];
  if (!setCookie) {
    throw new Error("Login response did not set a session cookie");
  }

  const cookieValue = setCookie.split(";")[0];
  const [name, value] = cookieValue.split("=");
  await page.context().addCookies([
    {
      name: name.trim(),
      value: value.trim(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function createTenant(
  page: Page,
  options: { slug: string; name: string }
): Promise<void> {
  const response = await page.request.post(`${apiBase()}/tenants`, {
    data: {
      slug: options.slug,
      name: options.name,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create tenant: ${response.status()} ${await response.text()}`);
  }
}
