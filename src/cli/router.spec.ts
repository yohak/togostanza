import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { packageMetadata } from "../index.js";
import {
  assertCompatLocalReferencesReady,
  assertExpectedCompatLocalStanzaDirectories,
  compatFixturePath,
} from "../test/support/compat-local.js";
import { listCommandUsages } from "./commands.js";
import type { CliResult } from "./result.js";
import { routeCli as routeCliRaw, type CliRouteOptions } from "./router.js";
import type { CommandRunner } from "./runner.js";
import type { ServeSession } from "./serve.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositoryRoot = packageRoot;
const localCorsOrigin = "http://127.0.0.1:5173";
const localhostCorsOrigin = "http://localhost:5173";
const localCompatibilityIt = process.env.TOGOSTANZA_RUN_LOCAL_COMPAT === "1" ? it : it.skip;
const releaseDependencySpec = "git+file:///tmp/togostanza-release-smoke#phase-12";

const failingInstallRunner: CommandRunner = () => {
  throw new Error("install runner should not be called");
};

const failingGitRunner: CommandRunner = () => {
  throw new Error("git runner should not be called for existing .git");
};

function routeCli(args: readonly string[], options: CliRouteOptions = {}): CliResult {
  const result = routeCliRaw(args, options);

  if (result instanceof Promise) {
    throw new Error("Expected routeCli to return a synchronous result.");
  }

  return result;
}

function withTogoStanzaDependencySpec<T>(dependencySpec: string, callback: () => T): T {
  const previousSpec = process.env["TOGOSTANZA_DEPENDENCY_SPEC"];
  process.env["TOGOSTANZA_DEPENDENCY_SPEC"] = dependencySpec;

  try {
    return callback();
  } finally {
    if (previousSpec === undefined) {
      delete process.env["TOGOSTANZA_DEPENDENCY_SPEC"];
    } else {
      process.env["TOGOSTANZA_DEPENDENCY_SPEC"] = previousSpec;
    }
  }
}

async function routeCliAsync(
  args: readonly string[],
  options: CliRouteOptions = {},
): Promise<CliResult> {
  return await routeCliRaw(args, options);
}

