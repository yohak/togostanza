import { type CliResult } from "./result.js";
export type OptionSpec = {
    kind: "boolean" | "value";
    name: string;
};
export type ParsedOptions = {
    options: Map<string, string | true>;
    positional: string[];
};
export type ParseOptionsResult = {
    parsed: ParsedOptions;
} | {
    error: CliResult;
};
export declare function parseOptions(args: readonly string[], specs: readonly OptionSpec[]): ParseOptionsResult;
export declare function getStringOption(parsed: ParsedOptions, name: string): string | undefined;
export declare function getBooleanOption(parsed: ParsedOptions, name: string): boolean;
//# sourceMappingURL=options.d.ts.map