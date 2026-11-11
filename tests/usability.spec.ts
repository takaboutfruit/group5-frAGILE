import { test, expect } from "@playwright/test";
test("incomplete drafts cannot commit and primary button text contrasts", async ({
  page,
}) => {
  await page.goto("/logs/new");
  await page.getByRole("button", { name: "4 Note", exact: true }).click();
  await page.getByLabel("Cleanup note").fill("Partial draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText("GPS");
  await expect(page.getByRole("dialog")).toContainText("photo");
  await expect(
    page.getByRole("button", { name: "Confirm Commit", exact: true }),
  ).toBeDisabled();
});
test("one sticky workflow navigation, no page navigation strips or refresh queue", async ({
  page,
}) => {
  await page.goto("/sync");
  await expect(page.getByRole("navigation")).toHaveCount(1);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveText([
    "My logs",
    "Sync queue",
    "Records",
  ]);
  await expect(page.locator(".record-links")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh Local Queue" }),
  ).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const b = (await page.getByRole("banner").boundingBox())!;
  expect(b.y).toBe(0);
  await page.getByRole("link", { name: "My logs", exact: true }).click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const button = page.getByRole("link", { name: "Create log", exact: true });
  const style = await button.evaluate((e) => ({
    text: getComputedStyle(e).color,
    bg: getComputedStyle(e).backgroundColor,
  }));
  expect(style.text).toBe("rgb(255, 255, 255)");
  expect(style.bg).not.toBe(style.text);
});
test("fetched records survive navigation and reload without fetching again", async ({
  page,
}) => {
  await page.goto("/uploaded");
  await page.getByRole("button", { name: "Fetch Logs", exact: true }).click();
  await page.getByRole("link", { name: "My logs", exact: true }).click();
  await page.getByRole("link", { name: "Records", exact: true }).click();
  await expect(
    page.getByText("No uploaded logs.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fetch Logs", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Fetch Logs", exact: true }),
  ).toHaveCount(0);
});

test("GPS, date and photo are enough to commit without a note", async ({
  page,
}) => {
  const { completeRequiredLog } = await import("./helpers");
  await page.goto("/logs/new");
  await completeRequiredLog(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeEnabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
});
test("Records retains record progress and validation messages remain visible at the action", async ({
  page,
}) => {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const t = {
      id: "cached-upload",
      ownerId: "local-device",
      createdAt: now,
      updatedAt: now,
      capturedAt: now,
      timezone: "Asia/Bangkok",
      location: { latitude: 13, longitude: 100, accuracy: 5 },
      photo:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      note: "Cached upload",
      status: "UPLOADED",
      committedAt: now,
      uploadedAt: now,
    };
    localStorage.setItem("fragile:v2:log-transfers", JSON.stringify([t]));
    localStorage.setItem("fragile:v2:records-fetched", "yes");
  });
  await page.getByRole("link", { name: "Records", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fetch Logs", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "New Record", exact: true }).click();
  await page.getByLabel("Reference ID").fill("REF-CACHED");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page.getByRole("link", { name: "Records", exact: true }).click();
  await page
    .getByRole("link", { name: "Continue Record", exact: true })
    .click();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-CACHED");
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("required");
  const box = (await alert.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});
