import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { packageMetadata } from "../index.js";
import { listCommandUsages } from "./commands.js";
import { routeCli } from "./router.js";
import type { CommandRunner } from "./runner.js";

const failingInstallRunner: CommandRunner = () => {
  throw new Error("install runner should not be called");
};

const failingGitRunner: CommandRunner = () => {
  throw new Error("git runner should not be called for existing .git");
};

describe("CLI router", () => {
  const temporaryDirectories: string[] = [];
  const currentDate = new Date("2026-06-30T00:00:00.000Z");
  const recognizedCommandExamples: readonly (readonly string[])[] = [["serve"], ["s"]];

  afterEach(() => {
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

  for (const args of recognizedCommandExamples) {
    it(`recognizes ${args.join(" ")} as an unimplemented command`, () => {
      const result = routeCli(args);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBeUndefined();
      expect(result.stderr).toContain("Command is not implemented yet:");
    });
  }

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
    const result = routeCli(["init", "--name", "generated-repo", "--skip-install", "--skip-git"], {
      cwd,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();

    const packageJson = readJson(join(cwd, "generated-repo", "package.json")) as {
      dependencies: Record<string, string>;
      license: string;
      packageManager?: string;
    };

    expect(packageJson.license).toBe("MIT");
    expect(packageJson.dependencies.togostanza).toBe(`^${packageMetadata.version}`);
    expect(packageJson.packageManager).toBeUndefined();
    expect(readText(join(cwd, "generated-repo", ".github", "workflows", "publish.yml"))).toContain(
      "workflow_dispatch",
    );
  });

  it("creates an init scaffold in the current directory", () => {
    const cwd = makeNamedTemporaryDirectory("current-repo");
    const result = routeCli(["init", ".", "--skip-install", "--skip-git"], {
      cwd,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(readJson(join(cwd, "package.json"))).toMatchObject({
      name: "current-repo",
    });
    expect(readText(join(cwd, ".github", "workflows", "publish.yml"))).toContain(
      "workflow_dispatch",
    );
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

    const result = routeCli(["init", ".", "--skip-git"], {
      cwd,
      installRunner,
    });

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

    const result = routeCli(["init", ".", "--skip-git"], {
      cwd,
      installRunner,
    });

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`pnpm install @ ${cwd}`]);
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
    expect(readText(join(cwd, "child-repo", ".github", "workflows", "publish.yml"))).toContain(
      "for pnpm",
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

    const result = routeCli(
      ["init", "--name", "pnpm-repo", "--package-manager", "pnpm", "--skip-git"],
      {
        cwd,
        installRunner,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`pnpm install @ ${join(cwd, "pnpm-repo")}`]);
    expect(readText(join(cwd, "pnpm-repo", ".github", "workflows", "publish.yml"))).toContain(
      "for pnpm",
    );
  });

  it("builds an npm install command when npm is selected", () => {
    const cwd = makeTemporaryDirectory();
    const calls: string[] = [];
    const installRunner: CommandRunner = (command, args, options) => {
      calls.push(`${command} ${args.join(" ")} @ ${options.cwd}`);
      return { exitCode: 0 };
    };

    const result = routeCli(
      ["init", "--name", "npm-repo", "--package-manager", "npm", "--skip-git"],
      {
        cwd,
        installRunner,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([`npm install @ ${join(cwd, "npm-repo")}`]);
    expect(readText(join(cwd, "npm-repo", ".github", "workflows", "publish.yml"))).toContain(
      "for npm",
    );
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

      const result = routeCli(["init", "--name", "inferred-repo", "--skip-git"], {
        cwd,
        installRunner,
      });

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
    expect(readJson(join(cwd, "stanzas", "alias-probe", "metadata.json"))).toMatchObject({
      "@id": "alias-probe",
      "stanza:label": "Alias Probe",
      "stanza:created": "2026-06-30",
    });
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

  it("rejects build outside a Stanza repository root", () => {
    const cwd = makeTemporaryDirectory();

    const result = routeCli(["build"], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing package.json");
  });

  it("rejects build when package.json is malformed", () => {
    const cwd = makeNamedTemporaryDirectory("malformed-build-repo");
    writeFileSync(join(cwd, "package.json"), "{ nope\n", "utf8");

    const result = routeCli(["build"], { cwd });

    expect(result).toEqual({
      exitCode: 1,
      stderr: `Invalid Stanza repository package.json: malformed JSON at ${join(cwd, "package.json")}.`,
    });
  });

  it("runs build preflight in a Stanza repository root before returning an unimplemented diagnostic", () => {
    const cwd = makeStanzaRepoRoot();

    expect(routeCli(["build", "--output-path", "public"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Build is not implemented yet for Stanza repository: repo (output: public).",
    });
  });

  it("supports the b alias for build preflight", () => {
    const cwd = makeStanzaRepoRoot();

    expect(routeCli(["b"], { cwd })).toEqual({
      exitCode: 1,
      stderr: "Build is not implemented yet for Stanza repository: repo (output: dist).",
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

  function makeStanzaRepoRoot(): string {
    const directory = makeNamedTemporaryDirectory("repo");
    writeFileSync(
      join(directory, "package.json"),
      `${JSON.stringify({ dependencies: { togostanza: "^0.0.0" }, name: "repo" }, null, 2)}\n`,
      "utf8",
    );
    return directory;
  }

  function readJson(path: string): unknown {
    return JSON.parse(readText(path));
  }
});

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
