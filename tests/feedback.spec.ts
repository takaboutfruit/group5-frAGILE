import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function seed(page: Page, status = "UPLOADED") {
  await page.goto("/logs");
  await page.evaluate((status) => {
    const now = new Date().toISOString();
    const log = {
      id: "feedback-log",
      ownerId: "local-device",
      createdAt: now,
      updatedAt: now,
      capturedAt: now,
      timezone: "Asia/Bangkok",
      location: { latitude: 13.75, longitude: 100.5, accuracy: 5 },
      photo:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      note: "Reef cleanup",
      status,
      committedAt: now,
    };
    localStorage.setItem("fragile:v2:log-transfers", JSON.stringify([log]));
    localStorage.setItem("fragile:v2:records-fetched", "yes");
  }, status);
}
test("record draft saved message uses the bottom notification stack", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/records/feedback-log");
  await page.getByLabel("Reference ID").fill("REF-123");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  const notice = page.locator("#notifications").getByRole("status");
  await expect(notice).toContainText("Draft saved");
  const b = (await notice.boundingBox())!;
  expect(b.y).toBeGreaterThan(page.viewportSize()!.height / 2);
  await expect(page.getByTestId("connectivity")).toHaveText("Online");
});
test("invalid record fields explain errors underneath and clear when corrected", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/records/feedback-log");
  await page.getByLabel("Reference ID").fill("bad !");
  await page.getByLabel("Weight (kg)").fill("-2");
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.locator("#record-reference-error")).toContainText(
    "Reference",
  );
  await expect(page.locator("#record-weight-error")).toContainText("positive");
  await expect(page.getByLabel("Weight (kg)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Weight (kg)").fill("12");
  await expect(page.locator("#record-weight-error")).toHaveCount(0);
  await expect(page.locator("#record-material-error")).toContainText("Select");
});
test("queued committed logs expose read-only details without changing data", async ({
  page,
}) => {
  await seed(page, "COMMITTED");
  await page.goto("/sync");
  const before = await page.evaluate(() =>
    localStorage.getItem("fragile:v2:log-transfers"),
  );
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Reef cleanup");
  await expect(page.getByRole("dialog")).toContainText("13.7500");
  await expect(
    page.getByRole("dialog").getByAltText("Committed cleanup photo"),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("fragile:v2:log-transfers")),
  ).toBe(before);
});
test("mobile My logs actions and Records cards use clear aligned layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await seed(page);
  await page.reload();
  const create = page.getByRole("link", { name: "Create log", exact: true });
  const commit = page.getByRole("button", { name: "Commit Logs", exact: true });
  const a = (await create.boundingBox())!,
    b = (await commit.boundingBox())!;
  expect(Math.abs(a.width - b.width)).toBeLessThan(2);
  expect(
    await create.evaluate((e) => getComputedStyle(e).textDecorationLine),
  ).toBe("none");
  await page.getByRole("link", { name: "Records", exact: true }).click();
  await expect(page.locator(".record-list-card")).toHaveCount(1);
  const card = page.locator(".record-list-card");
  await expect(card).toContainText("Captured");
  await expect(
    card.getByRole("link", { name: "New Record", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});

test("account validation uses field-level red messages", async ({ page }) => {
  await page.goto("/register");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#register-name-error")).toContainText("full name");
  await expect(page.locator("#register-email-error")).toContainText(
    "valid email",
  );
  await expect(page.getByLabel("Email address")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Email address").fill("valid@example.com");
  await expect(page.locator("#register-email-error")).toHaveCount(0);
});
