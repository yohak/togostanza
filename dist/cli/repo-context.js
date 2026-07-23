import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePackageManager } from "./package-manager.js";
export function resolveStanzaRepoContext(rootDirectory) {
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
    const dependencySpec = readDependencySpec(packageJson, "dependencies") ??
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
        }),
    };
}
function readPackageJson(packageJsonPath) {
    let raw;
    try {
        raw = readFileSync(packageJsonPath, "utf8");
    }
    catch (error) {
        if (isFileNotFound(error)) {
            return {
                error: `Not a Stanza repository: missing package.json at ${packageJsonPath}.`,
            };
        }
        throw error;
    }
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch (error) {
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
function readDependencySpec(packageJson, dependencyField) {
    const dependencies = packageJson[dependencyField];
    if (!isRecord(dependencies)) {
        return undefined;
    }
    const dependencySpec = dependencies.togostanza;
    return typeof dependencySpec === "string" ? dependencySpec : undefined;
}
function readStringProperty(value, propertyName) {
    const propertyValue = value[propertyName];
    return typeof propertyValue === "string" ? propertyValue : undefined;
}
function withOptionalLockfilePath(input) {
    if (input.lockfilePath) {
        return {
            dependencySpec: input.dependencySpec,
            lockfilePath: input.lockfilePath,
            packageJsonPath: input.packageJsonPath,
            packageManager: input.packageManager,
            packageName: input.packageName,
            rootDirectory: input.rootDirectory,
        };
    }
    return {
        dependencySpec: input.dependencySpec,
        packageJsonPath: input.packageJsonPath,
        packageManager: input.packageManager,
        packageName: input.packageName,
        rootDirectory: input.rootDirectory,
    };
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFileNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
//# sourceMappingURL=repo-context.js.map