export const commandDefinitions = [
    {
        canonicalName: "init",
        usage: "init",
    },
    {
        canonicalName: "generate stanza",
        usage: "generate stanza",
    },
    {
        canonicalName: "generate stanza",
        usage: "g stanza",
    },
    {
        canonicalName: "build",
        usage: "build",
    },
    {
        canonicalName: "build",
        usage: "b",
    },
    {
        canonicalName: "serve",
        usage: "serve",
    },
    {
        canonicalName: "serve",
        usage: "s",
    },
];
export function findCommand(args) {
    const command = commandDefinitions.find((definition) => {
        const parts = definition.usage.split(" ");
        return parts.every((part, index) => args[index] === part);
    });
    if (!command) {
        return undefined;
    }
    return {
        command,
        matchedLength: command.usage.split(" ").length,
    };
}
export function listCommandUsages() {
    return commandDefinitions.map((command) => command.usage);
}
//# sourceMappingURL=commands.js.map