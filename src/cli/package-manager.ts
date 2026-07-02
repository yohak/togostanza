import { statSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm";

export type PackageManagerResolution =
  | {
      lockfilePath?: string;
      packageManager: PackageManager;
    }
  | {
      error: string;
    };

export type ResolvePackageManagerOptions = {
  explicitPackageManager?: string;
  rootDirectory?: string;
  useLockfile?: boolean;
  userAgent?: string;
};

export function resolvePackageManager(
  options: ResolvePackageManagerOptions = {},
): PackageManagerResolution {
  const rawExplicitPackageManager = options.explicitPackageManager;
  let explicitPackageManager: PackageManager | undefined;

  if (rawExplicitPackageManager) {
    if (!isPackageManager(rawExplicitPackageManager)) {
      return {
        error: "Invalid package manager. Expected npm or pnpm.",
      };
    }

    explicitPackageManager = rawExplicitPackageManager;
  }

  const lockfile = options.useLockfile
    ? detectPackageManagerLockfile(options.rootDirectory)
    : undefined;

  if (lockfile && "error" in lockfile) {
    return lockfile;
  }

  if (explicitPackageManager) {
    if (lockfile && lockfile.packageManager !== explicitPackageManager) {
      return {
        error: `--package-manager ${explicitPackageManager} conflicts with existing ${lockfile.fileName}.`,
      };
    }

    return withOptionalLockfilePath({
      lockfilePath: lockfile?.path,
      packageManager: explicitPackageManager,
    });
  }

  if (lockfile) {
    return {
      lockfilePath: lockfile.path,
      packageManager: lockfile.packageManager,
    };
  }

  const userAgent = options.userAgent ?? process.env.npm_config_user_agent;

  if (userAgent?.startsWith("pnpm/")) {
    return {
      packageManager: "pnpm",
    };
  }

  if (userAgent?.startsWith("npm/")) {
    return {
      packageManager: "npm",
    };
  }

  return {
    packageManager: "npm",
  };
}

function detectPackageManagerLockfile(rootDirectory: string | undefined):
  | {
      fileName: string;
      packageManager: PackageManager;
      path: string;
    }
  | {
      error: string;
    }
  | undefined {
  if (!rootDirectory) {
    return undefined;
  }

  const npmLockfilePath = join(rootDirectory, "package-lock.json");
  const pnpmLockfilePath = join(rootDirectory, "pnpm-lock.yaml");
  const hasNpmLockfile = pathIsFile(npmLockfilePath);
  const hasPnpmLockfile = pathIsFile(pnpmLockfilePath);

  if (hasNpmLockfile && hasPnpmLockfile) {
    return {
      error: "Conflicting lockfiles found: package-lock.json and pnpm-lock.yaml.",
    };
  }

  if (hasNpmLockfile) {
    return {
      fileName: "package-lock.json",
      packageManager: "npm",
      path: npmLockfilePath,
    };
  }

  if (hasPnpmLockfile) {
    return {
      fileName: "pnpm-lock.yaml",
      packageManager: "pnpm",
      path: pnpmLockfilePath,
    };
  }

  return undefined;
}

function isPackageManager(value: string): value is PackageManager {
  return value === "npm" || value === "pnpm";
}

function pathIsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function withOptionalLockfilePath(input: {
  lockfilePath: string | undefined;
  packageManager: PackageManager;
}): PackageManagerResolution {
  if (input.lockfilePath) {
    return {
      lockfilePath: input.lockfilePath,
      packageManager: input.packageManager,
    };
  }

  return {
    packageManager: input.packageManager,
  };
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