describe("CLI router", () => {
  const temporaryDirectories: string[] = [];
  const serveSessions: ServeSession[] = [];
  const currentDate = new Date("2026-06-30T00:00:00.000Z");

  afterEach(async () => {
    await Promise.all(serveSessions.splice(0).map((session) => session.close()));

    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("prints version to stdout", () => {
    expect(routeCli(["--version"])).toEqual({
      exitCode: 0,
      stdout: `${packageMetadata.name}@${packageMetadata.version}`,
    });
  });

  it("treats -v as a version alias", () => {
    expect(routeCli(["-v"])).toEqual({
      exitCode: 0,
      stdout: `${packageMetadata.name}@${packageMetadata.version}`,
    });
  });

  it("prints help to stdout", () => {
    const result = routeCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(result.stdout).toContain("Usage: togostanza [command]");

    for (const usage of listCommandUsages()) {
      expect(result.stdout).toContain(`  ${usage}`);
    }
  });

  it("rejects an unknown global option before command routing", () => {
    expect(routeCli(["--bad"])).toEqual({
      exitCode: 1,
      stderr: "Unknown option: --bad",
    });
  });

  it("rejects an unknown command", () => {
    expect(routeCli(["upgrade"])).toEqual({
      exitCode: 1,
      stderr: "Unknown command: upgrade",
    });
  });

  it("creates an init scaffold without install or git when skipped", () => {
    const cwd = makeTemporaryDirectory();
    const result = routeCli(
      [
        "init",
        "--name",
        "generated-repo",
        "--package-manager",
        "npm",
        "--skip-install",
        "--skip-git",
      ],
      {
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(result.stdout).toBe(
      [
        "Created Stanza repository: generated-repo",
        "",
        "Next steps:",
        "  cd generated-repo",
        "  npm install",
        "  npm exec togostanza generate stanza hello",
        "  npm run build",
        "  npm run serve",
      ].join("\n"),
    );

    const packageJson = readJson(join(cwd, "generated-repo", "package.json")) as {
      dependencies: Record<string, string>;
      engines: Record<string, string>;
      license: string;
      packageManager?: string;
      pnpm?: unknown;
      scripts: Record<string, string>;
    };
    const tsConfig = readJson(join(cwd, "generated-repo", "tsconfig.json")) as {
      compilerOptions: Record<string, unknown>;
      include: string[];
    };
    const readme = readText(join(cwd, "generated-repo", "README.md"));

    expect(packageJson.license).toBe("MIT");
    expect(packageJson.dependencies.togostanza).toBe("github:yohak/togostanza");
    expect(packageJson.engines.node).toBe(">=24.0.0");
    expect(packageJson.packageManager).toBeUndefined();
    expect(packageJson.pnpm).toBeUndefined();
    expect(existsSync(join(cwd, "generated-repo", "pnpm-workspace.yaml"))).toBe(false);
    expect(packageJson.scripts).toEqual({
      build: "togostanza build",
      serve: "togostanza serve",
    });
    expect(tsConfig.compilerOptions.moduleResolution).toBe("bundler");
    expect(tsConfig.compilerOptions.allowJs).toBe(true);
    expect(tsConfig.compilerOptions.checkJs).toBe(false);
    expect(tsConfig.include).toContain("stanzas/**/*");
    expect(readme).toContain("npm run build");
    expect(readme).toContain("npm run serve");
    expect(readme).toContain("npm exec togostanza generate stanza hello");
    expect(readme).toContain("This repository depends on `github:yohak/togostanza`.");
    expect(readme).toContain(
      "Use the tagless GitHub dependency for normal development. If you need a fixed TogoStanza version for verification, use a tag or commit SHA",
    );
    expect(readme).toContain("npm install togostanza@github:yohak/togostanza");
    expect(readme).toContain("Then review the lockfile diff and run the build command below.");
    expect(readme).toContain("npm ci");
    expect(readme).toContain("package-lock.json");
    expect(readme).toContain("--skip-install");
    expect(readme).not.toContain("Phase");
    expectNpmPagesWorkflow(
      readText(join(cwd, "generated-repo", ".github", "workflows", "publish.yml")),
    );
  });

  it("uses an explicit dependency spec override for init scaffolds", () => {
    const cwd = makeTemporaryDirectory();

    withTogoStanzaDependencySpec(releaseDependencySpec, () => {
      const result = routeCli(
        [
          "init",
          "--name",
          "generated-repo",
          "--package-manager",
          "npm",
          "--skip-install",
          "--skip-git",
        ],
        {
          cwd,
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBeUndefined();
      const packageJson = readJson(join(cwd, "generated-repo", "package.json")) as {
        dependencies: Record<string, string>;
      };

      expect(packageJson.dependencies.togostanza).toBe(releaseDependencySpec);
    });
  });

  for (const packageManager of ["npm", "pnpm"] as const) {
    it(`runs default ${packageManager} install with the tagless GitHub dependency`, () => {
      const cwd = makeTemporaryDirectory();
      const calls: string[] = [];
      const installRunner: CommandRunner = (command, args, options) => {
        calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
        return { exitCode: 0 };
      };
      const result = routeCli(
        ["init", "--name", `${packageManager}-repo`, "--package-manager", packageManager],
        {
          cwd,
          installRunner,
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Created Stanza repository: ${packageManager}-repo`);
      expect(result.stdout).toBe(
        [
          `Created Stanza repository: ${packageManager}-repo`,
          "",
          "Next steps:",
          `  cd ${packageManager}-repo`,
          packageManager === "pnpm"
            ? "  pnpm exec togostanza generate stanza hello"
            : "  npm exec togostanza generate stanza hello",
          packageManager === "pnpm" ? "  pnpm build" : "  npm run build",
          packageManager === "pnpm" ? "  pnpm serve" : "  npm run serve",
        ].join("\n"),
      );
      expect(calls).toEqual([`${packageManager} install @ ${join(cwd, `${packageManager}-repo`)}`]);
      const packageJson = readJson(join(cwd, `${packageManager}-repo`, "package.json")) as {
        dependencies: Record<string, string>;
      };
      expect(packageJson.dependencies.togostanza).toBe("github:yohak/togostanza");
    });
  }

  it("rejects placeholder dependency installs when the verification override is not concrete", () => {
    const cwd = makeTemporaryDirectory();

    withTogoStanzaDependencySpec("github:yohak/togostanza#<tag-or-sha>", () => {
      const result = routeCli(["init", "--name", "placeholder-repo", "--package-manager", "npm"], {
        cwd,
        installRunner: failingInstallRunner,
      });

      expect(result).toEqual({
        exitCode: 1,
        stderr:
          "Cannot install placeholder dependency github:yohak/togostanza#<tag-or-sha>. Replace <tag-or-sha>, set TOGOSTANZA_DEPENDENCY_SPEC to a concrete GitHub dependency, or rerun init with --skip-install.",
      });
      expect(existsSync(join(cwd, "placeholder-repo"))).toBe(false);
    });
  });

  for (const packageManager of ["npm", "pnpm"] as const) {
    it(`runs default ${packageManager} install when a concrete dependency spec is set`, () => {
      const cwd = makeTemporaryDirectory();
      const calls: string[] = [];
      const installRunner: CommandRunner = (command, args, options) => {
        calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
        return { exitCode: 0 };
      };

      withTogoStanzaDependencySpec(releaseDependencySpec, () => {
        const result = routeCli(
          ["init", "--name", `${packageManager}-repo`, "--package-manager", packageManager],
          {
            cwd,
            installRunner,
          },
        );

        expect(result.exitCode).toBe(0);
      });

      expect(calls).toEqual([`${packageManager} install @ ${join(cwd, `${packageManager}-repo`)}`]);
      const packageJson = readJson(join(cwd, `${packageManager}-repo`, "package.json")) as {
        dependencies: Record<string, string>;
      };
      expect(packageJson.dependencies.togostanza).toBe(releaseDependencySpec);
    });
  }

  it("creates an init scaffold in the current directory", () => {
    const cwd = makeNamedTemporaryDirectory("current-repo");
    const result = routeCli(
      ["init", ".", "--package-manager", "npm", "--skip-install", "--skip-git"],
      {
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(readJson(join(cwd, "package.json"))).toMatchObject({
      name: "current-repo",
    });
    expectNpmPagesWorkflow(readText(join(cwd, ".github", "workflows", "publish.yml")));
  });

  it("creates a pnpm Pages workflow in the current directory when pnpm is selected", () => {
    const cwd = makeNamedTemporaryDirectory("current-pnpm-repo");
    const result = routeCli(
      ["init", ".", "--package-manager", "pnpm", "--skip-install", "--skip-git"],
      {
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expectPnpmPagesWorkflow(readText(join(cwd, ".github", "workflows", "publish.yml")));
    const packageJson = readJson(join(cwd, "package.json")) as {
      pnpm?: unknown;
    };
    expect(packageJson.pnpm).toBeUndefined();
    expect(readText(join(cwd, "pnpm-workspace.yaml"))).toBe(
      [
        "allowBuilds:",
        "  '@parcel/watcher': true",
        "  esbuild: true",
        "onlyBuiltDependencies:",
        "  - '@parcel/watcher'",
        "  - esbuild",
        "",
      ].join("\n"),
    );
    const readme = readText(join(cwd, "README.md"));
    expect(readme).toContain("pnpm build");
    expect(readme).toContain("pnpm serve");
    expect(readme).toContain("pnpm exec togostanza generate stanza hello");
    expect(readme).toContain("pnpm ci");
    expect(readme).toContain("pnpm-lock.yaml");
    expect(readme).toContain("pnpm 11");
    expect(readme).toContain("pnpm update togostanza --latest --force");
    expect(readme).toContain("Then review the lockfile diff and run the build command below.");
  });

  it("uses --name as a package name override for init .", () => {
    const cwd = makeNamedTemporaryDirectory("Invalid Directory Name");
    const result = routeCli(
      ["init", ".", "--name", "explicit-name", "--skip-install", "--skip-git"],
      {
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(readJson(join(cwd, "package.json"))).toMatchObject({
      name: "explicit-name",
    });
  });

  it("rejects init . when the current directory name is not a valid package name", () => {
    const cwd = makeNamedTemporaryDirectory("Invalid Directory Name");

    expect(routeCli(["init", ".", "--skip-install", "--skip-git"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Invalid package name for current directory: Invalid Directory Name",
    });
  });

  it("keeps an existing .git directory when init . runs", () => {
    const cwd = makeNamedTemporaryDirectory("git-repo");
    mkdirSync(join(cwd, ".git"));

    const result = routeCli(["init", ".", "--skip-install"], {
      cwd,
      gitRunner: failingGitRunner,
    });

    expect(result.exitCode).toBe(0);
    expect(readJson(join(cwd, "package.json"))).toMatchObject({
      name: "git-repo",
    });
  });

  it("uses an existing package-lock.json to infer npm for init .", () => {
    const cwd = makeNamedTemporaryDirectory("npm-lock-repo");
    writeFileSync(join(cwd, "package-lock.json"), "{}\n", "utf8");
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    const result = withTogoStanzaDependencySpec(releaseDependencySpec, () =>
      routeCli(["init", ".", "--skip-git"], {
        cwd,
        installRunner,
      }),
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`npm install @ ${cwd}`]);
  });

  it("uses an existing pnpm-lock.yaml to infer pnpm for init .", () => {
    const cwd = makeNamedTemporaryDirectory("pnpm-lock-repo");
    writeFileSync(join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    const result = withTogoStanzaDependencySpec(releaseDependencySpec, () =>
      routeCli(["init", ".", "--skip-git"], {
        cwd,
        installRunner,
      }),
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`pnpm install @ ${cwd}`]);
    expectPnpmPagesWorkflow(readText(join(cwd, ".github", "workflows", "publish.yml")));
  });

  it("rejects init . when both lockfiles exist", () => {
    const cwd = makeNamedTemporaryDirectory("conflicting-lockfiles-repo");
    writeFileSync(join(cwd, "package-lock.json"), "{}\n", "utf8");
    writeFileSync(join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    expect(routeCli(["init", ".", "--skip-install", "--skip-git"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Conflicting lockfiles found: package-lock.json and pnpm-lock.yaml.",
    });
  });

  it("rejects init . when --package-manager conflicts with package-lock.json", () => {
    const cwd = makeNamedTemporaryDirectory("npm-conflict-repo");
    writeFileSync(join(cwd, "package-lock.json"), "{}\n", "utf8");

    expect(
      routeCli(["init", ".", "--package-manager", "pnpm", "--skip-install", "--skip-git"], {
        cwd,
      }),
    ).toEqual({
      exitCode: 1,
      stderr: "--package-manager pnpm conflicts with existing package-lock.json.",
    });
  });

  it("rejects init . when --package-manager conflicts with pnpm-lock.yaml", () => {
    const cwd = makeNamedTemporaryDirectory("pnpm-conflict-repo");
    writeFileSync(join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    expect(
      routeCli(["init", ".", "--package-manager", "npm", "--skip-install", "--skip-git"], {
        cwd,
      }),
    ).toEqual({
      exitCode: 1,
      stderr: "--package-manager npm conflicts with existing pnpm-lock.yaml.",
    });
  });

  it("rejects init . when scaffold paths already exist", () => {
    const cwd = makeNamedTemporaryDirectory("colliding-repo");
    writeFileSync(join(cwd, "README.md"), "# Existing\n", "utf8");

    expect(routeCli(["init", ".", "--skip-install", "--skip-git"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Cannot initialize in a non-empty directory. Conflicting paths: README.md",
    });
  });

  it("treats .gitignore and LICENSE as init . collisions", () => {
    const cwd = makeNamedTemporaryDirectory("almost-empty-repo");
    writeFileSync(join(cwd, ".gitignore"), "node_modules/\n", "utf8");
    writeFileSync(join(cwd, "LICENSE"), "MIT\n", "utf8");

    expect(routeCli(["init", ".", "--skip-install", "--skip-git"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Cannot initialize in a non-empty directory. Conflicting paths: .gitignore, LICENSE",
    });
  });

  it("does not use parent lockfiles for init --name <dir>", () => {
    const cwd = makeTemporaryDirectory();
    writeFileSync(join(cwd, "package-lock.json"), "{}\n", "utf8");

    const result = routeCli(
      ["init", "--name", "child-repo", "--package-manager", "pnpm", "--skip-install", "--skip-git"],
      {
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);
    expectPnpmPagesWorkflow(
      readText(join(cwd, "child-repo", ".github", "workflows", "publish.yml")),
    );
  });

  it("uses --license for init package.json", () => {
    const cwd = makeTemporaryDirectory();

    routeCli(
      [
        "init",
        "--name",
        "licensed-repo",
        "--license",
        "Apache-2.0",
        "--skip-install",
        "--skip-git",
      ],
      {
        cwd,
      },
    );

    expect(readJson(join(cwd, "licensed-repo", "package.json"))).toMatchObject({
      license: "Apache-2.0",
    });
  });

  it("builds the install command without requiring a real install", () => {
    const cwd = makeTemporaryDirectory();
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    const result = withTogoStanzaDependencySpec(releaseDependencySpec, () =>
      routeCli(["init", "--name", "pnpm-repo", "--package-manager", "pnpm", "--skip-git"], {
        cwd,
        installRunner,
      }),
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`pnpm install @ ${join(cwd, "pnpm-repo")}`]);
    expectPnpmPagesWorkflow(
      readText(join(cwd, "pnpm-repo", ".github", "workflows", "publish.yml")),
    );
  });

  it("builds an npm install command when npm is selected", () => {
    const cwd = makeTemporaryDirectory();
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    const result = withTogoStanzaDependencySpec(releaseDependencySpec, () =>
      routeCli(["init", "--name", "npm-repo", "--package-manager", "npm", "--skip-git"], {
        cwd,
        installRunner,
      }),
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`npm install @ ${join(cwd, "npm-repo")}`]);
    expectNpmPagesWorkflow(readText(join(cwd, "npm-repo", ".github", "workflows", "publish.yml")));
  });

  it("rejects unsupported package managers", () => {
    expect(routeCli(["init", "--name", "bad-pm-repo", "--package-manager", "yarn"])).toEqual({
      exitCode: 1,
      stderr: "Invalid package manager. Expected npm or pnpm.",
    });
  });

  it("infers pnpm from npm_config_user_agent", () => {
    const cwd = makeTemporaryDirectory();
    const previousUserAgent = process.env.npm_config_user_agent;
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    try {
      process.env.npm_config_user_agent = "pnpm/11.0.0 node/v24.5.0 darwin arm64";

      const result = withTogoStanzaDependencySpec(releaseDependencySpec, () =>
        routeCli(["init", "--name", "inferred-repo", "--skip-git"], {
          cwd,
          installRunner,
        }),
      );

      expect(result.exitCode).toBe(0);
      expect(calls).toEqual([`pnpm install @ ${join(cwd, "inferred-repo")}`]);
    } finally {
      if (previousUserAgent === undefined) {
        delete process.env.npm_config_user_agent;
      } else {
        process.env.npm_config_user_agent = previousUserAgent;
      }
    }
  });

  it("skips install runner when --skip-install is passed", () => {
    const cwd = makeTemporaryDirectory();

    const result = routeCli(
      ["init", "--name", "skip-install-repo", "--skip-install", "--skip-git"],
      {
        cwd,
        installRunner: failingInstallRunner,
      },
    );

    expect(result.exitCode).toBe(0);
  });

  it("rejects unsupported init options", () => {
    expect(routeCli(["init", "--git-url", "https://example.test/repo.git"])).toEqual({
      exitCode: 1,
      stderr: "Unknown option: --git-url",
    });
  });

  it("requires --name for init", () => {
    expect(routeCli(["init"])).toEqual({
      exitCode: 1,
      stderr: "Missing required option: --name <dir>",
    });
  });

  for (const name of [".", "foo/bar", "UpperCase"]) {
    it(`rejects invalid init --name value ${name}`, () => {
      expect(routeCli(["init", "--name", name])).toEqual({
        exitCode: 1,
        stderr: `Invalid package name for --name: ${name}`,
      });
    });
  }

  it("rejects existing init destinations", () => {
    const cwd = makeTemporaryDirectory();

    routeCli(["init", "--name", "existing-repo", "--skip-install", "--skip-git"], { cwd });

    expect(
      routeCli(["init", "--name", "existing-repo", "--skip-install", "--skip-git"], { cwd }),
    ).toEqual({
      exitCode: 1,
      stderr: `Destination already exists: ${join(cwd, "existing-repo")}`,
    });
  });

  it("creates a generated stanza and normalizes the id", () => {
    const cwd = makeStanzaRepoRoot();
    const result = routeCli(
      [
        "generate",
        "stanza",
        "helloWorld",
        "--label",
        "Hello World",
        "--definition",
        "Smoke test stanza",
        "--license",
        "MIT",
        "--author",
        "Codex",
        "--timestamp",
        "2026-06-30",
      ],
      {
        currentDate,
        cwd,
      },
    );

    expect(result.exitCode).toBe(0);

    const stanzaRoot = join(cwd, "stanzas", "hello-world");
    expect(readJson(join(stanzaRoot, "metadata.json"))).toMatchObject({
      "@id": "hello-world",
      "stanza:author": "Codex",
      "stanza:definition": "Smoke test stanza",
      "stanza:label": "Hello World",
      "stanza:license": "MIT",
      "stanza:created": "2026-06-30",
      "stanza:updated": "2026-06-30",
    });
    expect(readText(join(stanzaRoot, "index.js"))).toContain(
      'import Stanza from "togostanza/stanza";',
    );
    expect(readText(join(stanzaRoot, "templates", "stanza.html.hbs"))).toContain("{{greeting}}");
  });

  it("supports the g stanza alias", () => {
    const cwd = makeStanzaRepoRoot();
    const result = routeCli(["g", "stanza", "aliasProbe"], { cwd, currentDate });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Created stanza: alias-probe");
    expect(result.stdout).toContain("Next steps:");
    expect(result.stdout).toContain("  pnpm exec togostanza build");
    expect(result.stdout).toContain("  pnpm exec togostanza serve");
    expect(readJson(join(cwd, "stanzas", "alias-probe", "metadata.json"))).toMatchObject({
      "@id": "alias-probe",
      "stanza:label": "Alias Probe",
      "stanza:created": "2026-06-30",
    });
  });

  it("uses existing Stanza package scripts in generate stanza next steps", () => {
    const cwd = makeStanzaRepoRoot({
      scripts: {
        "stanza:build": "togostanza build",
        "stanza:server": "togostanza serve",
      },
    });
    const result = routeCli(["generate", "stanza", "scriptProbe"], { cwd, currentDate });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Created stanza: script-probe");
    expect(result.stdout).toContain("  pnpm stanza:build");
    expect(result.stdout).toContain("  pnpm stanza:server");
  });

  it("uses default generate stanza options", () => {
    const cwd = makeStanzaRepoRoot();
    const result = routeCli(["generate", "stanza", "defaultProbe"], { cwd, currentDate });

    expect(result.exitCode).toBe(0);
    expect(readJson(join(cwd, "stanzas", "default-probe", "metadata.json"))).toMatchObject({
      "@id": "default-probe",
      "stanza:author": "",
      "stanza:definition": "Default Probe stanza.",
      "stanza:label": "Default Probe",
      "stanza:license": "MIT",
      "stanza:created": "2026-06-30",
      "stanza:updated": "2026-06-30",
    });
  });

  it("rejects generate stanza without an id", () => {
    expect(routeCli(["generate", "stanza"])).toEqual({
      exitCode: 1,
      stderr: "Missing required argument: id",
    });
  });

  it("rejects invalid stanza ids after normalization", () => {
    expect(routeCli(["generate", "stanza", "___"])).toEqual({
      exitCode: 1,
      stderr: "Invalid stanza id: ___",
    });
  });

  it("rejects existing stanza destinations", () => {
    const cwd = makeStanzaRepoRoot();

    routeCli(["generate", "stanza", "duplicate"], { cwd });

    expect(routeCli(["generate", "stanza", "duplicate"], { cwd })).toEqual({
      exitCode: 1,
      stderr: `Stanza already exists: ${join(cwd, "stanzas", "duplicate")}`,
    });
  });

  it("rejects generate stanza outside a Stanza repository root", () => {
    const cwd = makeTemporaryDirectory();

    const result = routeCli(["generate", "stanza", "outside"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing package.json");
  });

  it("rejects generate stanza when package.json is malformed", () => {
    const cwd = makeNamedTemporaryDirectory("malformed-generate-repo");
    writeFileSync(join(cwd, "package.json"), "{ nope\n", "utf8");

    const result = routeCli(["generate", "stanza", "malformed"], { cwd });

    expect(result).toEqual({
      exitCode: 1,
      stderr: `Invalid Stanza repository package.json: malformed JSON at ${join(cwd, "package.json")}.`,
    });
  });

  it("rejects build outside a Stanza repository root", async () => {
    const cwd = makeTemporaryDirectory();

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing package.json");
  });

  it("rejects serve outside a Stanza repository root", async () => {
    const cwd = makeTemporaryDirectory();

    const result = await routeCliAsync(["serve"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing package.json");
  });

  it("rejects build when package.json is malformed", async () => {
    const cwd = makeNamedTemporaryDirectory("malformed-build-repo");
    writeFileSync(join(cwd, "package.json"), "{ nope\n", "utf8");

    const result = await routeCliAsync(["build"], { cwd });

    expect(result).toEqual({
      exitCode: 1,
      stderr: `Invalid Stanza repository package.json: malformed JSON at ${join(cwd, "package.json")}.`,
    });
  });

  it("rejects build when no stanzas exist", async () => {
    const cwd = makeStanzaRepoRoot();

    const result = await routeCliAsync(["build", "--output-path", "public"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("No stanzas found");
  });

  it.each([
    {
      expected: "Invalid stanza metadata: malformed JSON",
      metadata: "{",
      name: "malformed-json",
    },
    {
      expected: "Invalid stanza metadata: expected an object",
      metadata: "[]",
      name: "metadata-not-object",
    },
    {
      expected: "Invalid stanza metadata: @id must be a string",
      metadata: "{}",
      name: "missing-id",
    },
    {
      expected: "Invalid stanza metadata: @id must be a string",
      metadata: '{"@id": 42}',
      name: "id-not-string",
    },
    {
      expected: "Invalid stanza metadata: @id other-id must match directory name id-mismatch",
      metadata: '{"@id": "other-id"}',
      name: "id-mismatch",
    },
    {
      expected: "Invalid stanza metadata: @id is not a valid stanza id",
      metadata: '{"@id": "bad--id"}',
      name: "bad--id",
    },
  ])("rejects invalid build metadata: $name", async ({ expected, metadata, name }) => {
    const cwd = makeStanzaRepoRoot();
    writeMinimalStanza(cwd, name, metadata);

    const result = await routeCliAsync(["build", "--output-path", "public"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(expected);
    expect(result.stderr).toContain(join(cwd, "stanzas", name, "metadata.json"));
  });

  it("supports the b alias for build output generation", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "buildProbe"], { cwd, currentDate });

    const result = await routeCliAsync(["b"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Built Stanza repository: repo");
    expect(result.stdout).toContain("Output: dist");
    expect(result.stdout).toMatch(/Duration: \d+ ms/);
    expect(result.stdout).toContain("Next step:");
    expect(result.stdout).toContain("  pnpm exec togostanza serve");
    expect(existsSync(join(cwd, "dist", "build-probe.js"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "build-probe.js.map"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "build-probe.css"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "build-probe.css.map"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "build-probe.html"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "build-probe", "metadata.json"))).toBe(true);
    const script = readText(join(cwd, "dist", "build-probe.js"));
    expect(script).not.toContain("togostanza/stanza");
    expect(script).not.toContain("__togostanzaBuildEntries");
    expect(script).toContain('"@id"');
    expect(script).toContain("build-probe");
    expect(script).toContain("customElements.define");
    expect(script).toContain("stanza.html.hbs");
    expect(script).toContain("Hello, ");
    expect(readText(join(cwd, "dist", "build-probe.html"))).toContain("./build-probe.js");
  });

  it("uses an existing serve package script in build next steps", async () => {
    const cwd = makeStanzaRepoRoot({
      scripts: {
        serve: "togostanza serve",
      },
    });
    routeCli(["generate", "stanza", "scriptBuildProbe"], { cwd, currentDate });

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Built Stanza repository: repo");
    expect(result.stdout).toContain("  pnpm serve");
  });

  it("builds custom output assets, sass root alias, and clean output", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "assetProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "assets"));
    writeFileSync(join(cwd, "assets", ".keep"), "", "utf8");
    writeFileSync(join(cwd, "assets", "root-asset.txt"), "root\n", "utf8");
    writeFileSync(join(cwd, "common.scss"), "$probe-color: rgb(1, 2, 3);\n", "utf8");
    writeFileSync(
      join(cwd, "stanzas", "asset-probe", "style.scss"),
      [
        "@use '@/common.scss' as common;",
        ".asset-probe {",
        "  color: common.$probe-color;",
        '  background-image: url("./assets/local-asset.svg");',
        '  mask-image: url("assets/local-asset.svg");',
        '  list-style-image: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E");',
        '  cursor: url("https://example.test/cursor.svg"), auto;',
        "}",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "asset-probe", "assets", "local-asset.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
      "utf8",
    );
    mkdirSync(join(cwd, "public"));
    writeFileSync(join(cwd, "public", ".togostanza-build-output"), "old\n", "utf8");
    writeFileSync(join(cwd, "public", "stale.txt"), "stale\n", "utf8");

    const result = await routeCliAsync(["build", "--output-path", "public"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(cwd, "public", "stale.txt"))).toBe(false);
    const css = readText(join(cwd, "public", "asset-probe.css"));
    expect(css).toContain("rgb(1, 2, 3)");
    expect(css).toContain('url("./asset-probe/assets/local-asset.svg")');
    expect(css).toContain('url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")');
    expect(css).toContain('url("https://example.test/cursor.svg")');
    expect(css).not.toContain('url("./assets/local-asset.svg")');
    expect(css).not.toContain('url("assets/local-asset.svg")');
    expect(readText(join(cwd, "public", "assets", "root-asset.txt"))).toBe("root\n");
    expect(readText(join(cwd, "public", "asset-probe", "assets", "local-asset.svg"))).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
    );
    expect(existsSync(join(cwd, "public", "assets", ".keep"))).toBe(false);
    expect(existsSync(join(cwd, "public", "asset-probe", "assets", ".keep"))).toBe(false);
    expect(existsSync(join(cwd, "public", "index.html"))).toBe(false);
    expect(existsSync(join(cwd, "public", "-togostanza"))).toBe(false);
  });

  it("builds Sass that imports scoped package styles through node_modules", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "packageStyleProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "node_modules", "@case", "slider", "themes"), { recursive: true });
    writeFileSync(
      join(cwd, "node_modules", "@case", "slider", "themes", "default.scss"),
      ".package-style { color: rgb(3, 4, 5); }\n",
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "package-style-probe", "style.scss"),
      '@use "./@case/slider/themes/default";\n',
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(readText(join(cwd, "dist", "package-style-probe.css"))).toContain(".package-style");
  });

  it("emits stanza and package asset imports separately from copied root assets", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "assetImportProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "assets"));
    writeFileSync(join(cwd, "assets", "root-asset.txt"), "root\n", "utf8");
    writeFileSync(
      join(cwd, "stanzas", "asset-import-probe", "assets", "local-marker.svg"),
      formatLargeSvg("local-marker"),
      "utf8",
    );
    const packageDirectory = join(cwd, "node_modules", "case-asset-package");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      join(packageDirectory, "package.json"),
      `${JSON.stringify({ name: "case-asset-package", type: "module", version: "0.0.0" })}\n`,
      "utf8",
    );
    writeFileSync(
      join(packageDirectory, "package-marker.svg"),
      formatLargeSvg("package-marker"),
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "asset-import-probe", "index.js"),
      [
        'import Stanza from "togostanza/stanza";',
        'import localMarkerUrl from "./assets/local-marker.svg";',
        'import packageMarkerUrl from "case-asset-package/package-marker.svg";',
        "",
        "export default class AssetImportProbe extends Stanza {",
        "  render() {",
        '    const main = this.root.querySelector("main");',
        "    if (main) {",
        "      main.dataset.urls = `${localMarkerUrl}|${packageMarkerUrl}`;",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    const js = readText(join(cwd, "dist", "asset-import-probe.js"));
    expect(js).toContain("_assets/");
    expect(js).not.toContain('"/_assets/');
    expect(js).not.toContain("'/_assets/");
    expect(existsSync(join(cwd, "dist", "assets", "root-asset.txt"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "asset-import-probe", "assets", "local-marker.svg"))).toBe(
      true,
    );
    const emittedAssets = readdirSync(join(cwd, "dist", "_assets"));
    expect(emittedAssets.some((entryName) => entryName.startsWith("local-marker-"))).toBe(true);
    expect(emittedAssets.some((entryName) => entryName.startsWith("package-marker-"))).toBe(true);
  });

  it("builds a React TSX stanza using repository dependencies", async () => {
    const cwd = makeStanzaRepoRoot();
    writeReactRuntimeFixture(cwd);

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    const js = readText(join(cwd, "dist", "react-runtime-probe.js"));
    expect(js).toContain("React runtime probe");
    expect(js).toContain("react-runtime-probe");
    expect(js).toContain("render-count");
    expect(js).not.toContain('from"react"');
    expect(js).not.toContain('from"react-dom/client"');
    expect(existsSync(join(cwd, "dist", "react-runtime-probe.js.map"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "react-runtime-probe.css"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "react-runtime-probe", "metadata.json"))).toBe(true);
  });

  it("builds a Vue SFC stanza using repository dependencies", async () => {
    const cwd = makeStanzaRepoRoot();
    writeVueRuntimeFixture(cwd);

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    const js = readText(join(cwd, "dist", "vue-runtime-probe.js"));
    expect(js).toContain("Vue runtime probe");
    expect(js).toContain("vue-runtime-probe");
    expect(js).not.toContain('from"vue"');
    expect(js).not.toContain('from"./App.vue"');
    expect(readText(join(cwd, "dist", "vue-runtime-probe.css"))).toContain(".vue-runtime-probe");
    expect(existsSync(join(cwd, "dist", "vue-runtime-probe.js.map"))).toBe(true);
    expect(existsSync(join(cwd, "dist", "vue-runtime-probe", "metadata.json"))).toBe(true);
  });

  it("reports missing local compatibility reference inputs with actionable paths", () => {
    const cwd = makeTemporaryDirectory();

    expect(() => assertCompatLocalReferencesReady(cwd)).toThrowError(
      /references\/metastanza\/package\.json/,
    );
    expect(() => assertCompatLocalReferencesReady(cwd)).toThrowError(
      /Prepare references\/ before running test:compat:local\./,
    );
    expect(compatFixturePath("metastanza", "scorecard", "scorecard.json")).toBe(
      "fixtures/metastanza/scorecard/scorecard.json",
    );
    expect(compatFixturePath("togomedium", "gmdb-meta-list", "meta-list.json")).toBe(
      "fixtures/togomedium/gmdb-meta-list/meta-list.json",
    );
  });

  localCompatibilityIt(
    "local compatibility: builds a stanza that imports the real togostanza-utils package",
    async () => {
      assertCompatLocalReferencesReady(repositoryRoot);

      const cwd = makeStanzaRepoRoot();
      writeUtilsCompatFixture(cwd);

      const result = await routeCliAsync(["build"], { cwd });

      expect(result.exitCode).toBe(0);
      const js = readText(join(cwd, "dist", "utils-probe.js"));
      expect(js).toContain("Download SVG");
      expect(js).toContain("loadData json");
      expect(js).toContain("applyFilter");
      expect(js).not.toContain('from"togostanza-utils"');
      expect(js).not.toContain('from"togostanza-utils/load-data"');
      expect(js).not.toContain('from"togostanza-utils/apply-filter"');
      expect(readText(join(cwd, "dist", "utils-probe.css"))).toContain(".utils-probe");
      expect(existsSync(join(cwd, "dist", "utils-probe.js.map"))).toBe(true);
      expect(existsSync(join(cwd, "dist", "utils-probe", "metadata.json"))).toBe(true);
    },
  );

  localCompatibilityIt(
    "local compatibility: builds all referenced metastanza and TogoMedium Stanza sources",
    async () => {
      assertCompatLocalReferencesReady(repositoryRoot);
      assertExpectedCompatLocalStanzaDirectories(repositoryRoot);

      const metastanzaRoot = makeMetastanzaCompatibilityRoot(makeTemporaryDirectory());
      const metastanzaResult = await routeCliAsync(["build", "--output-path", "dist-remake"], {
        cwd: metastanzaRoot,
      });
      expect(metastanzaResult.exitCode, metastanzaResult.stderr ?? metastanzaResult.stdout).toBe(0);

      const togoMediumRoot = makeTogoMediumCompatibilityRoot(makeTemporaryDirectory());
      const togoMediumResult = await routeCliAsync(["build", "--output-path", "dist-remake"], {
        cwd: togoMediumRoot,
      });
      expect(togoMediumResult.exitCode, togoMediumResult.stderr ?? togoMediumResult.stdout).toBe(0);
    },
    180_000,
  );

  it("warns about legacy build config files without executing them", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "legacyConfigProbe"], { cwd, currentDate });
    writeFileSync(
      join(cwd, "togostanza-build.mjs"),
      'throw new Error("togostanza-build.mjs was executed");\n',
      "utf8",
    );
    writeFileSync(
      join(cwd, "togostanza-build.js"),
      'throw new Error("togostanza-build.js was executed");\n',
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Built Stanza repository: repo");
    expect(result.stdout).toContain("Output: dist");
    expect(result.stdout).toMatch(/Duration: \d+ ms/);
    expect(result.stderr).toContain("Legacy TogoStanza config togostanza-build.mjs");
    expect(result.stderr).toContain("Legacy TogoStanza config togostanza-build.js");
    expect(result.stderr).toContain("togostanza.config.ts");
  });

  it("applies togostanza.config.ts Vite settings through the togostanza/config import path", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "configProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "lib"));
    writeFileSync(
      join(cwd, "lib", "config-label.js"),
      'export const configLabel = "config-alias-label";\n',
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "config-probe", "index.js"),
      [
        'import Stanza from "togostanza/stanza";',
        'import { configLabel } from "@shared/config-label.js";',
        "",
        "const configProbe = __TOGOSTANZA_CONFIG_PROBE__;",
        "",
        "export default class ConfigProbe extends Stanza {",
        "  render() {",
        '    const main = this.root.querySelector("main");',
        "    if (main) {",
        "      main.textContent = `${configLabel}:${configProbe}`;",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );
    writeConfigImportFixture(cwd);
    writeFileSync(
      join(cwd, "togostanza.config.ts"),
      [
        'import { defineTogoStanzaConfig } from "togostanza/config";',
        "",
        "export default defineTogoStanzaConfig({",
        "  vite: {",
        "    define: {",
        '      __TOGOSTANZA_CONFIG_PROBE__: JSON.stringify("config-from-vite"),',
        "    },",
        "    resolve: {",
        "      alias: {",
        `        "@shared": ${JSON.stringify(join(cwd, "lib"))},`,
        "      },",
        "    },",
        "  },",
        "});",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(existsSync(join(cwd, "dist", "config-probe.js"))).toBe(true);
    expect(readText(join(cwd, "dist", "config-probe.js"))).toContain("config-alias-label");
    expect(readText(join(cwd, "dist", "config-probe.js"))).toContain("config-from-vite");
  });

  it("returns a diagnostic when togostanza.config.ts cannot be loaded", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "badConfigProbe"], { cwd, currentDate });
    writeFileSync(
      join(cwd, "togostanza.config.ts"),
      'throw new Error("config probe failure");\n',
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid TogoStanza config: failed to load");
    expect(result.stderr).toContain(join(cwd, "togostanza.config.ts"));
    expect(result.stderr).toContain("config probe failure");
  });

  it("bundles shared source imported from outside the stanza directory", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "sharedSourceProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "lib"));
    writeFileSync(
      join(cwd, "lib", "shared-label.ts"),
      'export const sharedLabel: string = "case-2-4b-shared-source";\n',
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "shared-source-probe", "index.ts"),
      [
        'import Stanza from "togostanza/stanza";',
        'import { sharedLabel } from "../../lib/shared-label";',
        "",
        "export default class SharedSourceProbe extends Stanza {",
        "  render() {",
        '    const main = this.root.querySelector("main");',
        "    if (main) {",
        "      main.textContent = sharedLabel;",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(readText(join(cwd, "dist", "shared-source-probe.js"))).toContain(
      "case-2-4b-shared-source",
    );
  });

  it("does not reproduce current-version TS18003 for JavaScript stanzas with tsconfig.json", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "allowJsProbe"], { cwd, currentDate });
    writeFileSync(
      join(cwd, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            strict: true,
          },
          include: ["src/**/*.ts"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(cwd, "dist", "allow-js-probe.js"))).toBe(true);
  });

  it("explains the togostanza.config.ts migration path when tsconfig paths are unresolved", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "tsconfigPathsProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "lib"));
    writeFileSync(join(cwd, "lib", "label.js"), 'export const label = "tsconfig-paths";\n', "utf8");
    writeFileSync(
      join(cwd, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "@lib/*": ["lib/*"],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    writeFileSync(
      join(cwd, "stanzas", "tsconfig-paths-probe", "index.js"),
      [
        'import Stanza from "togostanza/stanza";',
        'import { label } from "@lib/label.js";',
        "",
        "export default class TsconfigPathsProbe extends Stanza {",
        "  render() {",
        '    const main = this.root.querySelector("main");',
        "    if (main) {",
        "      main.textContent = label;",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await routeCliAsync(["build"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("tsconfig compilerOptions.paths");
    expect(result.stderr).toContain("togostanza.config.ts");
    expect(result.stderr).toContain("vite.resolve.alias");
  });

  it("rejects unsafe build output paths before cleaning", async () => {
    const cwd = makeStanzaRepoRoot();
    const results = await Promise.all(
      [".", "..", "stanzas", "assets", ".github", "lib", "node_modules"].map((outputPath) =>
        routeCliAsync(["build", "--output-path", outputPath], { cwd }),
      ),
    );

    for (const result of results) {
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid output path");
    }
  });

  it("refuses to clean a non-owned non-empty output directory", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "ownedProbe"], { cwd, currentDate });
    mkdirSync(join(cwd, "public"));
    writeFileSync(join(cwd, "public", "manual.txt"), "manual\n", "utf8");

    const result = await routeCliAsync(["build", "--output-path", "public"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Refusing to clean output directory");
    expect(readText(join(cwd, "public", "manual.txt"))).toBe("manual\n");
  });

  it("recovers from a failed build on the next build", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "recoverProbe"], { cwd, currentDate });
    writeFileSync(
      join(cwd, "stanzas", "recover-probe", "style.scss"),
      ".broken {\n  color: ;\n}\n",
      "utf8",
    );

    const failedResult = await routeCliAsync(["build"], { cwd });

    expect(failedResult.exitCode).toBe(1);
    expect(failedResult.stderr).toContain("Sass compile failed");
    expect(existsSync(join(cwd, "dist", ".togostanza-build-output"))).toBe(true);

    writeFileSync(
      join(cwd, "stanzas", "recover-probe", "style.scss"),
      ".recover-probe {\n  color: green;\n}\n",
      "utf8",
    );

    const recoveredResult = await routeCliAsync(["build"], { cwd });

    expect(recoveredResult.exitCode).toBe(0);
    expect(readText(join(cwd, "dist", "recover-probe.css"))).toContain("green");
  });

  it("serves built artifacts without writing dist", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "serveProbe"], { cwd, currentDate });
    writeFileSync(join(cwd, "stanzas", "serve-probe", "assets", "data.custom"), "custom\n", "utf8");
    const port = await findAvailablePort();

    const result = await routeCliAsync(["serve", "--port", String(port)], {
      cwd,
      onServeSession: (session) => {
        serveSessions.push(session);
      },
      serveWatch: false,
    });

    expect(result).toEqual({
      exitCode: 0,
      stdout: [
        "Serving Stanza repository: repo",
        `URL: http://127.0.0.1:${port}/`,
        "Press Ctrl-C to stop.",
      ].join("\n"),
    });
    expect(existsSync(join(cwd, "dist"))).toBe(false);

    const index = await fetchText(port, "/");
    expect(index.status).toBe(200);
    expect(index.accessControlAllowOrigin).toBe(localCorsOrigin);
    expect(index.body).toContain("./serve-probe.html");

    const script = await fetchText(port, "/serve-probe.js");
    expect(script.status).toBe(200);
    expect(script.accessControlAllowOrigin).toBe(localCorsOrigin);
    expect(script.contentType).toContain("text/javascript");
    expect(script.body).toContain("customElements.define");

    const preflight = await fetchOptions(port, "/serve-probe.js");
    expect(preflight.status).toBe(204);
    expect(preflight.accessControlAllowOrigin).toBe(localCorsOrigin);
    expect(preflight.accessControlAllowMethods).toContain("GET");
    expect(preflight.accessControlAllowMethods).toContain("OPTIONS");

    const localhostPreflight = await fetchOptions(port, "/serve-probe.js", localhostCorsOrigin);
    expect(localhostPreflight.status).toBe(204);
    expect(localhostPreflight.accessControlAllowOrigin).toBe(localhostCorsOrigin);

    const metadata = await fetchText(port, "/serve-probe/metadata.json");
    expect(metadata.status).toBe(200);
    expect(metadata.contentType).toContain("application/json");
    expect(metadata.body).toContain('"@id"');

    const unknownAsset = await fetchText(port, "/serve-probe/assets/data.custom");
    expect(unknownAsset.status).toBe(200);
    expect(unknownAsset.contentType).toContain("application/octet-stream");
    expect(unknownAsset.body).toBe("custom\n");
  });

  it("rebuilds a changed stanza while serving", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "watchProbe"], { cwd, currentDate });
    writeFileSync(
      join(cwd, "stanzas", "watch-probe", "style.scss"),
      "main {\n  color: rgb(1, 2, 3);\n}\n",
      "utf8",
    );
    const port = await findAvailablePort();

    await routeCliAsync(["serve", "--port", String(port)], {
      cwd,
      onServeSession: (session) => {
        serveSessions.push(session);
      },
    });

    expect((await fetchText(port, "/watch-probe.css")).body).toContain("rgb(1, 2, 3)");

    writeFileSync(
      join(cwd, "stanzas", "watch-probe", "style.scss"),
      "main {\n  color: rgb(4, 5, 6);\n}\n",
      "utf8",
    );

    await waitFor(async () => {
      const css = await fetchText(port, "/watch-probe.css");
      return css.body.includes("rgb(4, 5, 6)");
    });
  });

  it("rebuilds all stanzas after shared source or root asset changes", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "sharedOne"], { cwd, currentDate });
    routeCli(["generate", "stanza", "sharedTwo"], { cwd, currentDate });
    mkdirSync(join(cwd, "assets"));
    mkdirSync(join(cwd, "lib"));
    const sharedSourcePath = join(cwd, "lib", "shared-message.js");
    const rootAssetPath = join(cwd, "assets", "root-marker.txt");

    writeFileSync(sharedSourcePath, 'export const sharedMessage = "before-shared";\n', "utf8");
    writeFileSync(rootAssetPath, "before-asset\n", "utf8");

    for (const [id, className] of [
      ["shared-one", "SharedOne"],
      ["shared-two", "SharedTwo"],
    ] as const) {
      writeFileSync(
        join(cwd, "stanzas", id, "index.js"),
        [
          'import Stanza from "togostanza/stanza";',
          'import { sharedMessage } from "../../lib/shared-message.js";',
          "",
          `export default class ${className} extends Stanza {`,
          "  async render() {",
          "    this.renderTemplate({",
          '      template: "stanza.html.hbs",',
          "      parameters: {",
          "        greeting: sharedMessage,",
          "      },",
          "    });",
          "  }",
          "}",
          "",
        ].join("\n"),
        "utf8",
      );
    }

    const port = await findAvailablePort();

    await routeCliAsync(["serve", "--port", String(port)], {
      cwd,
      onServeSession: (session) => {
        serveSessions.push(session);
      },
    });

    expect(await fetchEntrypointSharedChunk(port, "shared-one")).toContain("before-shared");
    expect(await fetchEntrypointSharedChunk(port, "shared-two")).toContain("before-shared");
    expect((await fetchText(port, "/assets/root-marker.txt")).body).toBe("before-asset\n");

    writeFileSync(sharedSourcePath, 'export const sharedMessage = "after-shared";\n', "utf8");
    writeFileSync(rootAssetPath, "after-asset\n", "utf8");

    await waitFor(async () => {
      const firstSharedChunk = await fetchEntrypointSharedChunk(port, "shared-one");
      const secondSharedChunk = await fetchEntrypointSharedChunk(port, "shared-two");
      const rootAsset = await fetchText(port, "/assets/root-marker.txt");

      return (
        firstSharedChunk.includes("after-shared") &&
        secondSharedChunk.includes("after-shared") &&
        rootAsset.body === "after-asset\n"
      );
    });
  });

  it("returns HTTP 500 for a failed stanza rebuild and recovers after a fix", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "failureProbe"], { cwd, currentDate });
    const stylePath = join(cwd, "stanzas", "failure-probe", "style.scss");
    writeFileSync(stylePath, "main {\n  color: rgb(1, 2, 3);\n}\n", "utf8");
    const port = await findAvailablePort();

    await routeCliAsync(["s", "--port", String(port)], {
      cwd,
      onServeSession: (session) => {
        serveSessions.push(session);
      },
    });

    writeFileSync(stylePath, "main {\n  color: ;\n}\n", "utf8");

    await waitFor(async () => {
      const css = await fetchText(port, "/failure-probe.css");
      return css.status === 500 && css.body.includes("Sass compile failed");
    });

    writeFileSync(stylePath, "main {\n  color: rgb(7, 8, 9);\n}\n", "utf8");

    await waitFor(async () => {
      const css = await fetchText(port, "/failure-probe.css");
      return css.status === 200 && css.body.includes("rgb(7, 8, 9)");
    });
  });

  function makeTemporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), "togostanza-cli-"));
    temporaryDirectories.push(directory);
    return directory;
  }

  function makeNamedTemporaryDirectory(name: string): string {
    const parentDirectory = makeTemporaryDirectory();
    const directory = join(parentDirectory, name);
    mkdirSync(directory);
    return directory;
  }

  function makeStanzaRepoRoot(input: { scripts?: Record<string, string> } = {}): string {
    const directory = makeNamedTemporaryDirectory("repo");
    writeFileSync(
      join(directory, "package.json"),
      `${JSON.stringify(
        {
          dependencies: { togostanza: "^0.0.0" },
          name: "repo",
          ...(input.scripts ? { scripts: input.scripts } : {}),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return directory;
  }

  function readJson(path: string): unknown {
    return JSON.parse(readText(path));
  }
});

function writeMinimalStanza(rootDirectory: string, stanzaId: string, metadata: string): void {
  const stanzaDirectory = join(rootDirectory, "stanzas", stanzaId);
  mkdirSync(join(stanzaDirectory, "templates"), { recursive: true });
  writeFileSync(join(stanzaDirectory, "metadata.json"), `${metadata}\n`, "utf8");
  writeFileSync(
    join(stanzaDirectory, "index.js"),
    [
      "import Stanza from 'togostanza/stanza';",
      "",
      "export default class Probe extends Stanza {",
      "  render() {}",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(join(stanzaDirectory, "style.scss"), "", "utf8");
  writeFileSync(join(stanzaDirectory, "templates", "stanza.html.hbs"), "<main></main>\n", "utf8");
}

function makeMetastanzaCompatibilityRoot(rootDirectory: string): string {
  assertCompatLocalReferencesReady(repositoryRoot);

  const referenceRoot = join(repositoryRoot, "references", "metastanza");

  symlinkSync(join(referenceRoot, "package.json"), join(rootDirectory, "package.json"));
  symlinkSync(join(referenceRoot, "stanzas"), join(rootDirectory, "stanzas"), "dir");
  symlinkSync(join(referenceRoot, "common.scss"), join(rootDirectory, "common.scss"));
  symlinkSync(join(referenceRoot, "node_modules"), join(rootDirectory, "node_modules"), "dir");

  if (existsSync(join(referenceRoot, "assets"))) {
    symlinkSync(join(referenceRoot, "assets"), join(rootDirectory, "assets"), "dir");
  }

  return rootDirectory;
}

function makeTogoMediumCompatibilityRoot(rootDirectory: string): string {
  assertCompatLocalReferencesReady(repositoryRoot);

  const referenceRoot = join(repositoryRoot, "references", "togomedium-web");
  const stanzaPackageRoot = join(referenceRoot, "@packages", "stanza");
  const stanzaPackageNodeModules = join(stanzaPackageRoot, "node_modules");

  symlinkSync(join(stanzaPackageRoot, "package.json"), join(rootDirectory, "package.json"));
  symlinkSync(join(referenceRoot, "node_modules"), join(rootDirectory, "node_modules"), "dir");
  symlinkSync(join(stanzaPackageRoot, "components"), join(rootDirectory, "components"), "dir");
  symlinkSync(join(stanzaPackageRoot, "stanzas"), join(rootDirectory, "stanzas"), "dir");
  symlinkSync(join(stanzaPackageRoot, "styles"), join(rootDirectory, "styles"), "dir");
  symlinkSync(join(stanzaPackageRoot, "tsconfig.json"), join(rootDirectory, "tsconfig.json"));
  symlinkSync(join(stanzaPackageRoot, "utils"), join(rootDirectory, "utils"), "dir");
  writeFileSync(
    join(rootDirectory, "togostanza.config.ts"),
    [
      `const referenceRoot = ${JSON.stringify(referenceRoot)};`,
      "",
      "export default {",
      "  vite: {",
      "    resolve: {",
      "      alias: [",
      "        { find: /^%stanza\\//, replacement: `${referenceRoot}/@packages/stanza/` },",
      "        { find: /^%storybook\\//, replacement: `${referenceRoot}/@packages/storybook/src/` },",
      "        { find: /^%core\\//, replacement: `${referenceRoot}/@packages/core/src/` },",
      "        { find: /^%api\\//, replacement: `${referenceRoot}/@packages/api/src/` },",
      `        { find: "d3", replacement: ${JSON.stringify(join(stanzaPackageNodeModules, "d3"))} },`,
      `        { find: "d3-drag", replacement: ${JSON.stringify(join(stanzaPackageNodeModules, "d3-drag"))} },`,
      `        { find: "colord", replacement: ${JSON.stringify(join(stanzaPackageNodeModules, "colord"))} },`,
      `        { find: "sleep-promise", replacement: ${JSON.stringify(join(stanzaPackageNodeModules, "sleep-promise"))} },`,
      "      ],",
      "    },",
      "  },",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  return rootDirectory;
}

type FetchTextResult = {
  accessControlAllowOrigin: string;
  body: string;
  contentType: string;
  status: number;
};

async function fetchText(port: number, path: string): Promise<FetchTextResult> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: {
      origin: localCorsOrigin,
    },
  });

  return {
    accessControlAllowOrigin: response.headers.get("access-control-allow-origin") ?? "",
    body: await response.text(),
    contentType: response.headers.get("content-type") ?? "",
    status: response.status,
  };
}

type FetchOptionsResult = {
  accessControlAllowMethods: string;
  accessControlAllowOrigin: string;
  status: number;
};

async function fetchOptions(
  port: number,
  path: string,
  origin = localCorsOrigin,
): Promise<FetchOptionsResult> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: {
      "access-control-request-method": "GET",
      origin,
    },
    method: "OPTIONS",
  });

  return {
    accessControlAllowMethods: response.headers.get("access-control-allow-methods") ?? "",
    accessControlAllowOrigin: response.headers.get("access-control-allow-origin") ?? "",
    status: response.status,
  };
}

async function fetchEntrypointSharedChunk(port: number, stanzaId: string): Promise<string> {
  const entrypoint = await fetchText(port, `/${stanzaId}.js`);
  const match = /from"\.\/(_chunks\/[^"]+)"/.exec(entrypoint.body);

  if (!match) {
    throw new Error(`Expected ${stanzaId}.js to import a shared chunk.`);
  }

  const chunk = await fetchText(port, `/${match[1]}`);

  return chunk.body;
}

async function findAvailablePort(): Promise<number> {
  const server = await listenOnEphemeralPort();
  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("Expected ephemeral server address.");
  }

  const { port } = address;

  await closeServer(server);

  return port;
}

function listenOnEphemeralPort(): Promise<Server> {
  const server = createServer();

  return new Promise((resolveServer, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolveServer(server);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolveClose();
    });
    server.closeAllConnections();
  });
}

async function waitFor(predicate: () => Promise<boolean>): Promise<void> {
  const timeoutAt = Date.now() + 4_000;

  while (Date.now() < timeoutAt) {
    // eslint-disable-next-line no-await-in-loop -- polling needs each attempt result before waiting.
    if (await predicate()) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop -- polling intentionally waits between attempts.
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }

  throw new Error("Timed out waiting for condition.");
}

function expectNpmPagesWorkflow(workflow: string): void {
  expectCommonPagesWorkflow(workflow);
  expect(workflow).toContain("actions/setup-node@v6");
  expect(workflow).toContain("node-version: 24");
  expect(workflow).toContain("cache: npm");
  expect(workflow).toContain("cache-dependency-path: package-lock.json");
  expect(workflow).toContain("npm ci");
  expect(workflow).toContain("npm exec togostanza build");
  expect(workflow).not.toContain("pnpm/action-setup");
  expect(workflow).not.toContain("pnpm ci");
  expect(workflow).not.toContain("will be enabled in Phase 2");
}

function expectPnpmPagesWorkflow(workflow: string): void {
  expectCommonPagesWorkflow(workflow);
  expect(workflow).toContain("pnpm/action-setup@v6");
  expect(workflow).toContain("version: 11");
  expect(workflow).toContain("run_install: false");
  expect(workflow).toContain("actions/setup-node@v6");
  expect(workflow).toContain("node-version: 24");
  expect(workflow).toContain("cache: pnpm");
  expect(workflow).toContain("cache-dependency-path: pnpm-lock.yaml");
  expect(workflow).toContain("pnpm ci");
  expect(workflow).toContain("pnpm exec togostanza build");
  expect(workflow).not.toContain("- run: npm ci");
  expect(workflow).not.toContain("will be enabled in Phase 2");
}

function expectCommonPagesWorkflow(workflow: string): void {
  expect(workflow).toContain("name: Publish GitHub Pages");
  expect(workflow).toContain("workflow_dispatch");
  expect(workflow).toContain("branches:");
  expect(workflow).toContain("- main");
  expect(workflow).toContain("contents: read");
  expect(workflow).toContain("pages: write");
  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain("actions/checkout@v7");
  expect(workflow).toContain("actions/configure-pages@v6");
  expect(workflow).toContain("actions/upload-pages-artifact@v5");
  expect(workflow).toContain("path: dist");
  expect(workflow).toContain("actions/deploy-pages@v5");
}

function writeConfigImportFixture(rootDirectory: string): void {
  const packageDirectory = join(rootDirectory, "node_modules", "togostanza");
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    `${JSON.stringify(
      {
        exports: {
          "./config": {
            default: "./config.js",
            import: "./config.js",
            types: "./config.d.ts",
          },
        },
        name: "togostanza",
        type: "module",
        version: "0.0.0-fixture",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(packageDirectory, "config.js"),
    "export function defineTogoStanzaConfig(config) { return config; }\n",
    "utf8",
  );
  writeFileSync(
    join(packageDirectory, "config.d.ts"),
    "export declare function defineTogoStanzaConfig<T>(config: T): T;\n",
    "utf8",
  );
}

function writeReactRuntimeFixture(rootDirectory: string): void {
  linkReactPackages(rootDirectory);
  writeFileSync(
    join(rootDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react",
          module: "ESNext",
          moduleResolution: "bundler",
          target: "ES2024",
        },
        include: ["stanzas/**/*.tsx"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const stanzaDirectory = join(rootDirectory, "stanzas", "react-runtime-probe");
  mkdirSync(join(stanzaDirectory, "assets"), { recursive: true });
  writeFileSync(
    join(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "react-runtime-probe",
        "stanza:label": "React Runtime Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [
          { "stanza:key": "label", "stanza:type": "string" },
          { "stanza:key": "count", "stanza:type": "number" },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(stanzaDirectory, "index.tsx"),
    [
      'import React from "react";',
      'import { createRoot, type Root } from "react-dom/client";',
      'import Stanza from "togostanza/stanza";',
      "",
      "type ProbeProps = {",
      "  count: unknown;",
      "  label: unknown;",
      "  renderCount: number;",
      "};",
      "",
      "function Probe({ count, label, renderCount }: ProbeProps) {",
      "  return (",
      '    <section data-probe="react-runtime">',
      "      <h1>React runtime probe</h1>",
      "      <dl>",
      '        <dt>label</dt><dd data-probe="label">{String(label)}</dd>',
      '        <dt>count</dt><dd data-probe="count">{String(count)}</dd>',
      '        <dt>render count</dt><dd data-probe="render-count">{renderCount}</dd>',
      "      </dl>",
      "    </section>",
      "  );",
      "}",
      "",
      "export default class ReactRuntimeProbe extends Stanza {",
      "  private reactRoot?: Root;",
      "  private renderCount = 0;",
      "",
      "  render() {",
      "    this.renderCount += 1;",
      '    this.importWebFontCSS("./assets/react-runtime-font.css");',
      '    const main = this.root.querySelector("main");',
      "",
      "    if (!main) {",
      '      throw new Error("React Runtime Probe expected a main element.");',
      "    }",
      "",
      "    this.reactRoot ??= createRoot(main);",
      "    this.reactRoot.render(",
      "      <Probe",
      "        count={this.params.count}",
      "        label={this.params.label}",
      "        renderCount={this.renderCount}",
      "      />,",
      "    );",
      "  }",
      "",
      "  handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {",
      "    super.handleAttributeChange(name, oldValue, newValue);",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(join(stanzaDirectory, "style.scss"), "main { display: block; }\n", "utf8");
  writeFileSync(
    join(stanzaDirectory, "assets", "react-runtime-font.css"),
    ":host { --react-runtime-font: loaded; }\n",
    "utf8",
  );
}

function linkReactPackages(rootDirectory: string): void {
  linkNodePackages(rootDirectory, ["react", "react-dom"]);
}

function writeVueRuntimeFixture(rootDirectory: string): void {
  linkVuePackages(rootDirectory);
  const stanzaDirectory = join(rootDirectory, "stanzas", "vue-runtime-probe");
  mkdirSync(stanzaDirectory, { recursive: true });
  writeFileSync(
    join(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "vue-runtime-probe",
        "stanza:label": "Vue Runtime Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [{ "stanza:key": "label", "stanza:type": "string" }],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(stanzaDirectory, "index.js"),
    [
      'import Stanza from "togostanza/stanza";',
      'import { createApp } from "vue";',
      'import App from "./App.vue";',
      "",
      "export default class VueRuntimeProbe extends Stanza {",
      "  app = undefined;",
      "",
      "  render() {",
      '    const main = this.root.querySelector("main");',
      "",
      "    if (!main) {",
      '      throw new Error("Vue Runtime Probe expected a main element.");',
      "    }",
      "",
      "    this.app?.unmount();",
      "    this.app = createApp(App, {",
      '      label: this.params.label || "(missing label)",',
      "    });",
      "    this.app.mount(main);",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(stanzaDirectory, "App.vue"),
    [
      "<template>",
      '  <section class="vue-runtime-probe" data-probe="vue-runtime">',
      "    <h1>Vue runtime probe</h1>",
      '    <p data-probe="label">{{ label }}</p>',
      "  </section>",
      "</template>",
      "",
      "<script>",
      "export default {",
      "  props: {",
      "    label: {",
      "      type: String,",
      "      required: true,",
      "    },",
      "  },",
      "};",
      "</script>",
      "",
      "<style>",
      ".vue-runtime-probe {",
      "  color: rgb(12, 34, 56);",
      "}",
      "</style>",
      "",
    ].join("\n"),
    "utf8",
  );
}

function linkVuePackages(rootDirectory: string): void {
  linkNodePackages(rootDirectory, ["vue"]);
}

function writeUtilsCompatFixture(rootDirectory: string): void {
  installTogostanzaUtils(rootDirectory);
  cpSync(
    join(
      repositoryRoot,
      "workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo/stanzas/utils-probe",
    ),
    join(rootDirectory, "stanzas", "utils-probe"),
    { recursive: true },
  );
  writeFileSync(
    join(rootDirectory, "common.scss"),
    ":host {\n  --case-010-accent: #2f6f73;\n}\n",
    "utf8",
  );
  updateJson(join(rootDirectory, "stanzas", "utils-probe", "metadata.json"), {
    "stanza:style": [{ "stanza:default": "#2f6f73", "stanza:key": "--case-010-accent" }],
  });
}

function installTogostanzaUtils(rootDirectory: string): void {
  const nodeModulesDirectory = join(rootDirectory, "node_modules");
  mkdirSync(nodeModulesDirectory, { recursive: true });
  cpSync(
    join(repositoryRoot, "references", "togostanza-utils"),
    join(nodeModulesDirectory, "togostanza-utils"),
    {
      filter: (source) => !source.split(/[\\/]/).includes(".git"),
      recursive: true,
    },
  );
  linkNodePackages(rootDirectory, ["d3", "csv-stringify", "date-fns"]);
}

function linkNodePackages(rootDirectory: string, packageNames: readonly string[]): void {
  const nodeModulesDirectory = join(rootDirectory, "node_modules");
  mkdirSync(nodeModulesDirectory, { recursive: true });

  for (const packageName of packageNames) {
    symlinkSync(
      join(packageRoot, "node_modules", packageName),
      join(nodeModulesDirectory, packageName),
      "dir",
    );
  }
}

function updateJson(path: string, values: Record<string, unknown>): void {
  const current = JSON.parse(readText(path)) as Record<string, unknown>;
  writeFileSync(path, `${JSON.stringify({ ...current, ...values }, null, 2)}\n`, "utf8");
}

function formatLargeSvg(label: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">',
    `  <title>${label}</title>`,
    `  <!-- ${"x".repeat(5000)} -->`,
    "</svg>",
    "",
  ].join("\n");
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
