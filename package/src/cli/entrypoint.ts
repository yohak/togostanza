import { routeCli } from "./router.js";
import type { CliRouteOptions } from "./router.js";

export type CliOutput = {
  stderr(message: string): void;
  stdout(message: string): void;
};

const consoleOutput: CliOutput = {
  stderr: console.error,
  stdout: console.log,
};

export function runCli(
  args = process.argv.slice(2),
  output = consoleOutput,
  options: CliRouteOptions = {},
): number {
  const result = routeCli(args, options);

  if (result.stdout) {
    output.stdout(result.stdout);
  }

  if (result.stderr) {
    output.stderr(result.stderr);
  }

  return result.exitCode;
}
