import type { CliRouteOptions } from "./router.js";
export type CliOutput = {
    stderr(message: string): void;
    stdout(message: string): void;
};
export declare function runCli(args?: string[], output?: CliOutput, options?: CliRouteOptions): Promise<number>;
//# sourceMappingURL=entrypoint.d.ts.map