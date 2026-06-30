import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile, type FileImporter } from "sass";
import { build as viteBuild, type InlineConfig } from "vite";
import { getStringOption, parseOptions } from "./options.js";
import { resolveStanzaRepoContext } from "./repo-context.js";
import { failure, type CliResult } from "./result.js";
import { isValidStanzaId, titleCaseStanzaId } from "./stanza-id.js";

export type BuildOptions = {
  cwd?: string;
};

type StanzaDefinition = {
  definition?: string;
  directory: string;
  entrypointPath: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  metadataPath: string;
};

const outputMarkerFileName = ".togostanza-build-output";
const knownSourceOrControlDirectories = new Set([
  ".git",
  ".github",
  "assets",
  "lib",
  "node_modules",
  "stanzas",
]);

export async function handleBuild(
  args: readonly string[],
  options: BuildOptions = {},
): Promise<CliResult> {
  const parsedResult = parseOptions(args, [{ kind: "value", name: "--output-path" }]);

  if ("error" in parsedResult) {
    return parsedResult.error;
  }

  const { parsed } = parsedResult;

  if (parsed.positional.length > 0) {
    return failure(`Unexpected argument: ${parsed.positional[0]}`);
  }

  const cwd = options.cwd ?? process.cwd();
  const repoContextResult = resolveStanzaRepoContext(cwd);

  if ("error" in repoContextResult) {
    return failure(repoContextResult.error);
  }

  const outputPath = getStringOption(parsed, "--output-path") ?? "dist";
  const rootDirectory = repoContextResult.context.rootDirectory;
  const outputDirectoryResult = resolveOutputDirectory(rootDirectory, outputPath);

  if ("error" in outputDirectoryResult) {
    return failure(outputDirectoryResult.error);
  }

  const stanzaResult = discoverStanzas(rootDirectory);

  if ("error" in stanzaResult) {
    return failure(stanzaResult.error);
  }

  try {
    prepareOutputDirectory(outputDirectoryResult.outputDirectory, rootDirectory);
    writeOutputMarker(outputDirectoryResult.outputDirectory);
    await buildEntrypoints(stanzaResult.stanzas, outputDirectoryResult.outputDirectory);
    buildStyles(stanzaResult.stanzas, outputDirectoryResult.outputDirectory, rootDirectory);
    copyBuildAssets(stanzaResult.stanzas, outputDirectoryResult.outputDirectory, rootDirectory);
    writeHtmlFiles(stanzaResult.stanzas, outputDirectoryResult.outputDirectory);
  } catch (error) {
    return failure(formatBuildError(error));
  }

  return {
    exitCode: 0,
    stdout: `Built Stanza repository: ${repoContextResult.context.packageName} (output: ${outputPath}).`,
  };
}

function resolveOutputDirectory(
  rootDirectory: string,
  outputPath: string,
):
  | {
      outputDirectory: string;
    }
  | {
      error: string;
    } {
  if (outputPath.trim() === "") {
    return { error: "Invalid output path: output path must not be empty." };
  }

  const outputDirectory = resolve(rootDirectory, outputPath);
  const relativeOutputPath = relative(rootDirectory, outputDirectory);

  if (
    relativeOutputPath === "" ||
    relativeOutputPath === "." ||
    relativeOutputPath.startsWith("..") ||
    isAbsolute(relativeOutputPath)
  ) {
    return {
      error: `Invalid output path: ${outputPath} must be inside the Stanza repository root and not the root itself.`,
    };
  }

  const [firstPart] = relativeOutputPath.split(/[/\\]+/);

  if (firstPart && knownSourceOrControlDirectories.has(firstPart)) {
    return {
      error: `Invalid output path: ${outputPath} would overwrite source or control directory ${firstPart}.`,
    };
  }

  return { outputDirectory };
}

function discoverStanzas(rootDirectory: string):
  | {
      stanzas: StanzaDefinition[];
    }
  | {
      error: string;
    } {
  const stanzasDirectory = join(rootDirectory, "stanzas");

  if (!pathIsDirectory(stanzasDirectory)) {
    return { error: `No stanzas found: missing stanzas directory at ${stanzasDirectory}.` };
  }

  const stanzas: StanzaDefinition[] = [];

  for (const entryName of readdirSync(stanzasDirectory).toSorted()) {
    const stanzaDirectory = join(stanzasDirectory, entryName);

    if (!pathIsDirectory(stanzaDirectory)) {
      continue;
    }

    const metadataPath = join(stanzaDirectory, "metadata.json");

    if (!pathIsFile(metadataPath)) {
      continue;
    }

    const stanzaResult = readStanzaDefinition({
      directory: stanzaDirectory,
      directoryName: entryName,
      metadataPath,
    });

    if ("error" in stanzaResult) {
      return stanzaResult;
    }

    stanzas.push(stanzaResult.stanza);
  }

  if (stanzas.length === 0) {
    return { error: `No stanzas found: expected metadata.json files under ${stanzasDirectory}.` };
  }

  return { stanzas };
}

