import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
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

  it("keeps package subpath exports aligned with built files", () => {
    const manifest = readJson(resolve(packageRoot, "package.json")) as {
      exports: Record<string, Record<string, string>>;
    };

    expectExportTarget(manifest, "./config", "types", "./dist/config.d.ts");
    expectExportTarget(manifest, "./config", "import", "./dist/config.js");
    expectExportTarget(manifest, "./stanza", "types", "./dist/stanza.d.ts");
    expectExportTarget(manifest, "./stanza", "import", "./dist/stanza.js");

    const stanzaDeclaration = readFileSync(resolve(packageRoot, "dist/stanza.d.ts"), "utf8");
    expect(stanzaDeclaration).not.toContain("registerStanza");
    expect(stanzaDeclaration).not.toContain("createStanzaParams");
  });

  it("resolves Stanza developer imports through package subpath exports", () => {
    const cwd = makeTemporaryDirectory();
    mkdirSync(resolve(cwd, "node_modules"), { recursive: true });
    symlinkSync(packageRoot, resolve(cwd, "node_modules", "togostanza"), "dir");
    writeFileSync(
      resolve(cwd, "package.json"),
      `${JSON.stringify(
        {
          dependencies: {
            togostanza: "link:./node_modules/togostanza",
          },
          name: "stanza-type-probe",
          type: "module",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    writeFileSync(
      resolve(cwd, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            lib: ["ES2024", "DOM"],
            module: "ESNext",
            moduleResolution: "bundler",
            noEmit: true,
            strict: true,
            target: "ES2024",
          },
          include: ["index.ts"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    writeFileSync(
      resolve(cwd, "index.ts"),
      [
        'import { defineTogoStanzaConfig } from "togostanza/config";',
        'import Stanza from "togostanza/stanza";',
        "",
        "class Probe extends Stanza {",
        "  render(): void {",
        '    this.root.querySelector("main");',
        "    this.params.label;",
        "  }",
        "}",
        "",
        "void Probe;",
        "defineTogoStanzaConfig({",
        "  vite: {",
        "    define: {",
        "      __PROBE__: JSON.stringify(true),",
        "    },",
        "  },",
        "});",
        "",
      ].join("\n"),
      "utf8",
    );

    execFileSync(
      process.execPath,
      [
        resolve(packageRoot, "node_modules", "typescript", "bin", "tsc"),
        "--noEmit",
        "--project",
        cwd,
      ],
      { cwd },
    );
  });

  it("creates an init scaffold through the bin entry", async () => {
    const cwd = makeTemporaryDirectory();
    const result = await runCli(
      [
        "init",
        "--name",
        "generated-repo",
        "--package-manager",
        "npm",
        "--skip-install",
        "--skip-git",
      ],
      cwd,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Created Stanza repository: generated-repo");
    const readme = readFileSync(resolve(cwd, "generated-repo", "README.md"), "utf8");
    const tsConfig = readJson(resolve(cwd, "generated-repo", "tsconfig.json")) as {
      compilerOptions: Record<string, unknown>;
    };
    expect(readJson(resolve(cwd, "generated-repo", "package.json"))).toMatchObject({
      dependencies: {
        togostanza: `^${packageJson.version}`,
      },
      name: "generated-repo",
      scripts: {
        build: "togostanza build",
        serve: "togostanza serve",
      },
    });
    expect(readme).toContain("npm run build");
    expect(readme).toContain("npm run serve");
    expect(readme).toContain("GitHub Pages");
    expect(readme).toContain("package-lock.json");
    expect(tsConfig.compilerOptions.moduleResolution).toBe("bundler");
    expectNpmPagesWorkflow(
      readFileSync(resolve(cwd, "generated-repo", ".github", "workflows", "publish.yml"), "utf8"),
    );
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
    expectPnpmPagesWorkflow(
      readFileSync(resolve(cwd, ".github", "workflows", "publish.yml"), "utf8"),
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
    it(`creates a ${packageManager} Pages workflow through the bin entry`, async () => {
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
      const workflow = readFileSync(
        resolve(cwd, `${packageManager}-repo`, ".github", "workflows", "publish.yml"),
        "utf8",
      );

      if (packageManager === "pnpm") {
        expectPnpmPagesWorkflow(workflow);
      } else {
        expectNpmPagesWorkflow(workflow);
      }
    });
  }

  it("creates a pnpm Pages workflow for init . --package-manager pnpm through the bin entry", async () => {
    const cwd = makeNamedTemporaryDirectory("explicit-pnpm-current-repo");
    const result = await runCli(
      ["init", ".", "--package-manager", "pnpm", "--skip-install", "--skip-git"],
      cwd,
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expectPnpmPagesWorkflow(
      readFileSync(resolve(cwd, ".github", "workflows", "publish.yml"), "utf8"),
    );
  });

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

  it("builds generated stanza artifacts through the bin entry", async () => {
    const cwd = await makeStanzaRepoRoot();
    const generateResult = await runCli(
      ["generate", "stanza", "helloWorld", "--timestamp", "2026-06-30"],
      cwd,
    );
    expect(generateResult.code).toBe(0);
    writeFileSync(resolve(cwd, "assets", "root-asset.txt"), "root\n", "utf8");
    writeFileSync(
      resolve(cwd, "stanzas", "hello-world", "assets", "local-asset.txt"),
      "local\n",
      "utf8",
    );

    const result = await runCli(["build", "--output-path", "public"], cwd);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Built Stanza repository: repo");
    expect(result.stderr).toBe("");
    expect(existsSync(resolve(cwd, "public", "hello-world.js"))).toBe(true);
    expect(existsSync(resolve(cwd, "public", "hello-world.js.map"))).toBe(true);
    expect(existsSync(resolve(cwd, "public", "hello-world.css"))).toBe(true);
    expect(existsSync(resolve(cwd, "public", "hello-world.css.map"))).toBe(true);
    expect(existsSync(resolve(cwd, "public", "hello-world.html"))).toBe(true);
    expect(existsSync(resolve(cwd, "public", "hello-world", "metadata.json"))).toBe(true);
    expect(readFileSync(resolve(cwd, "public", "assets", "root-asset.txt"), "utf8")).toBe("root\n");
    expect(
      readFileSync(resolve(cwd, "public", "hello-world", "assets", "local-asset.txt"), "utf8"),
    ).toBe("local\n");
    const script = readFileSync(resolve(cwd, "public", "hello-world.js"), "utf8");
    expect(script).not.toContain("togostanza/stanza");
    expect(script).not.toContain("__togostanzaBuildEntries");
    expect(script).toContain('"@id"');
    expect(script).toContain("hello-world");
    expect(script).toContain("customElements.define");
    expect(readJson(resolve(cwd, "public", "hello-world", "metadata.json"))).toMatchObject({
      "@id": "hello-world",
    });
    expect(existsSync(resolve(cwd, "public", "index.html"))).toBe(false);
    expect(existsSync(resolve(cwd, "public", "-togostanza"))).toBe(false);
  });

  it("serves generated stanza artifacts through the bin entry", async () => {
    const cwd = await makeStanzaRepoRoot();
    const generateResult = await runCli(
      ["generate", "stanza", "serveProbe", "--timestamp", "2026-06-30"],
      cwd,
    );
    expect(generateResult.code).toBe(0);
    const port = await findAvailablePort();
    const outputDirectoriesBeforeServe = new Set(listServeOutputDirectories());
    const child = startCli(["serve", "--port", String(port)], cwd);

    try {
      await child.waitForStdout(`http://127.0.0.1:${port}/`);

      expect(existsSync(resolve(cwd, "dist"))).toBe(false);

      const index = await fetchText(port, "/");
      expect(index.status).toBe(200);
      expect(index.body).toContain("./serve-probe.html");

      const script = await fetchText(port, "/serve-probe.js");
      expect(script.status).toBe(200);
      expect(script.contentType).toContain("text/javascript");
      expect(script.body).toContain("customElements.define");
    } finally {
      await child.close();
    }

    const outputDirectoriesAfterClose = listServeOutputDirectories().filter(
      (directory) => !outputDirectoriesBeforeServe.has(directory),
    );
    expect(outputDirectoriesAfterClose).toEqual([]);
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

function expectExportTarget(
  manifest: { exports: Record<string, Record<string, string>> },
  subpath: string,
  condition: "import" | "types",
  expectedPath: string,
): void {
  const actualPath = manifest.exports[subpath]?.[condition];

  expect(actualPath).toBe(expectedPath);
  expect(existsSync(resolve(packageRoot, expectedPath))).toBe(true);
}

type RunningCli = {
  close(): Promise<void>;
  process: ChildProcess;
  waitForStdout(text: string): Promise<void>;
};

type FetchTextResult = {
  body: string;
  contentType: string;
  status: number;
};

function startCli(args: string[], cwd = packageRoot): RunningCli {
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

  return {
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      const closed = waitForChildClose(child);
      child.kill("SIGTERM");
      await closed;
    },
    process: child,
    waitForStdout: async (text: string) => {
      await waitFor(
        () => stdout.includes(text),
        () => {
          return `Timed out waiting for stdout ${JSON.stringify(text)}. stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`;
        },
      );
    },
  };
}

async function fetchText(port: number, path: string): Promise<FetchTextResult> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);

  return {
    body: await response.text(),
    contentType: response.headers.get("content-type") ?? "",
    status: response.status,
  };
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

