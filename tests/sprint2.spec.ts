import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
async function openRecord(page: Page) {
  await page.goto("/records/new");
  await expect(
    page.getByRole("heading", { name: "Complete your record." }),
  ).toBeVisible();
}
async function signature(page: Page) {
  const c = page.getByLabel("Draw signature");
  await c.scrollIntoViewIfNeeded();
  const b = (await c.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 50);
  await page.mouse.down();
  await page.mouse.move(b.x + 80, b.y + 80, { steps: 8 });
  await page.mouse.move(b.x + 120, b.y + 40, { steps: 8 });
  await page.mouse.up();
}
async function details(page: Page) {
  await page.getByLabel("Reference ID").fill("REF-12345");
  await page.getByLabel("Weight (kg)").fill("12.5");
  await page.getByLabel("Material type").selectOption("PET (bottles)");
  await page.getByLabel("Contamination level").selectOption("Low");
  await signature(page);
}
async function finalize(page: Page) {
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit Anyway", exact: true })
    .click();
  await expect(
    page.getByText("Record submitted", { exact: true }),
  ).toBeVisible();
}
test("S2 details validation, edit cancellation and saved reload persistence", async ({
  page,
}) => {
  await openRecord(page);
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("required");
  await details(page);
  await page.getByLabel("Material type").selectOption("Other");
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("other material");
  await page.getByLabel("Describe material").fill("Sacks");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved" }),
  ).toContainText("Draft saved");
  await page.reload();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-12345");
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("12.5");
  await expect(page.getByLabel("Describe material")).toHaveValue("Sacks");
  await page.getByLabel("Reference ID").fill("CHANGED");
  await page.getByRole("button", { name: "Cancel edits", exact: true }).click();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-12345");
  await page
    .getByRole("button", { name: "Clear Signature", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Signature");
});
test("S2 receipt IndexedDB persistence, preview, retake cancellation and invalid files", async ({
  page,
}) => {
  await openRecord(page);
  await page
    .getByLabel("Receipt image")
    .setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page.reload();
  await expect(page.getByAltText("Saved receipt")).toBeVisible();
  await page
    .getByLabel("Retake receipt")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: png });
  await page
    .getByRole("button", { name: "Discard preview", exact: true })
    .click();
  await expect(page.getByAltText("Saved receipt")).toBeVisible();
  await page.getByLabel("Retake receipt").setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toContainText("JPEG or PNG");
  await expect(page.getByAltText("Saved receipt")).toBeVisible();
  await page.getByLabel("Retake receipt").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(3 * 1024 * 1024),
  });
  await expect(page.getByRole("alert")).toContainText("3 MB");
});
test("S2 Chrome offline, local commit, online sync, failure retry and no duplicates", async ({
  page,
  context,
}) => {
  await openRecord(page);
  await details(page);
  await context.setOffline(true);
  await expect(page.getByTestId("connectivity")).toContainText("Offline");
  await finalize(page);
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .last()
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await page.getByRole("radio", { name: "Select log" }).check();
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("offline");
  await context.setOffline(false);
  await expect(page.getByTestId("connectivity")).toContainText("Online");
  await page.getByLabel("Simulation outcome").selectOption("fail");
  await page.getByRole("radio", { name: "Select log" }).check();
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toContainText("Failed");
  await page.getByLabel("Simulation outcome").selectOption("success");
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toContainText(
    "Uploaded (simulated)",
  );
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("queue-row")).toContainText(
    "Uploaded (simulated)",
  );
});
test("S2 interrupt upload when connection drops and recover", async ({
  page,
  context,
}) => {
  await openRecord(page);
  await details(page);
  await finalize(page);
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .last()
    .click();
  await page.getByRole("radio", { name: "Select log" }).check();
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toContainText("Syncing");
  await context.setOffline(true);
  await expect(page.getByTestId("queue-row")).toContainText("Failed");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toContainText(
    "Uploaded (simulated)",
  );
});
test("S2 submission failure preserves edits and retry locks final record", async ({
  page,
}) => {
  await openRecord(page);
  await details(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (k, v) {
      if (k === "fragile:v2:records")
        throw new DOMException("full", "QuotaExceededError");
      original.call(this, k, v);
    };
  });
  await page
    .getByRole("button", { name: "Submit Final Record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit Anyway", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-12345");
  await page.evaluate(() => (window as any).restoreStorage());
  await finalize(page);
  await page.reload();
  await expect(page.getByLabel("Reference ID")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Submit Final Record", exact: true }),
  ).toHaveCount(0);
});
for (const width of [375, 768, 1440])
  test(`S2 layout ${width}: details, queue and pending empty states`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openRecord(page);
    const nav = await page
      .getByRole("navigation", { name: "Main navigation" })
      .boundingBox();
    const banner = await page.getByRole("banner").boundingBox();
    expect(nav!.y + nav!.height).toBeLessThanOrEqual(
      banner!.y + banner!.height,
    );
    for (const name of [
      "Reference & weight",
      "Material & contamination",
      "Receipt",
      "Signature",
      "Review & submit",
    ])
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "View Sync Queue", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("Your sync queue is empty.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh Local Queue", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Fetch Pending Logs", exact: true })
      .click();
    await expect(
      page.getByText("No pending logs.", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("S2 pending fetch, selected-only updates, refresh and interrupted reload recovery", async ({
  page,
}) => {
  await openRecord(page);
  await details(page);
  await finalize(page);
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .last()
    .click();
  await page
    .getByRole("link", { name: "Fetch Pending Logs", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("queue-row")).toContainText("REF-12345");
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("select a valid");
  await page.getByRole("radio", { name: "Select log" }).check();
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(page.getByTestId("queue-row")).toContainText("Syncing");
  await page.reload();
  await expect(page.getByTestId("queue-row")).toContainText("Failed");
  await page.getByRole("radio", { name: "Select log" }).check();
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(
    page.getByText("No pending logs.", { exact: true }),
  ).toBeVisible();
});
test("S2 offline image and signature edits persist and confirmed receipt replacement updates same record", async ({
  page,
  context,
}) => {
  await openRecord(page);
  await context.setOffline(true);
  await details(page);
  await page
    .getByLabel("Receipt image")
    .setInputFiles({ name: "one.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved" }),
  ).toBeVisible();
  const first = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("fragile:v2:records")!)[0].receiptImageId,
  );
  await page
    .getByLabel("Retake receipt")
    .setInputFiles({ name: "two.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByAltText("Saved receipt")).toBeVisible();
  await expect(
    page.getByText("Signature captured.", { exact: false }),
  ).toBeVisible();
  const rows = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("fragile:v2:records")!),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].receiptImageId).not.toBe(first);
});
test("S2 invalid form updates preserve saved data and navigation warns about unsaved edits", async ({
  page,
}) => {
  await openRecord(page);
  await details(page);
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page.getByLabel("Weight (kg)").fill("-2");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Weight");
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Discard unsaved changes",
  );
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await page.getByRole("button", { name: "Cancel edits", exact: true }).click();
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("12.5");
  await page.getByLabel("Reference ID").fill("REF-EDIT");
  await page.getByLabel("Weight (kg)").fill("14");
  await page.getByLabel("Material type").selectOption("HDPE (containers)");
  await page.getByLabel("Contamination level").selectOption("High");
  await page
    .getByRole("button", { name: "Save as Draft", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Reference ID")).toHaveValue("REF-EDIT");
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("14");
  await expect(page.getByLabel("Material type")).toHaveValue(
    "HDPE (containers)",
  );
  await expect(page.getByLabel("Contamination level")).toHaveValue("High");
});
test("S2 malformed storage and unavailable IndexedDB show recoverable feedback", async ({
  page,
}) => {
  await page.goto("/sync");
  await page.evaluate(() =>
    localStorage.setItem("fragile:v2:records", "broken"),
  );
  await page
    .getByRole("button", { name: "Refresh Local Queue", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("untouched");
  await page.evaluate(() => localStorage.removeItem("fragile:v2:records"));
  await openRecord(page);
  await page.evaluate(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open() {
          throw Error("Receipt storage unavailable");
        },
      },
    });
  });
  await page
    .getByLabel("Receipt image")
    .setInputFiles({ name: "one.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Use receipt", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Receipt storage unavailable",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Discard preview", exact: true })
    .click();
});

test("S2 only selected upload changes, unsupported draft selection rejected and no API requests", async ({
  page,
}) => {
  await openRecord(page);
  await details(page);
  await finalize(page);
  await page
    .getByRole("link", { name: "View Sync Queue", exact: true })
    .last()
    .click();
  await page.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem("fragile:v2:records")!);
    rows.push({ ...rows[0], id: "second-log", reference: "REF-SECOND" });
    rows.push({
      ...rows[0],
      id: "draft-log",
      status: "DRAFT",
      reference: "REF-DRAFT",
    });
    localStorage.setItem("fragile:v2:records", JSON.stringify(rows));
  });
  await page
    .getByRole("button", { name: "Refresh Local Queue", exact: true })
    .click();
  await expect(page.getByTestId("queue-row")).toHaveCount(3);
  await expect(
    page
      .getByTestId("queue-row")
      .filter({ hasText: "REF-DRAFT" })
      .getByRole("radio"),
  ).toHaveCount(0);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (
      ["fetch", "xhr"].includes(r.resourceType()) &&
      r.url().startsWith("http")
    )
      requests.push(r.url());
  });
  await page
    .getByTestId("queue-row")
    .filter({ hasText: "REF-SECOND" })
    .getByRole("radio")
    .check();
  await page.getByRole("button", { name: "Upload Log", exact: true }).click();
  await expect(
    page.getByTestId("queue-row").filter({ hasText: "REF-SECOND" }),
  ).toContainText("Uploaded (simulated)");
  await expect(
    page.getByTestId("queue-row").filter({ hasText: "REF-12345" }),
  ).toContainText("Pending Upload");
  expect(requests).toEqual([]);
});

test("S2 legacy draft becomes a final snapshot without changing the original", async ({
  page,
}) => {
  await page.goto("/logs");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "fragile:v1:drafts",
      JSON.stringify([
        {
          id: "legacy-draft",
          ownerId: "legacy-account",
          createdAt: now,
          updatedAt: now,
          capturedAt: now,
          timezone: "Asia/Bangkok",
          location: { latitude: 13.75, longitude: 100.5, accuracy: 5 },
          photo: null,
          note: "Preserved cleanup",
        },
      ]),
    );
  });
  await page.reload();
  await page
    .getByRole("link", { name: "Complete final record", exact: true })
    .click();
  await expect(
    page.getByText("Preserved cleanup", { exact: true }),
  ).toBeVisible();
  await details(page);
  await finalize(page);
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem("fragile:v1:drafts")!)[0],
  );
  expect(original.note).toBe("Preserved cleanup");
  expect(original.ownerId).toBe("legacy-account");
  await page.reload();
  await expect(page.getByLabel("Reference ID")).toBeDisabled();
});
