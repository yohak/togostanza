import { type PackageManager } from "./package-manager.js";
export type StanzaRepoContext = {
    dependencySpec: string;
    lockfilePath?: string;
    packageJsonPath: string;
    packageManager: PackageManager;
    packageName: string;
    rootDirectory: string;
    scripts: Record<string, string>;
};
export type StanzaRepoContextResult = {
    context: StanzaRepoContext;
} | {
    error: string;
};
export declare function resolveStanzaRepoContext(rootDirectory: string): StanzaRepoContextResult;
//# sourceMappingURL=repo-context.d.ts.map