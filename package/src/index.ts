import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type PackageMetadata = {
  name: string;
  version: string;
};

export const packageMetadata = readPackageMetadata();
export const packageName = packageMetadata.name;

export function formatPackageIdentity(metadata: PackageMetadata = packageMetadata): string {
  return `${metadata.name}@${metadata.version}`;
}

export function readPackageMetadata(startUrl = import.meta.url): PackageMetadata {
  let currentDirectory = dirname(fileURLToPath(startUrl));

  while (true) {
    const packageJsonPath = join(currentDirectory, "package.json");

    try {
      const metadata = parsePackageMetadata(packageJsonPath);

      if (metadata) {
        return metadata;
      }
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  throw new Error("Could not find package.json for togostanza CLI.");
}

function parsePackageMetadata(packageJsonPath: string): PackageMetadata | undefined {
  const value: unknown = JSON.parse(readTextFile(packageJsonPath));

  if (!isObject(value)) {
    return undefined;
  }

  const { name, version } = value;

  if (typeof name !== "string" || typeof version !== "string") {
    return undefined;
  }

  return { name, version };
}

function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

function isObject(value: unknown): value is { name?: unknown; version?: unknown } {
  return typeof value === "object" && value !== null;
}

function isFileNotFound(error: unknown): boolean {
  return isObjectWithCode(error) && error.code === "ENOENT";
}

function isObjectWithCode(error: unknown): error is { code: unknown } {
  return typeof error === "object" && error !== null && "code" in error;
}
