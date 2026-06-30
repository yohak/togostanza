export type CommandDefinition = {
  canonicalName: string;
  usage: string;
};

export type CommandMatch = {
  command: CommandDefinition;
  matchedLength: number;
};

export const commandDefinitions: readonly CommandDefinition[] = [
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

export function findCommand(args: readonly string[]): CommandMatch | undefined {
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

export function listCommandUsages(): string[] {
  return commandDefinitions.map((command) => command.usage);
}
