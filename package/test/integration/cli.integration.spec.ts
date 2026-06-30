import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
  name: string;
  version: string;
};
const temporaryDirectories: string[] = [];

function runCli(
  args: string[],
  cwd = packageRoot,
): Promise<{
  code: number | null;
  stderr: string;
  stdout: string;
}> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [resolve(packageRoot, "bin/togostanza.mjs"), ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolveResult({ code, stderr, stdout });
    });
  });
}

describe("CLI smoke", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("prints the package identity through the bin entry", async () => {
    const result = await runCli(["--version"]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(`${packageJson.name}@${packageJson.version}`);
  });

  it("prints help through the bin entry", async () => {
    const result = await runCli(["--help"]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: togostanza [command]");
  });

  it("creates an init scaffold through the bin entry", async () => {
    const cwd = makeTemporaryDirectory();
    const result = await runCli(
      ["init", "--name", "generated-repo", "--skip-install", "--skip-git"],
      cwd,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Created Stanza repository: generated-repo");
    expect(readJson(resolve(cwd, "generated-repo", "package.json"))).toMatchObject({
      dependencies: {
        togostanza: `^${packageJson.version}`,
      },
      name: "generated-repo",
    });
    expect(
      readFileSync(resolve(cwd, "generated-repo", ".github", "workflows", "publish.yml"), "utf8"),
    ).toContain("workflow_dispatch");
  });

  it("creates an init scaffold in the current directory through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("current-repo");
    const result = await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Created Stanza repository: current-repo");
    expect(readJson(resolve(cwd, "package.json"))).toMatchObject({
      name: "current-repo",
    });
  });

  it("uses --name as a package name override for init . through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("Invalid Directory Name");
    const result = await runCli(
      ["init", ".", "--name", "explicit-name", "--skip-install", "--skip-git"],
      cwd,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(readJson(resolve(cwd, "package.json"))).toMatchObject({
      name: "explicit-name",
    });
  });

  it("keeps an existing .git directory for init . through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("git-repo");
    mkdirSync(resolve(cwd, ".git"));
    const result = await runCli(["init", ".", "--skip-install"], cwd);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(readJson(resolve(cwd, "package.json"))).toMatchObject({
      name: "git-repo",
    });
  });

  it("uses an existing lockfile to infer package manager for init . through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("pnpm-lock-repo");
    writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    const result = await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(readFileSync(resolve(cwd, ".github", "workflows", "publish.yml"), "utf8")).toContain(
      "for pnpm",
    );
  });

  it("rejects init . with an existing package.json through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("existing-package-repo");
    writeFileSync(resolve(cwd, "package.json"), "{}\n", "utf8");
    const result = await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Conflicting paths: package.json");
  });

  it("rejects init . package manager conflicts through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("conflicting-package-manager-repo");
    writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    const result = await runCli(
      ["init", ".", "--package-manager", "npm", "--skip-install", "--skip-git"],
      cwd,
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--package-manager npm conflicts with existing pnpm-lock.yaml");
  });

  for (const packageManager of ["npm", "pnpm"]) {
    it(`creates a ${packageManager} workflow placeholder through the bin entry`, async () => {
      const cwd = makeTemporaryDirectory();
      const result = await runCli(
        [
          "init",
          "--name",
          `${packageManager}-repo`,
          "--package-manager",
          packageManager,
          "--skip-install",
          "--skip-git",
        ],
        cwd,
      );

      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(
        readFileSync(
          resolve(cwd, `${packageManager}-repo`, ".github", "workflows", "publish.yml"),
          "utf8",
        ),
      ).toContain(`for ${packageManager}`);
    });
  }

  it("creates a stanza through the bin entry", async () => {
    const cwd = await makeStanzaRepoRoot();
    const result = await runCli(
      ["generate", "stanza", "helloWorld", "--label", "Hello World", "--timestamp", "2026-06-30"],
      cwd,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(readJson(resolve(cwd, "stanzas", "hello-world", "metadata.json"))).toMatchObject({
      "@id": "hello-world",
      "stanza:label": "Hello World",
      "stanza:created": "2026-06-30",
    });
  });

  it("creates a stanza through the short g alias", async () => {
    const cwd = await makeStanzaRepoRoot();
    const result = await runCli(["g", "stanza", "aliasProbe", "--timestamp", "2026-06-30"], cwd);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(readJson(resolve(cwd, "stanzas", "alias-probe", "metadata.json"))).toMatchObject({
      "@id": "alias-probe",
      "stanza:label": "Alias Probe",
    });
  });

  it("rejects unknown commands", async () => {
    const result = await runCli(["upgrade"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Unknown command: upgrade");
  });

  it("rejects generate stanza outside a Stanza repository root through the bin entry", async () => {
    const cwd = makeTemporaryDirectory();
    const result = await runCli(["generate", "stanza", "outside"], cwd);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("missing package.json");
  });

  it("rejects build outside a Stanza repository root through the bin entry", async () => {
    const cwd = makeTemporaryDirectory();
    const result = await runCli(["build"], cwd);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("missing package.json");
  });

  it("runs build preflight before the Phase 2-0 unimplemented diagnostic", async () => {
    const cwd = await makeStanzaRepoRoot();
    const result = await runCli(["build"], cwd);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Build is not implemented yet for Stanza repository: repo");
  });
});

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "togostanza-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}

function makeNamedTemporaryDirectory(name: string): string {
  const parentDirectory = makeTemporaryDirectory();
  const directory = resolve(parentDirectory, name);
  mkdirSync(directory);
  return directory;
}

async function makeStanzaRepoRoot(): Promise<string> {
  const directory = makeNamedTemporaryDirectory("repo");
  const result = await runCli(["init", ".", "--skip-install", "--skip-git"], directory);
  expect(result.code).toBe(0);
  return directory;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
