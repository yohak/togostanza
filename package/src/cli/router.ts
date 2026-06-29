import { formatPackageIdentity } from "../index.js";
import { commandDefinitions, findCommand } from "./commands.js";
import { failure, success, type CliResult } from "./result.js";

const helpText = `Usage: togostanza [command]

Commands:
  init
  generate stanza
  g stanza
  build
  b
  serve
  s

Global options:
  --help
  --version
  -v`;

export function routeCli(args: readonly string[]): CliResult {
  const [firstArg] = args;

  if (!firstArg || firstArg === "--help") {
    return success(helpText);
  }

  if (firstArg === "--version" || firstArg === "-v") {
    return success(formatPackageIdentity());
  }

  if (firstArg.startsWith("-")) {
    return failure(`Unknown option: ${firstArg}`);
  }

  const command = findCommand(args);

  if (!command) {
    return failure(`Unknown command: ${args.join(" ")}`);
  }

  return failure(`Command is not implemented yet: ${command.canonicalName}`);
}

export function listCommandUsages(): string[] {
  return commandDefinitions.map((command) => command.usage);
}
