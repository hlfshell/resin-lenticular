import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import { unzipSync, strFromU8 } from "fflate";
import { readFile } from "node:fs/promises";
function image(name: string, blue = false) {
  const png = new PNG({ width: 32, height: 32 });
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4;
      png.data[i] = blue ? 20 : 230;
      png.data[i + 1] = 110;
      png.data[i + 2] = blue ? 230 : 20;
      png.data[i + 3] = x < 8 ? 0 : x < 16 ? 128 : 255;
    }
  return { name, mimeType: "image/png", buffer: PNG.sync.write(png) };
}
test("local studio edits, exports matching transparent files, and restores YAML", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const remote: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      remote.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Update preview", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Add source images")
    .setInputFiles([image("left.png"), image("right.png", true)]);
  await expect(page.getByText("2 images added locally.")).toBeVisible();
  await page.getByLabel("Canvas width", { exact: true }).fill("5");
  await page.getByLabel("Canvas width", { exact: true }).press("Enter");
  await page.getByLabel("Canvas height", { exact: true }).fill("5");
  await page.getByLabel("Canvas height", { exact: true }).press("Enter");
  await page.getByRole("tab", { name: "image", exact: true }).click();
  await page.getByRole("button", { name: "Reset to centered fit" }).click();
  await page.getByLabel("X offset", { exact: true }).fill("0.1");
  await page.getByLabel("X offset", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByText("Crop source bounds", { exact: true }).click();
  await page.getByLabel("Crop x", { exact: true }).fill("25");
  await page.getByLabel("Crop x", { exact: true }).press("Enter");
  await expect(page.getByLabel("Crop x", { exact: true })).toHaveValue("0");

  await page.getByRole("tab", { name: "lens", exact: true }).click();
  await page.getByLabel("Lens angle", { exact: true }).fill("30");
  await page.getByLabel("Lens angle", { exact: true }).press("Enter");
  await page.getByLabel("Invert depth · swap highs and lows").check();
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Interlaced artwork preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate print files" }).click();
  await expect(
    page.getByRole("heading", { name: "Your print files are ready." }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download bundle" }).click(),
  ]);
  const files = unzipSync(
    new Uint8Array(await readFile((await download.path())!)),
  );
  const art = PNG.sync.read(Buffer.from(files["lenticular-artwork.png"]));
  const depth = PNG.sync.read(Buffer.from(files["lenticular-depth.png"]), {
    skipRescale: true,
  });
  expect(art.width).toBe(283);
  expect(depth.width).toBe(283);
  expect(depth.depth).toBe(16);
  const alphaMatches = Array.from(
    { length: art.width * art.height },
    (_, i) => depth.data[i * 4 + 3] === art.data[i * 4 + 3] * 257,
  ).every(Boolean);
  expect(alphaMatches).toBe(true);
  expect(strFromU8(files["lenticular.yaml"])).toContain("angle: 30");
  await page.getByLabel("Open project YAML").setInputFiles({
    name: "project.yaml",
    mimeType: "application/yaml",
    buffer: Buffer.from(files["lenticular.yaml"]),
  });
  await expect(
    page.getByRole("heading", { name: "Restore project sources" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore project", exact: true })
    .click();
  await expect(
    page.getByText("Project restored.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("studio.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});

test("calibration, inversion preview, cancellation and oversized canvas remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Add source images")
    .setInputFiles([image("first.png"), image("second.png", true)]);
  await expect(page.getByText("2 images added locally.")).toBeVisible();
  await page.getByLabel("Paper preset").selectOption("A2");
  await expect(
    page.getByRole("button", { name: "Generate print files" }),
  ).toBeDisabled();
  await expect(page.getByText(/This canvas exceeds/)).toBeVisible();
  for (const label of ["Canvas width", "Canvas height"]) {
    await page.getByLabel(label, { exact: true }).fill("80");
    await page.getByLabel(label, { exact: true }).press("Enter");
  }
  await page.getByRole("button", { name: "Generate print files" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Cancelled");
  for (const label of ["Canvas width", "Canvas height"]) {
    await page.getByLabel(label, { exact: true }).fill("5");
    await page.getByLabel(label, { exact: true }).press("Enter");
  }
  await page.getByLabel("Print density").fill("144");
  await page.getByLabel("Print density").press("Enter");
  await page.getByRole("tab", { name: "lens", exact: true }).click();
  await page.getByLabel("Reverse view order").check();
  await page.getByRole("button", { name: "View order", exact: true }).click();
  await expect(page.locator(".stage img")).toHaveAttribute("alt", "second.png");
  await page
    .getByText("Calibration sheet", { exact: false })
    .filter({ has: page.locator("span") })
    .first()
    .click();
  await page.getByLabel("Sample width / height").fill("5");
  await page.getByLabel("Sample width / height").press("Enter");
  await expect(page.getByText(/Sheet: 23 × 38 mm/)).toBeVisible();
  await page
    .getByRole("button", { name: "Generate calibration sheet", exact: true })
    .click();
  await expect(
    page.getByText("Calibration sheet is ready.", { exact: true }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Sheet bundle" }).click(),
  ]);
  const files = unzipSync(
    new Uint8Array(await readFile((await download.path())!)),
  );
  const art = PNG.sync.read(Buffer.from(files["calibration-artwork.png"]));
  const depth = PNG.sync.read(Buffer.from(files["calibration-depth.png"]));
  expect(art.width).toBe(130);
  expect(art.height).toBe(215);
  expect(depth.width).toBe(art.width);
  expect(depth.height).toBe(art.height);
  expect(strFromU8(files["calibration-recipe.yaml"])).toContain("widthMm: 23");
  await page.getByLabel("Open project YAML").setInputFiles({
    name: "bad.yaml",
    mimeType: "application/yaml",
    buffer: Buffer.from("version: 800"),
  });
  await expect(page.getByRole("alert")).toContainText("Invalid project YAML");
  await expect(page.locator(".source-card")).toHaveCount(2);
});
