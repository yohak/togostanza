import type { PackageManager } from "./package-manager.js";
export type PackageScripts = Readonly<Record<string, string>>;
export declare function formatPackageScriptCommand(packageManager: PackageManager, scriptName: string): string;
export declare function formatPackageExecCommand(packageManager: PackageManager, commandName: string): string;
export declare function formatTogoStanzaCommand(input: {
    commandName: "build" | "serve";
    packageManager: PackageManager;
    scripts: PackageScripts;
}): string;
//# sourceMappingURL=package-command.d.ts.map