function listServeOutputDirectories(): string[] {
  return readdirSync(tmpdir())
    .filter((entry) => entry.startsWith("togostanza-serve-"))
    .map((entry) => resolve(tmpdir(), entry))
    .toSorted();
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

function waitForChildClose(child: ChildProcess): Promise<void> {
  return new Promise((resolveClose) => {
    child.on("close", () => {
      resolveClose();
    });
  });
}

async function waitFor(predicate: () => boolean, formatError: () => string): Promise<void> {
  const timeoutAt = Date.now() + 4_000;

  while (Date.now() < timeoutAt) {
    if (predicate()) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop -- polling intentionally waits between attempts.
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }

  throw new Error(formatError());
}

function expectNpmPagesWorkflow(workflow: string): void {
  expectCommonPagesWorkflow(workflow);
  expect(workflow).toContain("cache: npm");
  expect(workflow).toContain("cache-dependency-path: package-lock.json");
  expect(workflow).toContain("npm ci");
  expect(workflow).toContain("npm exec togostanza build");
  expect(workflow).not.toContain("pnpm/action-setup");
  expect(workflow).not.toContain("pnpm install --frozen-lockfile");
  expect(workflow).not.toContain("will be enabled in Phase 2");
}

function expectPnpmPagesWorkflow(workflow: string): void {
  expectCommonPagesWorkflow(workflow);
  expect(workflow).toContain("pnpm/action-setup@v6");
  expect(workflow).toContain("version: 10");
  expect(workflow).toContain("run_install: false");
  expect(workflow).toContain("cache: pnpm");
  expect(workflow).toContain("cache-dependency-path: pnpm-lock.yaml");
  expect(workflow).toContain("pnpm install --frozen-lockfile");
  expect(workflow).toContain("pnpm exec togostanza build");
  expect(workflow).not.toContain("npm ci");
  expect(workflow).not.toContain("will be enabled in Phase 2");
}

function expectCommonPagesWorkflow(workflow: string): void {
  expect(workflow).toContain("workflow_dispatch");
  expect(workflow).toContain("branches:");
  expect(workflow).toContain("- main");
  expect(workflow).toContain("pages: write");
  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain("actions/checkout@v7");
  expect(workflow).toContain("actions/setup-node@v6");
  expect(workflow).toContain("node-version: 24");
  expect(workflow).toContain("actions/configure-pages@v6");
  expect(workflow).toContain("actions/upload-pages-artifact@v5");
  expect(workflow).toContain("path: dist");
  expect(workflow).toContain("actions/deploy-pages@v5");
}
