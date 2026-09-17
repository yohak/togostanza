import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfigFromFile } from "vite";
const configFileNames = ["togostanza.config.js", "togostanza.config.mjs", "togostanza.config.ts"];
const legacyConfigFileNames = ["togostanza-build.mjs", "togostanza-build.js"];
export async function loadTogoStanzaBuildConfig(rootDirectory) {
    const warnings = legacyConfigFileNames
        .filter((filename) => existsSync(join(rootDirectory, filename)))
        .map((filename) => `Warning: Legacy TogoStanza config ${filename} was found and was not executed. Rewrite supported settings in togostanza.config.js using the V4 config format.`);
    const configPaths = configFileNames
        .map((filename) => join(rootDirectory, filename))
        .filter((path) => existsSync(path));
    if (configPaths.length > 1) {
        return {
            error: `Invalid TogoStanza config: multiple config files found: ${configPaths.join(", ")}. Keep only one config file.`,
        };
    }
    const configPath = configPaths[0];
    if (!configPath) {
        return {
            config: {},
            warnings,
        };
    }
    try {
        // JS configs use ESM syntax without requiring a package-wide module type.
        // Preserve the existing bundled loader for TypeScript configs.
        const configLoader = configPath.endsWith(".ts") ? "bundle" : "runner";
        const loaded = await loadConfigFromFile({
            command: "build",
            mode: "production",
        }, configPath, rootDirectory, "silent", undefined, configLoader);
        if (!loaded) {
            return {
                error: `Invalid TogoStanza config: failed to load ${configPath}.`,
            };
        }
        if (!isRecord(loaded.config)) {
            return {
                error: `Invalid TogoStanza config: expected an object at ${configPath}.`,
            };
        }
        return {
            config: loaded.config,
            configPath: loaded.path,
            warnings,
        };
    }
    catch (error) {
        return {
            error: `Invalid TogoStanza config: failed to load ${configPath}: ${errorMessage(error)}.`,
        };
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=build-config.js.map