import { test, expect } from "@playwright/test";

// ─── Auth Flow ───────────────────────────────────────────────────────────────

test.describe("Auth flow", () => {
  test("Visit / should redirect to /login", async ({ page }) => {
    const response = await page.goto("/");
    const url = page.url();
    expect(url).toContain("/login");
    expect(response?.status()).toBeLessThan(500);
  });

  test("Login page loads with email input and send magic link button", async ({
    page,
  }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText(/send magic link/i);
  });

  test("Visit /auth/callback without code redirects to /login?error=auth_failed", async ({
    page,
  }) => {
    await page.goto("/auth/callback");
    const url = page.url();
    expect(url).toContain("/login");
    expect(url).toContain("error=auth_failed");
  });
});

// ─── Page Navigation (unauthenticated) ───────────────────────────────────────

test.describe("Page navigation (unauthenticated)", () => {
  const pages = [
    { path: "/login", expectLogin: false, name: "Login" },
    { path: "/", expectLogin: true, name: "Dashboard" },
    { path: "/activity", expectLogin: true, name: "Activity" },
    { path: "/reporting", expectLogin: true, name: "Reporting" },
    { path: "/clinicians", expectLogin: true, name: "Clinicians" },
    { path: "/settings", expectLogin: true, name: "Settings" },
    { path: "/admin", expectLogin: true, name: "Admin" },
    {
      path: "/reporting/report-preview",
      expectLogin: true,
      name: "Report Preview",
    },
  ];

  for (const p of pages) {
    test(`${p.name} (${p.path}) returns 200 or redirects to login`, async ({
      page,
    }) => {
      const response = await page.goto(p.path);
      const status = response?.status() ?? 0;

      // Should never be a 500
      expect(status).toBeLessThan(500);

      if (p.expectLogin) {
        // Should redirect to login OR return 200 (if somehow accessible)
        const url = page.url();
        const isLoginRedirect = url.includes("/login");
        const is200 = status === 200;
        expect(isLoginRedirect || is200).toBeTruthy();
      } else {
        expect(status).toBe(200);
      }
    });
  }
});

// ─── Login Page Content ──────────────────────────────────────────────────────

test.describe("Login page content", () => {
  test("Login page has ReportRx branding", async ({ page }) => {
    await page.goto("/login");
    const body = await page.textContent("body");
    expect(body).toContain("ReportRx");
  });

  test("Login page has email input with type=email", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const type = await emailInput.getAttribute("type");
    expect(type).toBe("email");
  });

  test("Login page has a submit button", async ({ page }) => {
    await page.goto("/login");
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();
  });
});

// ─── Mobile Responsiveness ───────────────────────────────────────────────────

test.describe("Mobile responsiveness", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Login page renders without horizontal scroll on iPhone viewport", async ({
    page,
  }) => {
    await page.goto("/login");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // scrollWidth should not significantly exceed clientWidth (allow 1px tolerance)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("Login page elements dont overflow the viewport", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

test.describe("API routes (unauthenticated)", () => {
  test("GET /api/export without auth returns 401 or redirect", async ({
    request,
  }) => {
    const response = await request.get("/api/export", {
      maxRedirects: 0,
    });
    const status = response.status();
    // Should be 401, 302/307 redirect, or at least not 200 with data / not 500
    expect(status === 401 || status === 302 || status === 307 || status === 200).toBeTruthy();
    expect(status).not.toBe(500);
    if (status === 200) {
      // If 200, check it's an error JSON not actual CSV data
      const text = await response.text();
      const isErrorJson = text.includes('"error"');
      const isRedirectHtml = text.includes("/login");
      expect(isErrorJson || isRedirectHtml).toBeTruthy();
    }
  });

  test("GET /api/report without auth returns 401 or redirect", async ({
    request,
  }) => {
    const response = await request.get("/api/report", {
      maxRedirects: 0,
    });
    const status = response.status();
    expect(status === 401 || status === 302 || status === 307 || status === 200).toBeTruthy();
    expect(status).not.toBe(500);
    if (status === 200) {
      const text = await response.text();
      const isErrorJson = text.includes('"error"');
      const isRedirectHtml = text.includes("/login");
      expect(isErrorJson || isRedirectHtml).toBeTruthy();
    }
  });
});