function readStanzaDefinition(input: {
  directory: string;
  directoryName: string;
  metadataPath: string;
}):
  | {
      stanza: StanzaDefinition;
    }
  | {
      error: string;
    } {
  const metadataResult = readMetadata(input.metadataPath);

  if ("error" in metadataResult) {
    return metadataResult;
  }

  const metadata = metadataResult.metadata;
  const id = metadata["@id"];

  if (typeof id !== "string") {
    return { error: `Invalid stanza metadata: @id must be a string at ${input.metadataPath}.` };
  }

  if (id !== input.directoryName) {
    return {
      error: `Invalid stanza metadata: @id ${id} must match directory name ${input.directoryName} at ${input.metadataPath}.`,
    };
  }

  if (!isValidStanzaId(id)) {
    return {
      error: `Invalid stanza metadata: @id is not a valid stanza id at ${input.metadataPath}.`,
    };
  }

  const entrypointResult = resolveEntrypoint(input.directory, id);

  if ("error" in entrypointResult) {
    return entrypointResult;
  }

  const label = readOptionalString(metadata, "stanza:label") ?? titleCaseStanzaId(id);
  const definition = readOptionalString(metadata, "stanza:definition");

  return {
    stanza: withOptionalDefinition({
      definition,
      directory: input.directory,
      entrypointPath: entrypointResult.entrypointPath,
      id,
      label,
      metadata,
      metadataPath: input.metadataPath,
    }),
  };
}

function readMetadata(metadataPath: string):
  | {
      metadata: Record<string, unknown>;
    }
  | {
      error: string;
    } {
  let value: unknown;

  try {
    value = JSON.parse(readFileSync(metadataPath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: `Invalid stanza metadata: malformed JSON at ${metadataPath}.` };
    }

    throw error;
  }

  if (!isRecord(value)) {
    return { error: `Invalid stanza metadata: expected an object at ${metadataPath}.` };
  }

  return { metadata: value };
}

function resolveEntrypoint(
  stanzaDirectory: string,
  stanzaId: string,
):
  | {
      entrypointPath: string;
    }
  | {
      error: string;
    } {
  for (const filename of ["index.tsx", "index.ts", "index.js"]) {
    const candidatePath = join(stanzaDirectory, filename);

    if (pathIsFile(candidatePath)) {
      return { entrypointPath: candidatePath };
    }
  }

  return {
    error: `Missing stanza entrypoint for ${stanzaId}: expected index.tsx, index.ts, or index.js in ${stanzaDirectory}.`,
  };
}

function prepareOutputDirectory(outputDirectory: string, rootDirectory: string): void {
  if (existsSync(outputDirectory)) {
    if (!pathIsDirectory(outputDirectory)) {
      throw new Error(`Output path exists and is not a directory: ${outputDirectory}`);
    }

    const entries = readdirSync(outputDirectory);
    const markerPath = join(outputDirectory, outputMarkerFileName);

    if (entries.length > 0 && !pathIsFile(markerPath)) {
      throw new Error(
        `Refusing to clean output directory without ${outputMarkerFileName}: ${outputDirectory}`,
      );
    }

    rmSync(outputDirectory, { force: true, recursive: true });
  }

  mkdirSync(outputDirectory, { recursive: true });

  if (!pathIsDirectory(rootDirectory)) {
    throw new Error(`Stanza repository root is not a directory: ${rootDirectory}`);
  }
}

function writeOutputMarker(outputDirectory: string): void {
  writeFileSync(
    join(outputDirectory, outputMarkerFileName),
    "Generated by togostanza build.\n",
    "utf8",
  );
}

async function buildEntrypoints(
  stanzas: readonly StanzaDefinition[],
  outputDirectory: string,
): Promise<void> {
  const wrapperDirectory = mkdtempSync(join(tmpdir(), "togostanza-build-"));
  const input = Object.fromEntries(
    stanzas.map((stanza) => {
      const wrapperPath = join(wrapperDirectory, `${stanza.id}.js`);
      writeFileSync(wrapperPath, formatEntrypointWrapper(stanza), "utf8");
      return [stanza.id, wrapperPath];
    }),
  );
  const config: InlineConfig = {
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      rollupOptions: {
        input,
        output: {
          chunkFileNames: "_chunks/[name]-[hash].js",
          entryFileNames: "[name].js",
        },
        treeshake: false,
      },
      sourcemap: true,
      target: "es2024",
    },
    configFile: false,
    logLevel: "silent",
    publicDir: false,
    resolve: {
      alias: {
        "togostanza/stanza": runtimeStubPath(),
      },
    },
  };

  try {
    await viteBuild(config);
  } finally {
    rmSync(wrapperDirectory, { force: true, recursive: true });
  }
}

