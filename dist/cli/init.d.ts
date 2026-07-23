import { type PackageManager } from "./package-manager.js";
import { type CliResult } from "./result.js";
import { type CommandRunner } from "./runner.js";
export type { CommandRunner } from "./runner.js";
export type InitOptions = {
    cwd?: string;
    gitRunner?: CommandRunner;
    installRunner?: CommandRunner;
};
export declare function handleInit(args: readonly string[], options?: InitOptions): CliResult;
export declare function formatInstallCommand(packageManager: PackageManager): {
    args: string[];
    command: string;
};
//# sourceMappingURL=init.d.ts.map