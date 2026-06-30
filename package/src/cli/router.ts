import { formatPackageIdentity } from "../index.js";
import { findCommand, listCommandUsages, type CommandDefinition } from "./commands.js";
import { handleGenerateStanza } from "./generate-stanza.js";
import { handleInit, type CommandRunner } from "./init.js";
import { failure, success, type CliResult } from "./result.js";

export type CliRouteOptions = {
  cwd?: string;
  currentDate?: Date;
  gitRunner?: CommandRunner;
  installRunner?: CommandRunner;
};

export function routeCli(args: readonly string[], options: CliRouteOptions = {}): CliResult {
  const [firstArg] = args;

  if (!firstArg || firstArg === "--help") {
    return success(formatHelpText());
  }

  if (firstArg === "--version" || firstArg === "-v") {
    return success(formatPackageIdentity());
  }

  if (firstArg.startsWith("-")) {
    return failure(`Unknown option: ${firstArg}`);
  }

  const match = findCommand(args);

  if (!match) {
    return failure(`Unknown command: ${args.join(" ")}`);
  }

  const commandArgs = args.slice(match.matchedLength);

  return routeCommand(match.command, commandArgs, options);
}

function routeCommand(
  command: CommandDefinition,
  args: readonly string[],
  options: CliRouteOptions,
): CliResult {
  if (command.canonicalName === "init") {
    return handleInit(args, options);
  }

  if (command.canonicalName === "generate stanza") {
    return handleGenerateStanza(args, options);
  }

  return failure(`Command is not implemented yet: ${command.canonicalName}`);
}

function formatHelpText(): string {
  const commandLines = listCommandUsages().map((usage) => `  ${usage}`);

  return [
    "Usage: togostanza [command]",
    "",
    "Commands:",
    ...commandLines,
    "",
    "Global options:",
    "  --help",
    "  --version",
    "  -v",
  ].join("\n");
}
