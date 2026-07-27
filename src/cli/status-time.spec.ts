import { describe, expect, it } from "vitest";
import { formatStatusTimestamp } from "./status-time.js";

describe("status time", () => {
  it("formats timestamps for CLI status messages", () => {
    expect(formatStatusTimestamp(new Date(2026, 0, 2, 3, 4, 5))).toBe("[2026-01-02 03:04]");
  });
});
