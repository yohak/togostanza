import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePackageManager, type PackageManager } from "./package-manager.js";

export type StanzaRepoContext = {
  dependencySpec: string;
  lockfilePath?: string;
  packageJsonPath: string;
  packageManager: PackageManager;
  packageName: string;
  rootDirectory: string;
  scripts: Record<string, string>;
};

export type StanzaRepoContextResult =
  | {
      context: StanzaRepoContext;
    }
  | {
      error: string;
    };

export function resolveStanzaRepoContext(rootDirectory: string): StanzaRepoContextResult {
  const packageJsonPath = join(rootDirectory, "package.json");
  const packageJsonResult = readPackageJson(packageJsonPath);

  if ("error" in packageJsonResult) {
    return packageJsonResult;
  }

  const packageJson = packageJsonResult.value;
  const packageName = readStringProperty(packageJson, "name");

  if (!packageName) {
    return {
      error: `Invalid Stanza repository package.json: name must be a string at ${packageJsonPath}.`,
    };
  }

  const dependencySpec =
    readDependencySpec(packageJson, "dependencies") ??
    readDependencySpec(packageJson, "devDependencies");

  if (!dependencySpec) {
    return {
      error: `Not a Stanza repository: package.json must declare dependencies.togostanza or devDependencies.togostanza at ${packageJsonPath}.`,
    };
  }

  const packageManagerResult = resolvePackageManager({
    rootDirectory,
    useLockfile: true,
  });

  if ("error" in packageManagerResult) {
    return packageManagerResult;
  }

  return {
    context: withOptionalLockfilePath({
      dependencySpec,
      lockfilePath: packageManagerResult.lockfilePath,
      packageJsonPath,
      packageManager: packageManagerResult.packageManager,
      packageName,
      rootDirectory,
      scripts: readPackageScripts(packageJson),
    }),
  };
}

function readPackageJson(packageJsonPath: string):
  | {
      value: Record<string, unknown>;
    }
  | {
      error: string;
    } {
  let raw: string;

  try {
    raw = readFileSync(packageJsonPath, "utf8");
  } catch (error) {
    if (isFileNotFound(error)) {
      return {
        error: `Not a Stanza repository: missing package.json at ${packageJsonPath}.`,
      };
    }

    throw error;
  }

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        error: `Invalid Stanza repository package.json: malformed JSON at ${packageJsonPath}.`,
      };
    }

    throw error;
  }

  if (!isRecord(value)) {
    return {
      error: `Invalid Stanza repository package.json: expected an object at ${packageJsonPath}.`,
    };
  }

  return { value };
}

function readDependencySpec(
  packageJson: Record<string, unknown>,
  dependencyField: "dependencies" | "devDependencies",
): string | undefined {
  const dependencies = packageJson[dependencyField];

  if (!isRecord(dependencies)) {
    return undefined;
  }

  const dependencySpec = dependencies.togostanza;
  return typeof dependencySpec === "string" ? dependencySpec : undefined;
}

function readStringProperty(
  value: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const propertyValue = value[propertyName];
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function readPackageScripts(packageJson: Record<string, unknown>): Record<string, string> {
  const scripts = packageJson.scripts;

  if (!isRecord(scripts)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command === "string") {
      result[name] = command;
    }
  }

  return result;
}

function withOptionalLockfilePath(input: {
  dependencySpec: string;
  lockfilePath: string | undefined;
  packageJsonPath: string;
  packageManager: PackageManager;
  packageName: string;
  rootDirectory: string;
  scripts: Record<string, string>;
}): StanzaRepoContext {
  if (input.lockfilePath) {
    return {
      dependencySpec: input.dependencySpec,
      lockfilePath: input.lockfilePath,
      packageJsonPath: input.packageJsonPath,
      packageManager: input.packageManager,
      packageName: input.packageName,
      rootDirectory: input.rootDirectory,
      scripts: input.scripts,
    };
  }

  return {
    dependencySpec: input.dependencySpec,
    packageJsonPath: input.packageJsonPath,
    packageManager: input.packageManager,
    packageName: input.packageName,
    rootDirectory: input.rootDirectory,
    scripts: input.scripts,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
