import { test, expect } from "@playwright/test";
test("duplicate reference cannot be saved or submitted and its own record can keep it", async ({
  page,
}) => {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const source = {
      id: "original",
      ownerId: "local-device",
      createdAt: now,
      updatedAt: now,
      capturedAt: now,
      timezone: "UTC",
      location: { latitude: 13, longitude: 100, accuracy: 5 },
      photo: null,
      note: "Uploaded",
      status: "UPLOADED",
      committedAt: now,
    };
    localStorage.setItem(
      "fragile:v2:log-transfers",
      JSON.stringify([source, { ...source, id: "second" }]),
    );
    localStorage.setItem("fragile:v2:records-fetched", "yes");
  });
  await page.goto("/records/original");
  await page.getByLabel("Reference ID").fill("REF-UNIQUE");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await expect(page.locator("#record-reference-error")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Back to Records", exact: true })
    .click();
  await page.getByRole("link", { name: "New Record", exact: true }).click();
  await page.getByLabel("Reference ID").fill("ref-unique");
  await page.getByLabel("Weight (kg)").focus();
  await expect(page.locator("#record-reference-error")).toContainText(
    "already used",
  );
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("already used");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("fragile:v2:records")!).length,
    ),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.locator("#record-reference-error")).toContainText(
    "already used",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Reference ID").fill("REF-NEW");
  await expect(page.locator("#record-reference-error")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("fragile:v2:records")!).length,
    ),
  ).toBe(2);
});
