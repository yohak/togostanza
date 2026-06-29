import { routeCli } from "./router.js";

export type CliOutput = {
  stderr(message: string): void;
  stdout(message: string): void;
};

const consoleOutput: CliOutput = {
  stderr: console.error,
  stdout: console.log,
};

export function runCli(args = process.argv.slice(2), output = consoleOutput): number {
  const result = routeCli(args);

  if (result.stdout) {
    output.stdout(result.stdout);
  }

  if (result.stderr) {
    output.stderr(result.stderr);
  }

  return result.exitCode;
}
