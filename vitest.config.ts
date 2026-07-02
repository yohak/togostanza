import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["src/test/**"],
    globals: false,
    include: ["src/**/*.spec.ts"],
  },
});
