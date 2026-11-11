import { expect, test } from "@playwright/test";
test("offline field log is shared by My logs and queue, then fetched into its existing record online", async ({
  page,
  context,
}) => {
  await page.goto("/logs");
  await context.setOffline(true);
  await page.getByRole("link", { name: "Create log", exact: true }).click();
  await page.getByRole("button", { name: "4 Note", exact: true }).click();
  await page.getByLabel("Cleanup note").fill("Offline nets recovered");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem("fragile:v1:drafts")!)[0],
  );
  await page.getByRole("link", { name: "Sync Queue", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await expect(page.getByTestId("queue-row")).toContainText(
    "Offline nets recovered",
  );
  await expect(page.getByTestId("connectivity")).toContainText("Offline");
  await page
    .getByRole("link", { name: "Fetch Pending Logs", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Reconnect");
  await expect(
    page.getByRole("link", { name: "New Record", exact: true }),
  ).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByTestId("connectivity")).toContainText("Online");
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await page.getByRole("link", { name: "New Record", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/records/${original.id}$`));
  await expect(
    page.getByText("Offline nets recovered", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Reference ID").fill("REF-LINKED");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Fetch Pending Logs", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Continue Record", exact: true })
    .click();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-LINKED");
  await page.getByRole("link", { name: "My field logs", exact: true }).click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("fragile:v1:drafts")!)[0],
    ),
  ).toEqual(original);
  await page.getByRole("button", { name: /Delete draft/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete draft", exact: true })
    .click();
  await page.getByRole("link", { name: "Sync Queue", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toHaveCount(0);
});
test("standalone record creation routes to pending logs instead of generating a blank record", async ({
  page,
}) => {
  await page.goto("/records/new");
  await expect(page).toHaveURL(/\/pending$/);
  await expect(
    page.getByText("No pending logs.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("fragile:v2:records")),
  ).toBeNull();
});
