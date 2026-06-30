import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { packageMetadata } from "../index.js";
import { listCommandUsages } from "./commands.js";
import type { CliResult } from "./result.js";
import { routeCli as routeCliRaw, type CliRouteOptions } from "./router.js";
import type { CommandRunner } from "./runner.js";

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

async function routeCliAsync(
  args: readonly string[],
  options: CliRouteOptions = {},
): Promise<CliResult> {
  return await routeCliRaw(args, options);
}

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

  it("rejects build outside a Stanza repository root", async () => {
    const cwd = makeTemporaryDirectory();

    const result = await routeCliAsync(["build"], { cwd });

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

  it("supports the b alias for build output generation", async () => {
    const cwd = makeStanzaRepoRoot();
    routeCli(["generate", "stanza", "buildProbe"], { cwd, currentDate });

    const result = await routeCliAsync(["b"], { cwd });

    expect(result).toEqual({
      exitCode: 0,
      stdout: "Built Stanza repository: repo (output: dist).",
    });
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
    expect(result.stdout).toBe("Built Stanza repository: repo (output: dist).");
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
