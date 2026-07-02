export type CliResult = {
  exitCode: number;
  stderr?: string;
  stdout?: string;
};

export function success(stdout: string): CliResult {
  return {
    exitCode: 0,
    stdout,
  };
}

export function failure(stderr: string): CliResult {
  return {
    exitCode: 1,
    stderr,
  };
}
