import type { TogoStanzaConfig } from "../config.js";
export type BuildConfigLoadResult = {
    config: TogoStanzaConfig;
    configPath?: string;
    warnings: string[];
} | {
    error: string;
};
export declare function loadTogoStanzaBuildConfig(rootDirectory: string): Promise<BuildConfigLoadResult>;
//# sourceMappingURL=build-config.d.ts.map