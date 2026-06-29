import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
    "**/*.hbs",
    "**/*.md",
  ],
  sortImports: {
    newlinesBetween: false,
  },
});
