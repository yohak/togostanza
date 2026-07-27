import { type CliResult } from "./result.js";
export type BuildOptions = {
    confirmCleanOutput?: ConfirmCleanOutput;
    cwd?: string;
};
export type ConfirmCleanOutput = (input: {
    outputDirectory: string;
    warning: string;
}) => boolean | Promise<boolean>;
export type StanzaDefinition = {
    definition?: string;
    directory: string;
    entrypointPath: string;
    id: string;
    label: string;
    metadata: Record<string, unknown>;
    metadataPath: string;
    templates: Record<string, string>;
};
export type BuildStanzaArtifactsInput = {
    allowUnmarkedOutputDirectory?: boolean;
    confirmCleanOutput?: ConfirmCleanOutput;
    outputDirectory: string;
    prepareOutputDirectory?: boolean;
    rootDirectory: string;
    stanzaIds?: readonly string[];
};
export type BuildStanzaArtifactsResult = {
    allStanzas: StanzaDefinition[];
    builtStanzas: StanzaDefinition[];
    warnings: string[];
} | {
    error: string;
};
export declare function handleBuild(args: readonly string[], options?: BuildOptions): Promise<CliResult>;
export declare function buildStanzaArtifacts(input: BuildStanzaArtifactsInput): Promise<BuildStanzaArtifactsResult>;
//# sourceMappingURL=build.d.ts.map