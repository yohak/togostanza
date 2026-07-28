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
const expectedGithubMainSha = process.env["TOGOSTANZA_EXPECTED_GITHUB_MAIN_SHA"];
const releaseRef = `v${packageJson.version}-local-smoke`;

try {
  run("pnpm", ["run", "build"], { cwd: packageDirectory });

  const releaseRepository = join(temporaryRoot, "release-repository");
  createLocalReleaseRepository(releaseRepository);

  const defaultBranchGitSpec = `git+${pathToFileURL(releaseRepository).href}`;
  const gitSpec = `${defaultBranchGitSpec}#${releaseRef}`;
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
  runGitDependencyInstallSmoke({
    binaryName: "togostanza",
    gitSpec: defaultBranchGitSpec,
    packageManager: "npm",
    projectDirectory: join(temporaryRoot, "npm-main-project"),
  });
  runGitDependencyInstallSmoke({
    binaryName: "togostanza",
    gitSpec: defaultBranchGitSpec,
    packageManager: "pnpm",
    projectDirectory: join(temporaryRoot, "pnpm-main-project"),
  });
  runTaglessLockfileSmoke({
    gitSpec: defaultBranchGitSpec,
    packageManager: "npm",
    projectDirectory: join(temporaryRoot, "npm-lockfile-project"),
    releaseRepository,
  });
  runTaglessLockfileSmoke({
    gitSpec: defaultBranchGitSpec,
    packageManager: "pnpm",
    projectDirectory: join(temporaryRoot, "pnpm-lockfile-project"),
    releaseRepository,
  });
  if (expectedGithubMainSha) {
    runPublicGithubMainLockfileSmoke({
      packageManager: "npm",
      projectDirectory: join(temporaryRoot, "npm-public-main-project"),
    });
    runPublicGithubMainLockfileSmoke({
      packageManager: "pnpm",
      projectDirectory: join(temporaryRoot, "pnpm-public-main-project"),
    });
  }

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

function commitReleaseRepositoryPackageVersion(releaseRepository, version) {
  const packageJsonPath = join(releaseRepository, "package.json");
  const releasePackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  releasePackageJson.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(releasePackageJson, null, 2)}\n`, "utf8");
  run("git", ["add", "package.json"], { cwd: releaseRepository });
  run("git", ["commit", "-m", `release smoke ${version}`], { cwd: releaseRepository });
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

function runTaglessLockfileSmoke(input) {
  const initialVersion = readReleaseRepositoryPackageVersion(input.releaseRepository);
  const updatedVersion = nextPatchVersion(initialVersion);

  mkdirSync(input.projectDirectory, { recursive: true });
  writeFileSync(
    join(input.projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        dependencies: {
          togostanza: input.gitSpec,
        },
        name: `${input.packageManager}-tagless-lockfile-smoke`,
        private: true,
        type: "module",
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (input.packageManager === "pnpm") {
    writeFileSync(
      join(input.projectDirectory, "pnpm-workspace.yaml"),
      formatPnpmWorkspace(),
      "utf8",
    );
  }

  installProject(input);
  assertInstalledPackageVersion(input.projectDirectory, initialVersion);

  commitReleaseRepositoryPackageVersion(input.releaseRepository, updatedVersion);

  rmSync(join(input.projectDirectory, "node_modules"), { force: true, recursive: true });
  installProjectFrozen(input);
  assertInstalledPackageVersion(input.projectDirectory, initialVersion);

  updateProjectDependency(input);
  assertInstalledPackageVersion(input.projectDirectory, updatedVersion);
}

function runPublicGithubMainLockfileSmoke(input) {
  mkdirSync(input.projectDirectory, { recursive: true });
  writeFileSync(
    join(input.projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        dependencies: {
          togostanza: "github:yohak/togostanza",
        },
        name: `${input.packageManager}-public-main-lockfile-smoke`,
        private: true,
        type: "module",
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (input.packageManager === "pnpm") {
    writeFileSync(
      join(input.projectDirectory, "pnpm-workspace.yaml"),
      formatPnpmWorkspace(),
      "utf8",
    );
  }

  installProject(input);
  assertLockfileContains(input.projectDirectory, expectedGithubMainSha);
  assertInstalledPackageContents(input.projectDirectory);
  run(join(input.projectDirectory, "node_modules", ".bin", "togostanza"), ["--version"], {
    cwd: input.projectDirectory,
  });

  rmSync(join(input.projectDirectory, "node_modules"), { force: true, recursive: true });
  installProjectFrozen(input);
  assertLockfileContains(input.projectDirectory, expectedGithubMainSha);
  run(join(input.projectDirectory, "node_modules", ".bin", "togostanza"), ["--version"], {
    cwd: input.projectDirectory,
  });
}

function readReleaseRepositoryPackageVersion(releaseRepository) {
  const releasePackageJson = JSON.parse(
    readFileSync(join(releaseRepository, "package.json"), "utf8"),
  );
  return releasePackageJson.version;
}

function nextPatchVersion(version) {
  const alphaMatch = /^(\d+\.\d+\.\d+-alpha\.)(\d+)$/.exec(version);
  if (alphaMatch) {
    return `${alphaMatch[1]}${Number(alphaMatch[2]) + 1}`;
  }

  const stableMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (stableMatch) {
    return `${stableMatch[1]}.${stableMatch[2]}.${Number(stableMatch[3]) + 1}`;
  }

  throw new Error(`Cannot increment release smoke package version: ${version}`);
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
  if (input.packageManager === "pnpm") {
    writeFileSync(
      join(input.projectDirectory, "pnpm-workspace.yaml"),
      formatPnpmWorkspace(),
      "utf8",
    );
  }

  const initArgs = ["init", "--name", "bootstrap-stanza", "--skip-install", "--skip-git"];
  if (input.packageManager === "npm") {
    run("npm", ["exec", "--yes", "--package", input.gitSpec, "--", "togostanza", "--version"], {
      cwd: input.projectDirectory,
    });
    run("npm", ["exec", "--yes", "--package", input.gitSpec, "--", "togostanza", ...initArgs], {
      cwd: input.projectDirectory,
      env: {
        TOGOSTANZA_DEPENDENCY_SPEC: input.gitSpec,
      },
    });
  } else {
    run("pnpm", ["--package", input.gitSpec, "dlx", "togostanza", "--version"], {
      cwd: input.projectDirectory,
    });
    run("pnpm", ["--package", input.gitSpec, "dlx", "togostanza", ...initArgs], {
      cwd: input.projectDirectory,
      env: {
        TOGOSTANZA_DEPENDENCY_SPEC: input.gitSpec,
      },
    });
  }

  const generatedPackageJson = JSON.parse(
    readFileSync(join(input.projectDirectory, "bootstrap-stanza", "package.json"), "utf8"),
  );
  if (generatedPackageJson.devDependencies?.togostanza !== input.gitSpec) {
    throw new Error(
      [
        "Git dependency bootstrap init did not preserve the fixed dependency spec.",
        `expected: ${input.gitSpec}`,
        `actual: ${generatedPackageJson.devDependencies?.togostanza}`,
      ].join("\n"),
    );
  }
}

function installProject(input) {
  if (input.packageManager === "npm") {
    run("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["install"], { cwd: input.projectDirectory });
  }
}

function installProjectFrozen(input) {
  if (input.packageManager === "npm") {
    run("npm", ["ci", "--no-audit", "--no-fund"], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["install", "--frozen-lockfile"], { cwd: input.projectDirectory });
  }
}

function updateProjectDependency(input) {
  if (input.packageManager === "npm") {
    run("npm", ["install", "--no-audit", "--no-fund", `togostanza@${input.gitSpec}`], {
      cwd: input.projectDirectory,
    });
  } else {
    run("pnpm", ["update", "togostanza", "--latest", "--force"], {
      cwd: input.projectDirectory,
    });
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
  if (input.packageManager === "pnpm") {
    writeFileSync(
      join(input.projectDirectory, "pnpm-workspace.yaml"),
      formatPnpmWorkspace(),
      "utf8",
    );
  }

  installProject(input);

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
  if (stanzaPackageJson.devDependencies?.togostanza !== input.gitSpec) {
    throw new Error(
      [
        "Generated Stanza repository did not use the smoke dependency spec.",
        `expected: ${input.gitSpec}`,
        `actual: ${stanzaPackageJson.devDependencies?.togostanza}`,
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

function assertInstalledPackageVersion(projectDirectory, expectedVersion) {
  const installedPackageJsonPath = join(
    projectDirectory,
    "node_modules",
    "togostanza",
    "package.json",
  );
  const installedPackageJson = JSON.parse(readFileSync(installedPackageJsonPath, "utf8"));
  if (installedPackageJson.version !== expectedVersion) {
    throw new Error(
      [
        "Installed Git dependency version did not match the expected resolved commit.",
        `expected version: ${expectedVersion}`,
        `actual version: ${installedPackageJson.version}`,
      ].join("\n"),
    );
  }
}

function assertLockfileContains(projectDirectory, expectedText) {
  const lockfilePaths = ["package-lock.json", "pnpm-lock.yaml"].map((fileName) =>
    join(projectDirectory, fileName),
  );
  const lockfilePath = lockfilePaths.find((candidate) => existsSync(candidate));
  if (!lockfilePath) {
    throw new Error(`Expected a lockfile in ${projectDirectory}`);
  }

  const lockfileText = readFileSync(lockfilePath, "utf8");
  if (!lockfileText.includes(expectedText)) {
    throw new Error(
      [
        "Generated Stanza lockfile did not resolve the expected GitHub main commit.",
        `expected text: ${expectedText}`,
        `lockfile: ${lockfilePath}`,
      ].join("\n"),
    );
  }
}

function formatPnpmWorkspace() {
  return [
    "allowBuilds:",
    "  '@parcel/watcher': true",
    "  esbuild: true",
    "onlyBuiltDependencies:",
    "  - '@parcel/watcher'",
    "  - esbuild",
    "",
  ].join("\n");
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
