import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  ignorePatterns: [
    "coverage",
    "dist",
    "docs",
    "node_modules",
    "playwright-report",
    "references",
    "sandbox",
    "test-results",
    "workbench",
  ],
});
