export type CommandDefinition = {
    canonicalName: string;
    usage: string;
};
export type CommandMatch = {
    command: CommandDefinition;
    matchedLength: number;
};
export declare const commandDefinitions: readonly CommandDefinition[];
export declare function findCommand(args: readonly string[]): CommandMatch | undefined;
export declare function listCommandUsages(): string[];
//# sourceMappingURL=commands.d.ts.map