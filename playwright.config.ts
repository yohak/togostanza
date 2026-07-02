import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test/browser",
  timeout: 10_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
