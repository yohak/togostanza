import { type CommandRunner } from "./init.js";
import { type CliResult } from "./result.js";
import { type ServeSession } from "./serve.js";
export type MaybePromise<T> = Promise<T> | T;
export type CliRouteOptions = {
    cwd?: string;
    currentDate?: Date;
    gitRunner?: CommandRunner;
    installRunner?: CommandRunner;
    onServeSession?: (session: ServeSession) => void;
    serveWatch?: boolean;
};
export declare function routeCli(args: readonly string[], options?: CliRouteOptions): MaybePromise<CliResult>;
//# sourceMappingURL=router.d.ts.map