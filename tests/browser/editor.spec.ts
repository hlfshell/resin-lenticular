import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
function fixture(name: string) {
  const png = new PNG({ width: 40, height: 20 });
  png.data.fill(255);
  return { name, mimeType: "image/png", buffer: PNG.sync.write(png) };
}
async function addPair(page: import("@playwright/test").Page) {
  await page
    .getByLabel("Add source images")
    .setInputFiles([fixture("first.png"), fixture("second.png")]);
  await expect(page.locator(".source-card")).toHaveCount(2);
}
test("multi-file import retains both images through the first worker operation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await addPair(page);
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Interlaced artwork preview" }),
  ).toBeVisible();
  await expect(page.locator(".source-card")).toHaveCount(2);
  await page
    .getByLabel("Add source images")
    .setInputFiles([fixture("third.png"), fixture("fourth.png")]);
  await expect(page.locator(".source-card")).toHaveCount(4);
  expect(errors).toEqual([]);
});
test("canvas proportions default to locked and keyboard undo restores the selected image", async ({
  page,
}) => {
  await page.goto("/");
  await addPair(page);
  await page.locator(".source-card").nth(1).click();
  await page.getByLabel("Canvas width", { exact: true }).fill("100");
  await page.getByLabel("Canvas width", { exact: true }).press("Enter");
  await expect(page.getByLabel("Canvas height", { exact: true })).toHaveValue(
    "50",
  );
  await page.locator(".source-heading").click();
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel("Canvas width", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.locator(".source-card.selected")).toContainText(
    "second.png",
  );
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByLabel("Canvas width", { exact: true })).toHaveValue(
    "100",
  );
  await page
    .getByRole("button", { name: "Lock canvas aspect ratio", exact: true })
    .click();
  await page.getByLabel("Canvas width", { exact: true }).fill("120");
  await page.getByLabel("Canvas width", { exact: true }).press("Enter");
  await expect(page.getByLabel("Canvas height", { exact: true })).toHaveValue(
    "50",
  );
});
test("image resizing is linked by default and can be explicitly unlocked", async ({
  page,
}) => {
  await page.goto("/");
  await addPair(page);
  await page.getByRole("tab", { name: "image", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lock image aspect ratio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Image width", { exact: true }).fill("80");
  await page.getByLabel("Image width", { exact: true }).press("Enter");
  await expect(page.getByLabel("Image height", { exact: true })).toHaveValue(
    "40",
  );
  await page
    .getByRole("button", { name: "Lock image aspect ratio", exact: true })
    .click();
  await page.getByLabel("Image height", { exact: true }).fill("45");
  await page.getByLabel("Image height", { exact: true }).press("Enter");
  await expect(page.getByLabel("Image width", { exact: true })).toHaveValue(
    "80",
  );
  await page.locator(".source-heading").click();
  await page.keyboard.press("Meta+z");
  await expect(page.getByLabel("Image height", { exact: true })).toHaveValue(
    "40",
  );
  await page.keyboard.press("Control+y");
  await expect(page.getByLabel("Image height", { exact: true })).toHaveValue(
    "45",
  );
});
test("image cards reorder by drag and undo with explicit movement controls", async ({
  page,
}) => {
  await page.goto("/");
  await addPair(page);
  await page
    .locator(".source-card")
    .nth(0)
    .dragTo(page.locator(".source-card").nth(1));
  await expect(page.locator(".source-card").nth(0)).toContainText("second.png");
  await page.keyboard.press("Control+z");
  await expect(page.locator(".source-card").nth(0)).toContainText("first.png");
  await page
    .getByRole("button", { name: "Move image right", exact: true })
    .click();
  await expect(page.locator(".source-card").nth(1)).toContainText("first.png");
  const preview = page.getByRole("button", {
    name: "Update preview",
    exact: true,
  });
  await expect(
    page
      .locator(".workspace-toolbar")
      .getByRole("button", { name: "Update preview", exact: true }),
  ).toBeVisible();
  await expect(preview).toHaveCount(1);
});
