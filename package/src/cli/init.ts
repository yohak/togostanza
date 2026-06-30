import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { packageMetadata } from "../index.js";
import { getBooleanOption, getStringOption, parseOptions } from "./options.js";
import { failure, success, type CliResult } from "./result.js";
import { runCommand, type CommandRunner } from "./runner.js";

export type { CommandRunner } from "./runner.js";

export type InitOptions = {
  cwd?: string;
  gitRunner?: CommandRunner;
  installRunner?: CommandRunner;
};

type PackageManager = "npm" | "pnpm";

export function handleInit(args: readonly string[], options: InitOptions = {}): CliResult {
  const parsedResult = parseOptions(args, [
    { kind: "value", name: "--name" },
    { kind: "value", name: "--package-manager" },
    { kind: "boolean", name: "--skip-install" },
    { kind: "boolean", name: "--skip-git" },
    { kind: "value", name: "--license" },
  ]);

  if ("error" in parsedResult) {
    return parsedResult.error;
  }

  const { parsed } = parsedResult;

  if (parsed.positional.length > 0) {
    return failure(`Unexpected argument: ${parsed.positional[0]}`);
  }

  const name = getStringOption(parsed, "--name");

  if (!name) {
    return failure("Missing required option: --name <dir>");
  }

  if (!isValidPackageName(name)) {
    return failure(`Invalid package name for --name: ${name}`);
  }

  const cwd = options.cwd ?? process.cwd();
  const destination = join(cwd, name);
  const packageManager = resolvePackageManager(getStringOption(parsed, "--package-manager"));

  if (!packageManager) {
    return failure("Invalid package manager. Expected npm or pnpm.");
  }

  const license = getStringOption(parsed, "--license") ?? "MIT";

  try {
    createScaffold({
      destination,
      license,
      name,
      packageManager,
    });
  } catch (error) {
    if (isFileExistsError(error)) {
      return failure(`Destination already exists: ${destination}`);
    }

    throw error;
  }

  if (!getBooleanOption(parsed, "--skip-git")) {
    const gitResult = (options.gitRunner ?? runCommand)("git", ["init", "-b", "main"], {
      cwd: destination,
    });

    if (gitResult.exitCode !== 0) {
      return failure(formatRunnerFailure("git init", gitResult));
    }
  }

  if (!getBooleanOption(parsed, "--skip-install")) {
    const installCommand = formatInstallCommand(packageManager);
    const installResult = (options.installRunner ?? runCommand)(
      installCommand.command,
      installCommand.args,
      {
        cwd: destination,
      },
    );

    if (installResult.exitCode !== 0) {
      return failure(
        formatRunnerFailure(
          `${installCommand.command} ${installCommand.args.join(" ")}`,
          installResult,
        ),
      );
    }
  }

  return success(`Created Stanza repository: ${name}`);
}

export function formatInstallCommand(packageManager: PackageManager): {
  args: string[];
  command: string;
} {
  return {
    args: ["install"],
    command: packageManager,
  };
}

function createScaffold(input: {
  destination: string;
  license: string;
  name: string;
  packageManager: PackageManager;
}): void {
  mkdirSync(input.destination);
  mkdirSync(join(input.destination, ".github", "workflows"), { recursive: true });
  mkdirSync(join(input.destination, "assets"));
  mkdirSync(join(input.destination, "lib"));

  writeFileSync(
    join(input.destination, "package.json"),
    formatJson(createPackageJson(input)),
    "utf8",
  );
  writeFileSync(
    join(input.destination, "README.md"),
    `# ${input.name}\n\nA TogoStanza repository.\n`,
    "utf8",
  );
  writeFileSync(join(input.destination, ".gitignore"), "node_modules/\ndist/\n", "utf8");
  writeFileSync(
    join(input.destination, "common.scss"),
    "/* Shared stylesheet for stanzas. */\n",
    "utf8",
  );
  writeFileSync(join(input.destination, "assets", ".keep"), "", "utf8");
  writeFileSync(join(input.destination, "lib", ".keep"), "", "utf8");
  writeFileSync(
    join(input.destination, ".github", "workflows", "publish.yml"),
    formatWorkflowPlaceholder(input.packageManager),
    "utf8",
  );
}

function createPackageJson(input: { license: string; name: string }): Record<string, unknown> {
  return {
    name: input.name,
    version: "0.0.1",
    private: true,
    license: input.license,
    dependencies: {
      togostanza: `^${packageMetadata.version}`,
    },
    engines: {
      node: ">=24.5.0",
    },
  };
}

function formatWorkflowPlaceholder(packageManager: PackageManager): string {
  return [
    "name: Publish GitHub Pages",
    "",
    "on:",
    "  workflow_dispatch:",
    "",
    "jobs:",
    "  placeholder:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    `      - run: echo "GitHub Pages deploy workflow for ${packageManager} will be enabled in Phase 2."`,
    "",
  ].join("\n");
}

function resolvePackageManager(value: string | undefined): PackageManager | undefined {
  if (value === "npm" || value === "pnpm") {
    return value;
  }

  if (value) {
    return undefined;
  }

  const userAgent = process.env.npm_config_user_agent;

  if (userAgent?.startsWith("pnpm/")) {
    return "pnpm";
  }

  if (userAgent?.startsWith("npm/")) {
    return "npm";
  }

  return "npm";
}

function isValidPackageName(name: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*$/.test(name) && name !== "." && name !== "..";
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatRunnerFailure(label: string, result: { exitCode: number; stderr?: string }): string {
  const detail = result.stderr?.trim();

  if (detail) {
    return `${label} failed with exit code ${result.exitCode}: ${detail}`;
  }

  return `${label} failed with exit code ${result.exitCode}.`;
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
