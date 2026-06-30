import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
    const cwd = makeTemporaryDirectory();
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
    const cwd = makeTemporaryDirectory();
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
});

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "togostanza-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
