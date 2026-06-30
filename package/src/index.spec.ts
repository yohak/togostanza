import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatPackageIdentity, packageMetadata, packageName } from "./index.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  exports?: {
    "./config"?: {
      default?: string;
      import?: string;
      types?: string;
    };
  };
  name: string;
  version: string;
};

describe("package identity", () => {
  it("uses the package name in the formatted identity", () => {
    expect(formatPackageIdentity({ name: "example", version: "1.2.3" })).toBe("example@1.2.3");
  });

  it("reads package metadata from package.json", () => {
    expect(packageMetadata).toEqual({
      name: packageJson.name,
      version: packageJson.version,
    });
    expect(packageName).toBe(packageJson.name);
  });

  it("exports the config helper subpath used by togostanza.config.ts", () => {
    expect(packageJson.exports?.["./config"]).toEqual({
      default: "./dist/config.js",
      import: "./dist/config.js",
      types: "./dist/config.d.ts",
    });
  });
});
