import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function completeRequiredLog(page: Page) {
  await page.context().grantPermissions(["geolocation"]);
  await page
    .context()
    .setGeolocation({ latitude: 13.7563, longitude: 100.5018, accuracy: 5 });
  await page
    .getByRole("button", { name: "Find my location", exact: true })
    .click();
  await expect(page.getByText("13.7563° N")).toBeVisible();
  await page.getByRole("button", { name: "3 Photo", exact: true }).click();
  await page.getByLabel("Take or choose a photo").setInputFiles({
    name: "cleanup.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Use photo", exact: true }).click();
}
export async function fetchIfNeeded(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Records.", exact: true }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: "Fetch Logs", exact: true });
  if (await button.count()) await button.click();
}

export async function attachReceipt(page: Page) {
  await page.getByLabel("Receipt image", { exact: true }).setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
}
