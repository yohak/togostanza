import { formatPackageIdentity } from "../index.js";
import { findCommand, listCommandUsages } from "./commands.js";
import { failure, success, type CliResult } from "./result.js";

export function routeCli(args: readonly string[]): CliResult {
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

  const command = findCommand(args);

  if (!command) {
    return failure(`Unknown command: ${args.join(" ")}`);
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
