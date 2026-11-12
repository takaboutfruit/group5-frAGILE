import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem("fragile:v2:records-fetched", "yes");
    localStorage.setItem(
      "fragile:v2:log-transfers",
      JSON.stringify([
        {
          id: "receipt-only",
          ownerId: "local-device",
          createdAt: now,
          updatedAt: now,
          capturedAt: now,
          timezone: "UTC",
          location: { latitude: 13, longitude: 100, accuracy: 5 },
          photo: null,
          note: "Uploaded log",
          status: "UPLOADED",
          committedAt: now,
          uploadedAt: now,
        },
      ]),
    );
  });
  await page.goto("/records/receipt-only");
}
test("saved record draft offers Back to Records and resumes its saved values", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByRole("link", { name: "Back to Records", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Reference ID").fill("REF-RETURN");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Back to Records", exact: true })
    .click();
  await expect(page).toHaveURL(/\/uploaded$/);
  await page
    .getByRole("link", { name: "Continue Record", exact: true })
    .click();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-RETURN");
});
test("receipt-only final record submits without a cleanup-photo warning and returns to Records", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Receipt image")
    .setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await page.getByLabel("Reference ID").fill("REF-RECEIPT");
  await page.getByLabel("Weight (kg)").fill("12.5");
  await page.getByLabel("Material type").selectOption("PET (bottles)");
  await page.getByLabel("Contamination level").selectOption("Low");
  const c = page.getByLabel("Draw signature");
  await c.scrollIntoViewIfNeeded();
  const b = (await c.boundingBox())!;
  await page.mouse.move(b.x + 30, b.y + 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 100, b.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.locator(".record-summary dt").filter({ hasText: /^Photo$/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Submit and lock this record?",
  );
  await expect(page.getByRole("dialog")).not.toContainText("cleanup photo");
  await expect(
    page.getByRole("button", { name: "Submit Anyway", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Back to Records", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "View Final Record", exact: true }),
  ).toBeVisible();
});

test("missing receipt blocks final submission with red field feedback but allows drafts", async ({ page }) => {
  await open(page);
  await page.getByLabel("Reference ID").fill("REF-MISSING-RECEIPT");
  await page.getByLabel("Weight (kg)").fill("12.5");
  await page.getByLabel("Material type").selectOption("PET (bottles)");
  await page.getByLabel("Contamination level").selectOption("Low");
  const canvas = page.getByLabel("Draw signature");
  await canvas.scrollIntoViewIfNeeded();
  const b = (await canvas.boundingBox())!;
  await page.mouse.move(b.x + 30, b.y + 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 100, b.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Save as Draft", exact: true }).click();
  await page.reload();
  await expect(page.locator("#record-receipt-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit Final Record", exact: true }).click();
  const error = page.locator("#record-receipt-error");
  await expect(error).toHaveText("Attach a receipt before submitting the final record.");
  await expect(error).toHaveCSS("color", "rgb(180, 35, 24)");
  const input = page.getByLabel("Receipt image", { exact: true });
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute("aria-describedby", "record-receipt-error");
  expect((await error.boundingBox())!.y).toBeGreaterThan((await input.locator("..").boundingBox())!.y);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Save as Draft", exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fragile:v2:records")!)[0].status)).toBe("DRAFT");
  await input.setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64") });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await expect(error).toHaveCount(0);
  await page.getByRole("button", { name: "Remove receipt", exact: true }).click();
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(error).toBeVisible();
});
