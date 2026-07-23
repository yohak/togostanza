#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, "../..");
const packageJson = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
const tscBinary = join(packageDirectory, "node_modules", ".bin", "tsc");
const temporaryRoot = mkdtempSync(join(tmpdir(), "togostanza-github-dependency-smoke-"));
const keepTemporaryRoot = process.env["TOGOSTANZA_KEEP_GITHUB_DEPENDENCY_SMOKE"] === "1";
const releaseRef = "phase-12-local-release-smoke";

try {
  run("pnpm", ["run", "build"], { cwd: packageDirectory });

  const releaseRepository = join(temporaryRoot, "release-repository");
  createLocalReleaseRepository(releaseRepository);

  const gitSpec = `git+${pathToFileURL(releaseRepository).href}#${releaseRef}`;
  runGitDependencyBootstrapSmoke({
    gitSpec,
    packageManager: "npm",
    projectDirectory: join(temporaryRoot, "npm-bootstrap"),
  });
  runGitDependencyBootstrapSmoke({
    gitSpec,
    packageManager: "pnpm",
    projectDirectory: join(temporaryRoot, "pnpm-bootstrap"),
  });
  runGitDependencyInstallSmoke({
    binaryName: "togostanza",
    gitSpec,
    packageManager: "npm",
    projectDirectory: join(temporaryRoot, "npm-project"),
  });
  runGitDependencyInstallSmoke({
    binaryName: "togostanza",
    gitSpec,
    packageManager: "pnpm",
    projectDirectory: join(temporaryRoot, "pnpm-project"),
  });

  console.log(
    `Git dependency smoke passed: ${packageJson.name}@${packageJson.version} (${gitSpec})`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Temporary directory: ${temporaryRoot}`);
  process.exitCode = 1;
} finally {
  if (!keepTemporaryRoot && process.exitCode !== 1) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

function createLocalReleaseRepository(releaseRepository) {
  mkdirSync(releaseRepository, { recursive: true });
  copyTrackedWorkingTree(releaseRepository);
  cpSync(join(packageDirectory, "dist"), join(releaseRepository, "dist"), {
    recursive: true,
  });

  run("git", ["init", "--initial-branch", "main"], { cwd: releaseRepository });
  run("git", ["config", "user.name", "TogoStanza Release Smoke"], {
    cwd: releaseRepository,
  });
  run("git", ["config", "user.email", "release-smoke@example.invalid"], {
    cwd: releaseRepository,
  });
  run("git", ["add", "."], { cwd: releaseRepository });
  run("git", ["add", "-f", "dist"], { cwd: releaseRepository });
  run("git", ["commit", "-m", "release smoke"], { cwd: releaseRepository });
  run("git", ["tag", releaseRef], { cwd: releaseRepository });

  const releaseFiles = new Set(
    run("git", ["ls-tree", "-r", "--name-only", releaseRef], {
      cwd: releaseRepository,
    })
      .stdout.trim()
      .split("\n")
      .filter(Boolean),
  );
  for (const requiredPath of [
    "bin/togostanza.mjs",
    "dist/cli.js",
    "dist/config.js",
    "dist/config.d.ts",
    "dist/stanza.js",
    "dist/stanza.d.ts",
    "package.json",
  ]) {
    if (!releaseFiles.has(requiredPath)) {
      throw new Error(`Local release ref is missing required path: ${requiredPath}`);
    }
  }
}

function copyTrackedWorkingTree(destination) {
  const trackedFiles = run("git", ["ls-files"], { cwd: packageDirectory })
    .stdout.trim()
    .split("\n")
    .filter(Boolean);

  for (const relativePath of trackedFiles) {
    const sourcePath = join(packageDirectory, relativePath);
    const destinationPath = join(destination, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath);
  }
}

function runGitDependencyBootstrapSmoke(input) {
  mkdirSync(input.projectDirectory, { recursive: true });
  writeFileSync(
    join(input.projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: `${input.packageManager}-github-dependency-bootstrap-smoke`,
        private: true,
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const initArgs = ["init", "--name", "bootstrap-stanza", "--skip-install", "--skip-git"];
  if (input.packageManager === "npm") {
    run("npm", ["exec", "--yes", "--package", input.gitSpec, "--", "togostanza", "--version"], {
      cwd: input.projectDirectory,
    });
    run("npm", ["exec", "--yes", "--package", input.gitSpec, "--", "togostanza", ...initArgs], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["--package", input.gitSpec, "dlx", "togostanza", "--version"], {
      cwd: input.projectDirectory,
    });
    run("pnpm", ["--package", input.gitSpec, "dlx", "togostanza", ...initArgs], {
      cwd: input.projectDirectory,
    });
  }

  const generatedPackageJson = JSON.parse(
    readFileSync(join(input.projectDirectory, "bootstrap-stanza", "package.json"), "utf8"),
  );
  if (generatedPackageJson.dependencies?.togostanza !== "github:yohak/togostanza#<tag-or-sha>") {
    throw new Error(
      [
        "Git dependency bootstrap init did not generate the placeholder dependency spec.",
        "expected: github:yohak/togostanza#<tag-or-sha>",
        `actual: ${generatedPackageJson.dependencies?.togostanza}`,
      ].join("\n"),
    );
  }
}

function runGitDependencyInstallSmoke(input) {
  mkdirSync(input.projectDirectory, { recursive: true });
  writeFileSync(
    join(input.projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        dependencies: {
          togostanza: input.gitSpec,
        },
        name: `${input.packageManager}-github-dependency-smoke`,
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
    run("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["install"], { cwd: input.projectDirectory });
  }

  assertInstalledPackageContents(input.projectDirectory);
  const binaryPath = join(input.projectDirectory, "node_modules", ".bin", input.binaryName);
  run(binaryPath, ["--version"], { cwd: input.projectDirectory });
  assertPublicSubpaths(input.projectDirectory);

  const stanzaRepoName = `${input.packageManager}-stanza`;
  run(
    binaryPath,
    ["init", "--name", stanzaRepoName, "--package-manager", input.packageManager, "--skip-git"],
    {
      cwd: input.projectDirectory,
      env: {
        TOGOSTANZA_DEPENDENCY_SPEC: input.gitSpec,
      },
    },
  );

  const stanzaRepository = join(input.projectDirectory, stanzaRepoName);
  const stanzaPackageJson = JSON.parse(
    readFileSync(join(stanzaRepository, "package.json"), "utf8"),
  );
  if (stanzaPackageJson.dependencies?.togostanza !== input.gitSpec) {
    throw new Error(
      [
        "Generated Stanza repository did not use the smoke dependency spec.",
        `expected: ${input.gitSpec}`,
        `actual: ${stanzaPackageJson.dependencies?.togostanza}`,
      ].join("\n"),
    );
  }

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

function assertInstalledPackageContents(projectDirectory) {
  const packageRoot = join(projectDirectory, "node_modules", "togostanza");
  for (const requiredPath of [
    "bin/togostanza.mjs",
    "dist/cli.js",
    "dist/config.js",
    "dist/config.d.ts",
    "dist/stanza.js",
    "dist/stanza.d.ts",
    "package.json",
  ]) {
    const absolutePath = join(packageRoot, requiredPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Installed Git dependency is missing required path: ${requiredPath}`);
    }
  }

  for (const forbiddenPath of ["docs", "references", "src", "test", "workbench"]) {
    const absolutePath = join(packageRoot, forbiddenPath);
    if (existsSync(absolutePath)) {
      throw new Error(`Installed Git dependency contains development path: ${forbiddenPath}`);
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

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
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
