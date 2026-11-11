import { completeRequiredLog, fetchIfNeeded } from "./helpers";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
async function saveLog(page: Page, note: string) {
  await page.getByRole("link", { name: "Create log", exact: true }).click();
  await completeRequiredLog(page);
  await page.getByRole("button", { name: "4 Note", exact: true }).click();
  await page.getByLabel("Cleanup note").fill(note);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
}
test("offline save stays out of queue; commit selection, upload, fetch and final record are distinct stages", async ({
  page,
  context,
}) => {
  await page.goto("/logs");
  await context.setOffline(true);
  await saveLog(page, "Offline nets");
  await saveLog(page, "Keep uncommitted");
  const sources = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("fragile:v1:drafts")!),
  );
  const source = sources.find(
    (d: { note: string }) => d.note === "Offline nets",
  );
  await page.getByRole("link", { name: "Sync queue", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toHaveCount(0);
  await page.getByRole("link", { name: "My logs", exact: true }).click();
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /Offline nets/ })
    .check();
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sync$/);
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await expect(page.getByTestId("queue-row")).toContainText("Offline nets");
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("offline");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(
    page.getByText("Your sync queue is empty.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Records", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("uploaded-log")).toHaveCount(0);
  await fetchIfNeeded(page);
  await expect(page.getByTestId("uploaded-log")).toHaveCount(1);
  await expect(page.getByTestId("uploaded-log")).toContainText("Offline nets");
  await page.getByRole("link", { name: "New Record", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/records/${source.id}$`));
  await expect(page.getByText("Offline nets", { exact: true })).toBeVisible();
  await page.getByLabel("Reference ID").fill("REF-UPLOADED");
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
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click();
  await expect(
    page.getByText("Record submitted", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sync queue", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("fragile:v1:drafts")!),
    ),
  ).toEqual(sources);
});
test("uncommitted logs cannot create records and fetch requires connection", async ({
  page,
  context,
}) => {
  await page.goto("/logs");
  await saveLog(page, "Not uploaded");
  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem("fragile:v1:drafts")!)[0].id,
  );
  await page.goto(`/records/${id}`);
  await expect(page.getByRole("alert")).toContainText("uploaded");
  await page.goto("/uploaded");
  await context.setOffline(true);
  await fetchIfNeeded(page);
  await expect(page.getByRole("alert")).toContainText("Reconnect");
  await expect(page.getByTestId("uploaded-log")).toHaveCount(0);
});
test("commit cancellation and failed writes preserve selection and source logs", async ({
  page,
}) => {
  await page.goto("/logs");
  await saveLog(page, "Select me");
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  await page.getByRole("checkbox", { name: /Select me/ }).check();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("fragile:v2:log-transfers")),
  ).toBeNull();
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  await page.getByRole("checkbox", { name: /Select me/ }).check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restore = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (k, v) {
      if (k === "fragile:v2:log-transfers") throw Error("full");
      original.call(this, k, v);
    };
  });
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save",
  );
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.evaluate(() => (window as any).restore());
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
});

test("one Upload Log action uploads all confirmed logs and empties the queue", async ({
  page,
}) => {
  await page.goto("/logs");
  await saveLog(page, "First batch log");
  await saveLog(page, "Second batch log");
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  for (const checkbox of await page
    .getByRole("dialog")
    .getByRole("checkbox")
    .all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Records", exact: true })
    .first()
    .click();
  await fetchIfNeeded(page);
  await expect(page.getByTestId("uploaded-log")).toHaveCount(2);
});

test("Commit Logs selection stays readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/logs");
  await saveLog(page, "Mobile cleanup " + "nets".repeat(25));
  await page.getByRole("button", { name: "Commit Logs", exact: true }).click();
  const box = (await page.getByRole("checkbox").boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(24);
  const dialog = (await page.getByRole("dialog").boundingBox())!;
  const label = (await page.locator(".commit-choice span").boundingBox())!;
  expect(label.x + label.width).toBeLessThanOrEqual(dialog.x + dialog.width);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm Commit", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
});
