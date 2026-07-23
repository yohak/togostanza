import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfigFromFile } from "vite";
const configFileName = "togostanza.config.ts";
const legacyConfigFileNames = ["togostanza-build.mjs", "togostanza-build.js"];
export async function loadTogoStanzaBuildConfig(rootDirectory) {
    const warnings = legacyConfigFileNames
        .filter((filename) => existsSync(join(rootDirectory, filename)))
        .map((filename) => `Warning: Legacy TogoStanza config ${filename} was found and was not executed. Move supported settings to ${configFileName}.`);
    const configPath = join(rootDirectory, configFileName);
    if (!existsSync(configPath)) {
        return {
            config: {},
            warnings,
        };
    }
    try {
        const loaded = await loadConfigFromFile({
            command: "build",
            mode: "production",
        }, configPath, rootDirectory, "silent");
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