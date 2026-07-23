export type CliResult = {
    exitCode: number;
    stderr?: string;
    stdout?: string;
};
export declare function success(stdout: string): CliResult;
export declare function failure(stderr: string): CliResult;
//# sourceMappingURL=result.d.ts.map