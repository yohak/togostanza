import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

describe("CLI router", () => {
  const temporaryDirectories: string[] = [];
  const currentDate = new Date("2026-06-30T00:00:00.000Z");
  const recognizedCommandExamples: readonly (readonly string[])[] = [
    ["build"],
    ["b"],
    ["serve"],
    ["s"],
  ];

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
    const cwd = makeTemporaryDirectory();
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
    const cwd = makeTemporaryDirectory();
    const result = routeCli(["g", "stanza", "aliasProbe"], { cwd, currentDate });

    expect(result.exitCode).toBe(0);
    expect(readJson(join(cwd, "stanzas", "alias-probe", "metadata.json"))).toMatchObject({
      "@id": "alias-probe",
      "stanza:label": "Alias Probe",
      "stanza:created": "2026-06-30",
    });
  });

  it("rejects generate stanza without an id", () => {
    expect(routeCli(["generate", "stanza"])).toEqual({
      exitCode: 1,
      stderr: "Missing required argument: id",
    });
  });

  it("rejects existing stanza destinations", () => {
    const cwd = makeTemporaryDirectory();

    routeCli(["generate", "stanza", "duplicate"], { cwd });

    expect(routeCli(["generate", "stanza", "duplicate"], { cwd })).toEqual({
      exitCode: 1,
      stderr: `Stanza already exists: ${join(cwd, "stanzas", "duplicate")}`,
    });
  });

  function makeTemporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), "togostanza-cli-"));
    temporaryDirectories.push(directory);
    return directory;
  }

  function readJson(path: string): unknown {
    return JSON.parse(readText(path));
  }
});

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
