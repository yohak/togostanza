import { defineConfig } from "oxfmt";

export default defineConfig({
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
    "**/*.hbs",
    "**/*.md",
  ],
  sortImports: {
    newlinesBetween: false,
  },
});
