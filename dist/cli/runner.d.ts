export type CommandRunOptions = {
    cwd: string;
};
export type CommandRunResult = {
    exitCode: number;
    stderr?: string;
};
export type CommandRunner = (command: string, args: readonly string[], options: CommandRunOptions) => CommandRunResult;
export declare const runCommand: CommandRunner;
//# sourceMappingURL=runner.d.ts.map