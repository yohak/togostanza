import { describe, expect, it } from "vitest";
import { formatPackageIdentity, packageName } from "./index.js";

describe("package identity", () => {
  it("uses the package name in the formatted identity", () => {
    expect(formatPackageIdentity("1.2.3")).toBe(`${packageName}@1.2.3`);
  });
});
