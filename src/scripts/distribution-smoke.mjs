#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, "../..");
const packageJson = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
const tscBinary = join(packageDirectory, "node_modules", ".bin", "tsc");
const temporaryRoot = mkdtempSync(join(tmpdir(), "togostanza-distribution-smoke-"));
const keepTemporaryRoot = process.env["TOGOSTANZA_KEEP_DISTRIBUTION_SMOKE"] === "1";

try {
  run("pnpm", ["run", "build"], { cwd: packageDirectory });

  const packDirectory = join(temporaryRoot, "pack");
  mkdirSync(packDirectory);
  run("pnpm", ["pack", "--pack-destination", packDirectory], { cwd: packageDirectory });

  const tarballPath = findSingleTarball(packDirectory);
  assertTarballContents(tarballPath);

  runInstallSmoke({
    binaryName: "togostanza",
    packageManager: "npm",
    projectDirectory: join(temporaryRoot, "npm-project"),
    tarballPath,
  });
  runInstallSmoke({
    binaryName: "togostanza",
    packageManager: "pnpm",
    projectDirectory: join(temporaryRoot, "pnpm-project"),
    tarballPath,
  });

  console.log(`Distribution smoke passed: ${packageJson.name}@${packageJson.version}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Temporary directory: ${temporaryRoot}`);
  process.exitCode = 1;
} finally {
  if (!keepTemporaryRoot && process.exitCode !== 1) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

function runInstallSmoke(input) {
  mkdirSync(input.projectDirectory, { recursive: true });
  writeFileSync(
    join(input.projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: `${input.packageManager}-distribution-smoke`,
        private: true,
        type: "module",
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (input.packageManager === "npm") {
    run("npm", ["install", "--no-audit", "--no-fund", input.tarballPath], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["add", input.tarballPath], { cwd: input.projectDirectory });
  }

  const binaryPath = join(input.projectDirectory, "node_modules", ".bin", input.binaryName);
  run(binaryPath, ["--version"], { cwd: input.projectDirectory });
  assertPublicSubpaths(input.projectDirectory);

  const stanzaRepoName = `${input.packageManager}-stanza`;
  run(
    binaryPath,
    [
      "init",
      "--name",
      stanzaRepoName,
      "--package-manager",
      input.packageManager,
      "--skip-install",
      "--skip-git",
    ],
    { cwd: input.projectDirectory },
  );

  const stanzaRepository = join(input.projectDirectory, stanzaRepoName);
  run(binaryPath, ["generate", "stanza", "hello"], { cwd: stanzaRepository });
  run(binaryPath, ["build"], { cwd: stanzaRepository });

  for (const outputPath of [
    join(stanzaRepository, "dist", "hello.js"),
    join(stanzaRepository, "dist", "hello.css"),
    join(stanzaRepository, "dist", "hello.html"),
    join(stanzaRepository, "dist", "hello", "metadata.json"),
  ]) {
    if (!existsSync(outputPath)) {
      throw new Error(`Expected build output was not created: ${outputPath}`);
    }
  }
}

function assertPublicSubpaths(projectDirectory) {
  writeFileSync(
    join(projectDirectory, "runtime-probe.mjs"),
    [
      'import Stanza from "togostanza/stanza";',
      'import { defineTogoStanzaConfig } from "togostanza/config";',
      "",
      'if (typeof Stanza !== "function") {',
      '  throw new Error("togostanza/stanza did not export a class");',
      "}",
      "",
      "if (defineTogoStanzaConfig({ marker: true }).marker !== true) {",
      '  throw new Error("togostanza/config did not export defineTogoStanzaConfig");',
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  run("node", ["runtime-probe.mjs"], { cwd: projectDirectory });

  writeFileSync(
    join(projectDirectory, "type-probe.ts"),
    [
      'import Stanza from "togostanza/stanza";',
      'import { defineTogoStanzaConfig } from "togostanza/config";',
      "",
      "class Probe extends Stanza {",
      "  render(): void {",
      "    this.renderTemplate({",
      '      template: "stanza.html.hbs",',
      "      parameters: this.params,",
      "    });",
      "  }",
      "}",
      "",
      "const config = defineTogoStanzaConfig({ vite: { define: { __PROBE__: true } } });",
      "void Probe;",
      "void config;",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(projectDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "ESNext",
          moduleResolution: "bundler",
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        include: ["type-probe.ts"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  run(tscBinary, ["--project", "tsconfig.json"], { cwd: projectDirectory });
}

function findSingleTarball(packDirectory) {
  const tarballs = readdirSync(packDirectory)
    .filter((entry) => entry.endsWith(".tgz"))
    .map((entry) => join(packDirectory, entry));

  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one tarball, found ${tarballs.length}`);
  }

  return tarballs[0];
}

function assertTarballContents(tarballPath) {
  const listing = run("tar", ["-tzf", tarballPath], { cwd: packageDirectory })
    .stdout.trim()
    .split("\n")
    .filter(Boolean);
  const entries = new Set(listing);
  const requiredEntries = [
    "package/bin/togostanza.mjs",
    "package/dist/cli.js",
    "package/dist/config.js",
    "package/dist/config.d.ts",
    "package/dist/stanza.js",
    "package/dist/stanza.d.ts",
    "package/package.json",
  ];

  for (const entry of requiredEntries) {
    if (!entries.has(entry)) {
      throw new Error(`Packed tarball is missing required entry: ${entry}`);
    }
  }

  const forbiddenPrefixes = [
    "package/src/",
    "package/dist/test/",
    "package/test/",
    "package/test-results/",
    "package/playwright.config.ts",
    "package/tsconfig.json",
    "package/vitest.config.ts",
    "package/vitest.integration.config.ts",
  ];
  const forbiddenEntry = listing.find((entry) =>
    forbiddenPrefixes.some((prefix) => entry.startsWith(prefix)),
  );

  if (forbiddenEntry) {
    throw new Error(`Packed tarball contains a development-only entry: ${forbiddenEntry}`);
  }
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        `cwd: ${options.cwd}`,
        result.stdout ? `stdout:\n${result.stdout.trimEnd()}` : "",
        result.stderr ? `stderr:\n${result.stderr.trimEnd()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return {
    stderr: result.stderr,
    stdout: result.stdout,
  };
}
