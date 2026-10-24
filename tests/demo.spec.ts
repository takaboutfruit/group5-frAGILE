import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const password = "OceanDemo123!";
async function account(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Maya Chen");
  await page.getByLabel("Email address").fill("maya@example.com");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome aboard." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).last().click();
  await page.getByLabel("Email address").fill("maya@example.com");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My field logs." }),
  ).toBeVisible();
}
test("registration, GPS/photo/note capture, persistence, edit, and confirmed deletion", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 13.7563,
    longitude: 100.5018,
    accuracy: 5,
  });
  await account(page);
  await page.getByRole("link", { name: "Create log", exact: true }).click();
  await page.getByRole("button", { name: "Find my location" }).click();
  await expect(page.getByText("13.7563° N")).toBeVisible();
  await page.getByRole("button", { name: "Next: Date & time" }).click();
  await expect(page.getByText("Captured for this log")).toBeVisible();
  await page.getByRole("button", { name: "Next: Photo" }).click();
  // Valid 1×1 PNG fixture, processed by the real browser image/canvas pipeline.
  await page
    .getByLabel("Take or choose a photo")
    .setInputFiles({
      name: "cleanup.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Use photo", exact: true }).click();
  await page.getByRole("button", { name: "Next: Note" }).click();
  await page
    .getByLabel("Cleanup note")
    .fill("Fishing nets and plastic bottles recovered.");
  await page.getByRole("button", { name: "Next: Review" }).click();
  await expect(
    page.getByText("4 of 4 items captured", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Fishing nets and plastic bottles recovered."),
  ).toBeVisible();
  await expect(page.getByAltText("Cleanup evidence")).toBeVisible();
  await page.getByRole("link", { name: "Edit draft" }).click();
  await page.getByRole("button", { name: "4 Note" }).click();
  await expect(page.getByLabel("Cleanup note")).toHaveValue(
    "Fishing nets and plastic bottles recovered.",
  );
  await page
    .getByLabel("Cleanup note")
    .fill("Updated: all waste secured on deck.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Updated: all waste secured on deck."),
  ).toBeVisible();
  await expect(page.getByAltText("Cleanup evidence")).toBeVisible();
  await page.getByRole("button", { name: /Delete draft/ }).click();
  await page.getByRole("button", { name: "Keep draft" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Delete draft/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next cleanup belongs here." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(0);
});
test("permission denial, unsaved changes, note limit, and storage failure recovery", async ({
  page,
}) => {
  await account(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _: unknown,
          error: (e: { code: number }) => void,
        ) => error({ code: 1 }),
      },
    });
  });
  await page.getByRole("link", { name: "Create log", exact: true }).click();
  await page.getByRole("button", { name: "Find my location" }).click();
  await expect(page.getByRole("alert")).toContainText("permission was denied");
  await page.getByRole("button", { name: "Continue without location" }).click();
  await page.getByRole("button", { name: "4 Note" }).click();
  await page.getByLabel("Cleanup note").fill("a".repeat(501));
  await expect(page.getByLabel("Cleanup note")).toHaveValue("a".repeat(500));
  await page
    .getByLabel("Cleanup note")
    .fill("Retain this note if saving fails.");
  await page.getByRole("link", { name: "My field logs", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restore: () => void }).restore = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Storage may be full");
  await expect(page.getByLabel("Cleanup note")).toHaveValue(
    "Retain this note if saving fails.",
  );
  await page.evaluate(() =>
    (window as unknown as { restore: () => void }).restore(),
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
});
test("mobile layout and local draft editing without connectivity", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await account(page);
  await page.getByRole("link", { name: "Create log", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "4 Note" }).click();
  await page.getByLabel("Cleanup note").fill("Offline cleanup record.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Offline cleanup record.")).toBeVisible();
  await expect(
    page.getByText("You’re offline.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Edit draft" }).click();
  await page.getByRole("button", { name: "4 Note" }).click();
  await page.getByLabel("Cleanup note").fill("Still editing offline.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Still editing offline.")).toBeVisible();
  await context.setOffline(false);
});

test('empty drafts, unsupported photos, discarded edits, and missing drafts', async ({page}) => {
  await account(page);
  await page.getByRole('link', {name: 'Create log', exact: true}).click();
  await page.getByRole('button', {name: 'Save draft', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Add a location, photo, or note');
  await page.getByRole('button', {name: '3 Photo'}).click();
  await page.getByLabel('Take or choose a photo').setInputFiles({name:'not-a-photo.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});
  await expect(page.getByRole('alert')).toContainText('Choose a JPG, PNG, or WebP photo');
  await page.getByRole('button', {name:'4 Note'}).click();
  await page.getByLabel('Cleanup note').fill('Discard this unsaved note');
  await page.getByRole('link', {name:'My field logs',exact:true}).click();
  await page.getByRole('button',{name:'Leave without saving'}).click();
  await expect(page.locator('.draft-card')).toHaveCount(0);
  await page.goto('/logs/does-not-exist');
  await expect(page.getByRole('heading',{name:'Draft unavailable'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('could not be found');
});