function formatEntrypointWrapper(stanza: StanzaDefinition): string {
  const importPath = pathToFileURL(stanza.entrypointPath).href;

  return [
    'import { registerStanza } from "togostanza/stanza";',
    `import StanzaClass from ${JSON.stringify(importPath)};`,
    "",
    `const metadata = ${JSON.stringify(stanza.metadata, null, 2)};`,
    "",
    "registerStanza({",
    `  id: ${JSON.stringify(stanza.id)},`,
    `  tagName: ${JSON.stringify(`togostanza-${stanza.id}`)},`,
    `  cssUrl: new URL(${JSON.stringify(`./${stanza.id}.css`)}, import.meta.url),`,
    `  aboutUrl: new URL(${JSON.stringify(`./${stanza.id}.html`)}, import.meta.url),`,
    "  metadata,",
    "  StanzaClass,",
    "});",
    "",
    "export default StanzaClass;",
    "",
  ].join("\n");
}

function buildStyles(
  stanzas: readonly StanzaDefinition[],
  outputDirectory: string,
  rootDirectory: string,
): void {
  for (const stanza of stanzas) {
    const stylePath = join(stanza.directory, "style.scss");
    const cssPath = join(outputDirectory, `${stanza.id}.css`);
    const cssMapPath = `${cssPath}.map`;

    if (!pathIsFile(stylePath)) {
      writeFileSync(cssPath, `/*# sourceMappingURL=${stanza.id}.css.map */\n`, "utf8");
      writeFileSync(cssMapPath, `${JSON.stringify(emptySourceMap())}\n`, "utf8");
      continue;
    }

    try {
      const result = compile(stylePath, {
        importers: [createRootAliasImporter(rootDirectory)],
        sourceMap: true,
        sourceMapIncludeSources: true,
      });

      writeFileSync(
        cssPath,
        `${result.css.trimEnd()}\n/*# sourceMappingURL=${stanza.id}.css.map */\n`,
        "utf8",
      );
      writeFileSync(cssMapPath, `${JSON.stringify(result.sourceMap, null, 2)}\n`, "utf8");
    } catch (error) {
      throw new Error(
        `Sass compile failed for ${stanza.id} at ${stylePath}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}

function copyBuildAssets(
  stanzas: readonly StanzaDefinition[],
  outputDirectory: string,
  rootDirectory: string,
): void {
  copyDirectoryContents(join(rootDirectory, "assets"), join(outputDirectory, "assets"));

  for (const stanza of stanzas) {
    copyDirectoryContents(
      join(stanza.directory, "assets"),
      join(outputDirectory, stanza.id, "assets"),
    );
    mkdirSync(join(outputDirectory, stanza.id), { recursive: true });
    copyFileSync(stanza.metadataPath, join(outputDirectory, stanza.id, "metadata.json"));
  }
}

function writeHtmlFiles(stanzas: readonly StanzaDefinition[], outputDirectory: string): void {
  for (const stanza of stanzas) {
    const html = [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="utf-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1">',
      `    <title>${escapeHtml(stanza.label)}</title>`,
      `    <link rel="stylesheet" href="./${stanza.id}.css">`,
      "  </head>",
      "  <body>",
      `    <h1>${escapeHtml(stanza.label)}</h1>`,
      ...(stanza.definition ? [`    <p>${escapeHtml(stanza.definition)}</p>`] : []),
      `    <script type="module" src="./${stanza.id}.js"></script>`,
      "  </body>",
      "</html>",
      "",
    ].join("\n");

    writeFileSync(join(outputDirectory, `${stanza.id}.html`), html, "utf8");
  }
}

function copyDirectoryContents(sourceDirectory: string, destinationDirectory: string): void {
  if (!pathIsDirectory(sourceDirectory)) {
    return;
  }

  for (const entryName of readdirSync(sourceDirectory)) {
    if (entryName === ".keep") {
      continue;
    }

    const sourcePath = join(sourceDirectory, entryName);
    const destinationPath = join(destinationDirectory, entryName);

    if (pathIsDirectory(sourcePath)) {
      copyDirectoryContents(sourcePath, destinationPath);
      continue;
    }

    if (pathIsFile(sourcePath)) {
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

function createRootAliasImporter(rootDirectory: string): FileImporter<"sync"> {
  return {
    findFileUrl(url) {
      if (!url.startsWith("@/")) {
        return null;
      }

      return pathToFileURL(join(rootDirectory, url.slice(2)));
    },
  };
}

function runtimeStubPath(): string {
  const sourcePath = fileURLToPath(new URL("../runtime/stanza.ts", import.meta.url));

  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  return fileURLToPath(new URL("../runtime/stanza.js", import.meta.url));
}

function withOptionalDefinition(input: {
  definition: string | undefined;
  directory: string;
  entrypointPath: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  metadataPath: string;
}): StanzaDefinition {
  return {
    directory: input.directory,
    entrypointPath: input.entrypointPath,
    id: input.id,
    label: input.label,
    metadata: input.metadata,
    metadataPath: input.metadataPath,
    ...(input.definition ? { definition: input.definition } : {}),
  };
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const propertyValue = value[key];
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function emptySourceMap(): Record<string, unknown> {
  return {
    mappings: "",
    names: [],
    sources: [],
    version: 3,
  };
}

function pathIsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function pathIsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatBuildError(error: unknown): string {
  return `Build failed: ${errorMessage(error)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
