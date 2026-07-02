import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/test/integration/**/*.integration.spec.ts"],
    testTimeout: 10_000,
  },
});
