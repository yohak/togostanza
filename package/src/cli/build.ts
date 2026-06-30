import { getStringOption, parseOptions } from "./options.js";
import { resolveStanzaRepoContext } from "./repo-context.js";
import { failure, type CliResult } from "./result.js";

export type BuildOptions = {
  cwd?: string;
};

export function handleBuild(args: readonly string[], options: BuildOptions = {}): CliResult {
  const parsedResult = parseOptions(args, [{ kind: "value", name: "--output-path" }]);

  if ("error" in parsedResult) {
    return parsedResult.error;
  }

  const { parsed } = parsedResult;

  if (parsed.positional.length > 0) {
    return failure(`Unexpected argument: ${parsed.positional[0]}`);
  }

  const rootDirectory = options.cwd ?? process.cwd();
  const repoContextResult = resolveStanzaRepoContext(rootDirectory);

  if ("error" in repoContextResult) {
    return failure(repoContextResult.error);
  }

  const outputPath = getStringOption(parsed, "--output-path") ?? "dist";

  return failure(
    `Build is not implemented yet for Stanza repository: ${repoContextResult.context.packageName} (output: ${outputPath}).`,
  );
}
