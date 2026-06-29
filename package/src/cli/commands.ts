export type CommandDefinition = {
  canonicalName: string;
  usage: string;
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

export function findCommand(args: readonly string[]): CommandDefinition | undefined {
  return commandDefinitions.find((command) => {
    const parts = command.usage.split(" ");
    return parts.every((part, index) => args[index] === part);
  });
}
