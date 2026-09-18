import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatPackageIdentity, packageMetadata, packageName } from "./index.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  description?: string;
  exports?: {
    "./config"?: {
      default?: string;
      import?: string;
      types?: string;
    };
    "./stanza"?: {
      default?: string;
      import?: string;
      types?: string;
    };
  };
  files?: string[];
  keywords?: string[];
  license?: string;
  name: string;
  private?: boolean;
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

  it("exports the public Stanza base class subpath used by Stanza source", () => {
    expect(packageJson.exports?.["./stanza"]).toEqual({
      default: "./dist/stanza.js",
      import: "./dist/stanza.js",
      types: "./dist/stanza.d.ts",
    });
  });

  it("limits packed files to the executable and compiled distribution", () => {
    expect(packageJson.files).toEqual(["bin/", "dist/"]);
  });

  it("declares the alpha package metadata without enabling npm publication", () => {
    expect(packageJson).toMatchObject({
      description: "CLI and runtime for building TogoStanza repositories.",
      license: "MIT",
      private: true,
      version: "4.0.0-alpha.2",
    });
    expect(packageJson.keywords).toContain("togostanza");
    expect(packageJson.keywords).toContain("stanza");
  });
});
