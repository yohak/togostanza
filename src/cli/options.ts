import { failure, type CliResult } from "./result.js";

export type OptionSpec = {
  kind: "boolean" | "value";
  name: string;
};

export type ParsedOptions = {
  options: Map<string, string | true>;
  positional: string[];
};

export type ParseOptionsResult =
  | {
      parsed: ParsedOptions;
    }
  | {
      error: CliResult;
    };

export function parseOptions(
  args: readonly string[],
  specs: readonly OptionSpec[],
): ParseOptionsResult {
  const parsed: ParsedOptions = {
    options: new Map(),
    positional: [],
  };
  const specsByName = new Map(specs.map((spec) => [spec.name, spec]));

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--")) {
      parsed.positional.push(arg);
      continue;
    }

    const spec = specsByName.get(arg);

    if (!spec) {
      return {
        error: failure(`Unknown option: ${arg}`),
      };
    }

    if (spec.kind === "boolean") {
      parsed.options.set(spec.name, true);
      continue;
    }

    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      return {
        error: failure(`Missing value for option: ${arg}`),
      };
    }

    parsed.options.set(spec.name, value);
    index += 1;
  }

  return { parsed };
}

export function getStringOption(parsed: ParsedOptions, name: string): string | undefined {
  const value = parsed.options.get(name);
  return typeof value === "string" ? value : undefined;
}

export function getBooleanOption(parsed: ParsedOptions, name: string): boolean {
  return parsed.options.get(name) === true;
}
