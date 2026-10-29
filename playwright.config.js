// End-to-end + visual regression tests. Run with: npm run test:e2e
// First time on a new computer: npx playwright install chromium
//                                npm run test:e2e:update   (creates screenshot baselines)
const { defineConfig, devices } = require("@playwright/test");

const PORT = 5055;

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    timezoneId: "America/Chicago",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && node server/index.js`,
    url: `http://localhost:${PORT}/api/health`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
