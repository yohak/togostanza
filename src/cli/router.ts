import { formatPackageIdentity } from "../index.js";
import { handleBuild, type ConfirmCleanOutput } from "./build.js";
import { findCommand, listCommandUsages, type CommandDefinition } from "./commands.js";
import { handleGenerateStanza } from "./generate-stanza.js";
import { handleInit, type CommandRunner } from "./init.js";
import { failure, success, type CliResult } from "./result.js";
import { handleServe, type ServeSession } from "./serve.js";

export type MaybePromise<T> = Promise<T> | T;

export type CliRouteOptions = {
  confirmCleanOutput?: ConfirmCleanOutput;
  cwd?: string;
  currentDate?: Date;
  gitRunner?: CommandRunner;
  installRunner?: CommandRunner;
  onServeSession?: (session: ServeSession) => void;
  progressOutput?: (message: string) => void;
  serveWatch?: boolean;
};

export function routeCli(
  args: readonly string[],
  options: CliRouteOptions = {},
): MaybePromise<CliResult> {
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
): MaybePromise<CliResult> {
  if (command.canonicalName === "init") {
    return handleInit(args, options);
  }

  if (command.canonicalName === "generate stanza") {
    return handleGenerateStanza(args, options);
  }

  if (command.canonicalName === "build") {
    return handleBuild(args, withBuildOptions(options));
  }

  if (command.canonicalName === "serve") {
    return handleServe(args, withServeOptions(options));
  }

  return failure(`Command is not implemented yet: ${command.canonicalName}`);
}

function withBuildOptions(options: CliRouteOptions): Parameters<typeof handleBuild>[1] {
  return {
    ...(options.confirmCleanOutput ? { confirmCleanOutput: options.confirmCleanOutput } : {}),
    ...(options.cwd ? { cwd: options.cwd } : {}),
  };
}

function withServeOptions(options: CliRouteOptions): Parameters<typeof handleServe>[1] {
  return {
    ...(options.cwd ? { cwd: options.cwd } : {}),
    ...(options.onServeSession ? { onServeSession: options.onServeSession } : {}),
    ...(options.progressOutput ? { progressOutput: options.progressOutput } : {}),
    ...(typeof options.serveWatch === "boolean" ? { watch: options.serveWatch } : {}),
  };
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
