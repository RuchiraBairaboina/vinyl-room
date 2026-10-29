// End-to-end tests for the Vinyl Room. Spotify is mocked (see mockSpotify.js).
const { test, expect } = require("@playwright/test");
const { mockSpotify, RECORDS } = require("./mockSpotify");

const MORNING = new Date("2026-10-29T10:00:00-05:00");
const DEFAULT_PALETTE = "#F7B5C8,#B8A4EC,#FFD79A";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MORNING);
});

async function openRoom(page, opts) {
  await mockSpotify(page, opts);
  await page.goto("/");
  await expect(page.getByTestId("crate")).toBeVisible();
}

test.describe("the room", () => {
  test("loads the crate and puts the first record on the turntable", async ({ page }) => {
    await openRoom(page);
    const sleeves = page.getByTestId("crate").getByRole("button", { name: /turntable/ });
    await expect(sleeves).toHaveCount(2);
    await expect(sleeves.first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("turntable")).toHaveAttribute("aria-label", "Play Sunset Tapes");
    await expect(page.getByRole("heading", { name: "Sunset Tapes" })).toBeVisible();
    await expect(page.getByTestId("poster").locator("image")).toHaveAttribute("href", RECORDS.sunset.cover);
  });

  test("lights the room with colors from the album cover", async ({ page }) => {
    await openRoom(page);
    const app = page.locator(".app");
    await expect(app).not.toHaveAttribute("data-palette", DEFAULT_PALETTE);
    const sunsetPalette = await app.getAttribute("data-palette");

    await page.getByRole("button", { name: /Ocean Hours/ }).click();
    await expect(app).not.toHaveAttribute("data-palette", sunsetPalette);
  });

  test("tapping the turntable spins the record and wakes the cat", async ({ page }) => {
    await openRoom(page);
    const room = page.locator("svg.room");
    const turntable = page.getByTestId("turntable");

    await expect(room).toHaveAttribute("data-playing", "false");
    await turntable.click();
    await expect(room).toHaveAttribute("data-playing", "true");
    await expect(turntable).toHaveAttribute("aria-pressed", "true");
    await expect(turntable).toHaveAttribute("aria-label", "Pause Sunset Tapes");
    await expect(room.locator(".eyes-happy")).toHaveCSS("opacity", "1");

    await turntable.click();
    await expect(room).toHaveAttribute("data-playing", "false");
    await expect(room.locator(".eyes-sleep")).toHaveCSS("opacity", "1");
  });

  test("the turntable works from the keyboard", async ({ page }) => {
    await openRoom(page);
    await page.getByTestId("turntable").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("svg.room")).toHaveAttribute("data-playing", "true");
    await page.keyboard.press(" ");
    await expect(page.locator("svg.room")).toHaveAttribute("data-playing", "false");
  });

  test("switching records stops the current one", async ({ page }) => {
    await openRoom(page);
    await page.getByTestId("turntable").click();
    await page.getByRole("button", { name: /Ocean Hours/ }).click();
    await expect(page.locator("svg.room")).toHaveAttribute("data-playing", "false");
    await expect(page.getByTestId("turntable")).toHaveAttribute("aria-label", "Play Ocean Hours");
  });

  test("the window cycles morning → dusk → night → morning", async ({ page }) => {
    await openRoom(page);
    const room = page.locator("svg.room");
    const win = page.getByTestId("window");
    await expect(room).toHaveAttribute("data-theme", "morning");
    for (const next of ["dusk", "night", "morning"]) {
      await win.click();
      await expect(room).toHaveAttribute("data-theme", next);
    }
  });

  test("petting the cat shows a heart", async ({ page }) => {
    await openRoom(page);
    await page.getByTestId("cat").click();
    await expect(page.getByTestId("cat").locator(".heart")).toHaveCount(1);
  });

  test("explains when the Spotify player is blocked", async ({ page }) => {
    await openRoom(page);
    await expect(page.getByText(/Spotify player couldn't load/)).toBeVisible();
    await expect(page.getByRole("link", { name: "open it in Spotify" })).toHaveAttribute("href", RECORDS.sunset.url);
  });
});

test.describe("adding records", () => {
  test("adds a record from a Spotify link and remembers it after reload", async ({ page }) => {
    await openRoom(page);
    await page.getByLabel("Add a record").fill(`${RECORDS.meadow.url}?si=abc`);
    await page.getByRole("button", { name: "Add to crate" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Added Meadow Mix" })).toBeVisible();
    await expect(page.getByRole("button", { name: "On the turntable: Meadow Mix" })).toBeVisible();
    await expect(page.getByLabel("Add a record")).toHaveValue("");

    await page.reload();
    await expect(page.getByRole("button", { name: "On the turntable: Meadow Mix" })).toBeVisible();

    await page.getByRole("button", { name: "Remove Meadow Mix from your crate" }).click();
    await expect(page.getByRole("button", { name: /Meadow Mix/ })).toHaveCount(0);
  });

  test("adding a record that's already in the crate just plays it", async ({ page }) => {
    await openRoom(page);
    await page.getByLabel("Add a record").fill(RECORDS.ocean.url);
    await page.getByRole("button", { name: "Add to crate" }).click();
    await expect(page.getByText("Ocean Hours is already in the crate.", { exact: false })).toBeVisible();
    await expect(page.getByTestId("crate").getByRole("button", { name: /turntable/ })).toHaveCount(2);
    await expect(page.getByTestId("turntable")).toHaveAttribute("aria-label", "Play Ocean Hours");
  });

  for (const [label, input, message] of [
    ["an empty link", "", "Paste a Spotify link first"],
    ["a non-Spotify link", "https://youtube.com/watch?v=abc", "doesn't look like a Spotify"],
    ["a Spotify link that doesn't exist", "https://open.spotify.com/album/9999999999999999999999", "couldn't find that link"],
  ]) {
    test(`shows a helpful error for ${label}`, async ({ page }) => {
      await openRoom(page);
      await page.getByLabel("Add a record").fill(input);
      await page.getByRole("button", { name: "Add to crate" }).click();
      await expect(page.getByText(message, { exact: false })).toBeVisible();
      await expect(page.getByLabel("Add a record")).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByTestId("crate").getByRole("button", { name: /turntable/ })).toHaveCount(2);
    });
  }

  test("shows an inviting empty state when the crate is empty", async ({ page }) => {
    await mockSpotify(page, { crate: [] });
    await page.goto("/");
    await expect(page.getByTestId("crate-empty")).toContainText("The crate is empty");
    await expect(page.getByRole("heading", { name: "Nothing on the turntable yet" })).toBeVisible();
  });
});

test.describe("visual regression", () => {
  for (const theme of ["morning", "dusk", "night"]) {
    test(`room at ${theme}`, async ({ page }) => {
      await openRoom(page);
      const room = page.locator("svg.room");
      while ((await room.getAttribute("data-theme")) !== theme) await page.getByTestId("window").click();
      await expect(page.locator(".app")).not.toHaveAttribute("data-palette", DEFAULT_PALETTE);
      await page.waitForTimeout(1600); // let color transitions settle
      await expect(page.locator(".stage")).toHaveScreenshot(`room-${theme}.png`);
    });
  }

  test("room while a record is playing", async ({ page }) => {
    await openRoom(page);
    await page.getByTestId("turntable").click();
    await page.waitForTimeout(1600);
    await expect(page.locator(".stage")).toHaveScreenshot("room-playing.png");
  });

  test("full page", async ({ page }) => {
    await openRoom(page);
    await page.waitForTimeout(1600);
    await expect(page).toHaveScreenshot("full-page.png", { fullPage: true, mask: [page.locator(".player__note")] });
  });
});
