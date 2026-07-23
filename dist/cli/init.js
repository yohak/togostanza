import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getBooleanOption, getStringOption, parseOptions } from "./options.js";
import { resolvePackageManager } from "./package-manager.js";
import { failure, success } from "./result.js";
import { runCommand } from "./runner.js";
const defaultTogoStanzaDependencySpec = "github:yohak/togostanza#<tag-or-sha>";
export function handleInit(args, options = {}) {
    const parsedResult = parseOptions(args, [
        { kind: "value", name: "--name" },
        { kind: "value", name: "--package-manager" },
        { kind: "boolean", name: "--skip-install" },
        { kind: "boolean", name: "--skip-git" },
        { kind: "value", name: "--license" },
    ]);
    if ("error" in parsedResult) {
        return parsedResult.error;
    }
    const { parsed } = parsedResult;
    if (parsed.positional.length > 1) {
        return failure(`Unexpected argument: ${parsed.positional[1]}`);
    }
    const target = parsed.positional[0];
    if (target && target !== ".") {
        return failure(`Unexpected argument: ${parsed.positional[0]}`);
    }
    const name = getStringOption(parsed, "--name");
    const cwd = options.cwd ?? process.cwd();
    const initCurrentDirectory = target === ".";
    if (!initCurrentDirectory && !name) {
        return failure("Missing required option: --name <dir>");
    }
    const packageName = name ?? basename(cwd);
    if (!isValidPackageName(packageName)) {
        if (name) {
            return failure(`Invalid package name for --name: ${name}`);
        }
        return failure(`Invalid package name for current directory: ${packageName}`);
    }
    const destination = initCurrentDirectory ? cwd : join(cwd, packageName);
    const packageManagerResult = resolvePackageManager(withOptionalRootDirectory({
        explicitPackageManager: getStringOption(parsed, "--package-manager"),
        rootDirectory: initCurrentDirectory ? destination : undefined,
        useLockfile: initCurrentDirectory,
    }));
    if ("error" in packageManagerResult) {
        return failure(packageManagerResult.error);
    }
    if (initCurrentDirectory) {
        const collisionResult = findInitCurrentDirectoryCollisions(destination);
        if (collisionResult.length > 0) {
            return failure(`Cannot initialize in a non-empty directory. Conflicting paths: ${collisionResult.join(", ")}`);
        }
    }
    const license = getStringOption(parsed, "--license") ?? "MIT";
    const dependencySpec = resolveTogoStanzaDependencySpec();
    if (!getBooleanOption(parsed, "--skip-install") && isPlaceholderDependencySpec(dependencySpec)) {
        return failure("Cannot install placeholder dependency github:yohak/togostanza#<tag-or-sha>. Replace <tag-or-sha>, set TOGOSTANZA_DEPENDENCY_SPEC, or rerun init with --skip-install.");
    }
    try {
        createScaffold({
            dependencySpec,
            destination,
            license,
            name: packageName,
            packageManager: packageManagerResult.packageManager,
            useExistingDirectory: initCurrentDirectory,
        });
    }
    catch (error) {
        if (isFileExistsError(error)) {
            return failure(`Destination already exists: ${destination}`);
        }
        throw error;
    }
    if (!getBooleanOption(parsed, "--skip-git") && !hasExistingGitDirectory(destination)) {
        const gitResult = (options.gitRunner ?? runCommand)("git", ["init", "-b", "main"], {
            cwd: destination,
        });
        if (gitResult.exitCode !== 0) {
            return failure(formatRunnerFailure("git init", gitResult));
        }
    }
    if (!getBooleanOption(parsed, "--skip-install")) {
        const installCommand = formatInstallCommand(packageManagerResult.packageManager);
        const installResult = (options.installRunner ?? runCommand)(installCommand.command, installCommand.args, {
            cwd: destination,
        });
        if (installResult.exitCode !== 0) {
            return failure(formatRunnerFailure(`${installCommand.command} ${installCommand.args.join(" ")}`, installResult));
        }
    }
    return success(`Created Stanza repository: ${packageName}`);
}
export function formatInstallCommand(packageManager) {
    return {
        args: ["install"],
        command: packageManager,
    };
}
function createScaffold(input) {
    if (!input.useExistingDirectory) {
        mkdirSync(input.destination);
    }
    mkdirSync(join(input.destination, ".github", "workflows"), { recursive: true });
    mkdirSync(join(input.destination, "assets"));
    mkdirSync(join(input.destination, "lib"));
    writeFileSync(join(input.destination, "package.json"), formatJson(createPackageJson(input)), "utf8");
    writeFileSync(join(input.destination, "README.md"), formatReadme(input), "utf8");
    writeFileSync(join(input.destination, "tsconfig.json"), formatJson(createTsConfig()), "utf8");
    writeFileSync(join(input.destination, ".gitignore"), "node_modules/\ndist/\n", "utf8");
    writeFileSync(join(input.destination, "common.scss"), "/* Shared stylesheet for stanzas. */\n", "utf8");
    writeFileSync(join(input.destination, "assets", ".keep"), "", "utf8");
    writeFileSync(join(input.destination, "lib", ".keep"), "", "utf8");
    writeFileSync(join(input.destination, ".github", "workflows", "publish.yml"), formatPagesWorkflow(input.packageManager), "utf8");
}
function formatReadme(input) {
    const installCommand = input.packageManager === "pnpm" ? "pnpm install" : "npm install";
    const buildCommand = input.packageManager === "pnpm" ? "pnpm build" : "npm run build";
    const serveCommand = input.packageManager === "pnpm" ? "pnpm serve" : "npm run serve";
    const generateCommand = input.packageManager === "pnpm"
        ? "pnpm exec togostanza generate stanza hello"
        : "npm exec togostanza generate stanza hello";
    const lockfile = input.packageManager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json";
    const workflowInstall = input.packageManager === "pnpm" ? "pnpm install --frozen-lockfile" : "npm ci";
    const workflowBuild = input.packageManager === "pnpm" ? "pnpm exec togostanza build" : "npm exec togostanza build";
    const lockfileGuidance = input.packageManager === "pnpm"
        ? `Commit \`${lockfile}\` generated with pnpm 10 so the workflow can run reproducible installs with \`${workflowInstall}\`.`
        : `Commit \`${lockfile}\` so the workflow can run reproducible installs with \`${workflowInstall}\`.`;
    const skipInstallGuidance = input.packageManager === "pnpm"
        ? "If this repository was initialized with `--skip-install`, run the install command locally with pnpm 10 and commit the generated lockfile before pushing to `main`."
        : "If this repository was initialized with `--skip-install`, run the install command locally and commit the generated lockfile before pushing to `main`.";
    const dependencyGuidance = input.dependencySpec === defaultTogoStanzaDependencySpec
        ? "If `package.json` contains `github:yohak/togostanza#<tag-or-sha>`, replace `<tag-or-sha>` with the TogoStanza release tag or commit SHA before installing dependencies."
        : `This repository depends on \`${input.dependencySpec}\`.`;
    return [
        `# ${input.name}`,
        "",
        "A TogoStanza repository.",
        "",
        dependencyGuidance,
        "",
        "## Development",
        "",
        "Install dependencies before building or serving the repository:",
        "",
        "```sh",
        installCommand,
        "```",
        "",
        "Build the Stanza artifacts into `dist/`:",
        "",
        "```sh",
        buildCommand,
        "```",
        "",
        "Start the local development server:",
        "",
        "```sh",
        serveCommand,
        "```",
        "",
        "Add a new Stanza source:",
        "",
        "```sh",
        generateCommand,
        "```",
        "",
        "The `build` and `serve` package scripts call `togostanza build` and `togostanza serve`.",
        "",
        "## GitHub Pages",
        "",
        "The generated GitHub Pages workflow installs dependencies, runs `togostanza build`, uploads `dist/` as a Pages artifact, and deploys it.",
        "",
        lockfileGuidance,
        `The workflow builds with \`${workflowBuild}\`.`,
        "",
        skipInstallGuidance,
        "",
    ].join("\n");
}
function createPackageJson(input) {
    return {
        name: input.name,
        version: "0.0.1",
        private: true,
        license: input.license,
        scripts: {
            build: "togostanza build",
            serve: "togostanza serve",
        },
        dependencies: {
            togostanza: input.dependencySpec,
        },
        engines: {
            node: ">=24.5.0",
        },
        ...(input.packageManager === "pnpm"
            ? {
                pnpm: {
                    onlyBuiltDependencies: ["@parcel/watcher", "esbuild"],
                },
            }
            : {}),
    };
}
function resolveTogoStanzaDependencySpec() {
    return process.env["TOGOSTANZA_DEPENDENCY_SPEC"]?.trim() || defaultTogoStanzaDependencySpec;
}
function isPlaceholderDependencySpec(dependencySpec) {
    return dependencySpec.includes("<tag-or-sha>");
}
function createTsConfig() {
    return {
        compilerOptions: {
            allowJs: true,
            checkJs: false,
            module: "ESNext",
            moduleResolution: "bundler",
            noEmit: true,
            skipLibCheck: true,
            strict: true,
            target: "ES2022",
        },
        include: ["stanzas/**/*", "lib/**/*", "togostanza.config.ts"],
    };
}
function formatPagesWorkflow(packageManager) {
    const setupSteps = packageManager === "pnpm"
        ? [
            "      - uses: pnpm/action-setup@v6",
            "        with:",
            "          version: 10",
            "          run_install: false",
            "      - uses: actions/setup-node@v6",
            "        with:",
            "          node-version: 24",
            "          cache: pnpm",
            "          cache-dependency-path: pnpm-lock.yaml",
        ]
        : [
            "      - uses: actions/setup-node@v6",
            "        with:",
            "          node-version: 24",
            "          cache: npm",
            "          cache-dependency-path: package-lock.json",
        ];
    const installCommand = packageManager === "pnpm" ? "pnpm install --frozen-lockfile" : "npm ci";
    const buildCommand = packageManager === "pnpm" ? "pnpm exec togostanza build" : "npm exec togostanza build";
    return [
        "name: Publish GitHub Pages",
        "",
        "on:",
        "  push:",
        "    branches:",
        "      - main",
        "  workflow_dispatch:",
        "",
        "permissions:",
        "  contents: read",
        "  pages: write",
        "  id-token: write",
        "",
        "concurrency:",
        "  group: pages",
        "  cancel-in-progress: false",
        "",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v7",
        ...setupSteps,
        "      - uses: actions/configure-pages@v6",
        `      - run: ${installCommand}`,
        `      - run: ${buildCommand}`,
        "      - uses: actions/upload-pages-artifact@v5",
        "        with:",
        "          path: dist",
        "",
        "  deploy:",
        "    needs: build",
        "    runs-on: ubuntu-latest",
        "    environment:",
        "      name: github-pages",
        "      url: ${{ steps.deployment.outputs.page_url }}",
        "    steps:",
        "      - id: deployment",
        "        uses: actions/deploy-pages@v5",
        "",
    ].join("\n");
}
function isValidPackageName(name) {
    return /^[a-z0-9][a-z0-9._-]*$/.test(name) && name !== "." && name !== "..";
}
function findInitCurrentDirectoryCollisions(directory) {
    return readdirSync(directory)
        .map((name) => ({
        isAllowedPreflightMarker: isAllowedPreflightMarker(directory, name),
        name,
    }))
        .filter((entry) => !entry.isAllowedPreflightMarker)
        .map((entry) => entry.name)
        .toSorted();
}
function isAllowedPreflightMarker(directory, name) {
    if (name === "package-lock.json" || name === "pnpm-lock.yaml") {
        return pathIsFile(join(directory, name));
    }
    return name === ".git" && hasExistingGitDirectory(directory);
}
function pathIsFile(path) {
    try {
        return statSync(path).isFile();
    }
    catch (error) {
        if (isFileNotFound(error)) {
            return false;
        }
        throw error;
    }
}
function hasExistingGitDirectory(directory) {
    try {
        return statSync(join(directory, ".git")).isDirectory();
    }
    catch (error) {
        if (isFileNotFound(error)) {
            return false;
        }
        throw error;
    }
}
function basename(path) {
    const parts = path.split(/[/\\]+/).filter(Boolean);
    return parts.at(-1) ?? "";
}
function withOptionalRootDirectory(input) {
    return {
        ...(input.explicitPackageManager
            ? { explicitPackageManager: input.explicitPackageManager }
            : {}),
        ...(input.rootDirectory ? { rootDirectory: input.rootDirectory } : {}),
        useLockfile: input.useLockfile,
    };
}
function formatJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function formatRunnerFailure(label, result) {
    const detail = result.stderr?.trim();
    if (detail) {
        return `${label} failed with exit code ${result.exitCode}: ${detail}`;
    }
    return `${label} failed with exit code ${result.exitCode}.`;
}
function isFileExistsError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
function isFileNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
//# sourceMappingURL=init.js.map