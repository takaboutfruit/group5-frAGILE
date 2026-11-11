import { test, expect } from "@playwright/test";
test("successful uploads leave active My logs and remain in read-only History after reload", async ({
  page,
}) => {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const source = {
      id: "archived-log",
      ownerId: "local-device",
      createdAt: now,
      updatedAt: now,
      capturedAt: now,
      timezone: "Asia/Bangkok",
      location: { latitude: 13, longitude: 100, accuracy: 5 },
      photo: null,
      note: "Uploaded cleanup",
    };
    localStorage.setItem("fragile:v1:drafts", JSON.stringify([source]));
    localStorage.setItem(
      "fragile:v2:log-transfers",
      JSON.stringify([{ ...source, status: "COMMITTED", committedAt: now }]),
    );
  });
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem("fragile:v2:log-transfers")!);
    rows[0].status = "UPLOADED";
    rows[0].uploadedAt = new Date().toISOString();
    localStorage.setItem("fragile:v2:log-transfers", JSON.stringify(rows));
    window.dispatchEvent(new Event("fragile:transfers"));
  });
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your next cleanup belongs here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Commit Logs", exact: true }),
  ).toBeDisabled();
  await page.locator(".uploaded-history summary").click();
  await expect(page.getByTestId("history-log")).toContainText(
    "Uploaded cleanup",
  );
  await expect(
    page
      .getByTestId("history-log")
      .getByRole("link", { name: "View in Records" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("history-log").getByRole("button", { name: /Delete/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await page.locator(".uploaded-history summary").click();
  await expect(page.getByTestId("history-log")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("fragile:v1:drafts")!).length,
    ),
  ).toBe(1);
});
test("drafts, pending uploads and failures remain active while only uploaded logs enter History", async ({
  page,
}) => {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const base = {
      ownerId: "local-device",
      createdAt: now,
      updatedAt: now,
      capturedAt: now,
      timezone: "UTC",
      location: null,
      photo: null,
    };
    const sources = ["draft", "pending", "failed", "uploaded"].map((id) => ({
      ...base,
      id,
      note: id,
    }));
    localStorage.setItem("fragile:v1:drafts", JSON.stringify(sources));
    localStorage.setItem(
      "fragile:v2:log-transfers",
      JSON.stringify(
        sources
          .slice(1)
          .map((s, i) => ({
            ...s,
            status: ["COMMITTED", "FAILED", "UPLOADED"][i],
            committedAt: now,
          })),
      ),
    );
  });
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(3);
  await expect(page.locator(".draft-grid")).not.toContainText("uploaded");
  await page.locator(".uploaded-history summary").click();
  await expect(page.getByTestId("history-log")).toHaveCount(1);
});
