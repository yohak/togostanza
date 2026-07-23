import { statSync } from "node:fs";
import { join } from "node:path";
export function resolvePackageManager(options = {}) {
    const rawExplicitPackageManager = options.explicitPackageManager;
    let explicitPackageManager;
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
function detectPackageManagerLockfile(rootDirectory) {
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
function isPackageManager(value) {
    return value === "npm" || value === "pnpm";
}
function pathIsFile(path) {
    try {
        return statSync(path).isFile();
    }
    catch (error) {
        if (isFileNotFound(error)) {
            return false;
        }
        throw error;
    }
}
function withOptionalLockfilePath(input) {
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
function isFileNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
//# sourceMappingURL=package-manager.js.map