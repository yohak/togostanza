import { spawnSync } from "node:child_process";

export type CommandRunOptions = {
  cwd: string;
};

export type CommandRunResult = {
  exitCode: number;
  stderr?: string;
};

export type CommandRunner = (
  command: string,
  args: readonly string[],
  options: CommandRunOptions,
) => CommandRunResult;

export const runCommand: CommandRunner = (command, args, options) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
  });

  if (result.error) {
    return {
      exitCode: 1,
      stderr: result.error.message,
    };
  }

  const exitCode = result.status ?? 1;

  if (result.stderr) {
    return {
      exitCode,
      stderr: result.stderr,
    };
  }

  return {
    exitCode,
  };
};
