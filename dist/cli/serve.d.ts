import { type CliResult } from "./result.js";
export type ServeSession = {
    close(): Promise<void>;
    port: number;
};
export type ServeOptions = {
    cwd?: string;
    onServeSession?: (session: ServeSession) => void;
    progressOutput?: (message: string) => void;
    watch?: boolean;
};
export declare function handleServe(args: readonly string[], options?: ServeOptions): Promise<CliResult>;
//# sourceMappingURL=serve.d.ts.map