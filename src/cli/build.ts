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
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import vue from "@vitejs/plugin-vue";
import Handlebars from "handlebars";
import { compileString, type Importer } from "sass";
import { build as viteBuild, mergeConfig, type InlineConfig, type Plugin } from "vite";
import { loadTogoStanzaBuildConfig } from "./build-config.js";
import { getStringOption, parseOptions } from "./options.js";
import { resolveStanzaRepoContext } from "./repo-context.js";
import { failure, type CliResult } from "./result.js";
import { isValidStanzaId, titleCaseStanzaId } from "./stanza-id.js";

const require = createRequire(import.meta.url);

export type BuildOptions = {
  cwd?: string;
};

export type StanzaDefinition = {
  definition?: string;
  directory: string;
  entrypointPath: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  metadataPath: string;
  templates: Record<string, string>;
};

export type BuildStanzaArtifactsInput = {
  outputDirectory: string;
  prepareOutputDirectory?: boolean;
  rootDirectory: string;
  stanzaIds?: readonly string[];
};

export type BuildStanzaArtifactsResult =
  | {
      allStanzas: StanzaDefinition[];
      builtStanzas: StanzaDefinition[];
      warnings: string[];
    }
  | {
      error: string;
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

  const startedAt = performance.now();
  const buildResult = await buildStanzaArtifacts({
    outputDirectory: outputDirectoryResult.outputDirectory,
    prepareOutputDirectory: true,
    rootDirectory,
  });

  if ("error" in buildResult) {
    return failure(buildResult.error);
  }

  const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

  return {
    exitCode: 0,
    ...(buildResult.warnings.length > 0 ? { stderr: buildResult.warnings.join("\n") } : {}),
    stdout: `Built Stanza repository: ${repoContextResult.context.packageName} (output: ${outputPath}, duration: ${durationMs} ms).`,
  };
}

export async function buildStanzaArtifacts(
  input: BuildStanzaArtifactsInput,
): Promise<BuildStanzaArtifactsResult> {
  const stanzaResult = discoverStanzas(input.rootDirectory);

  if ("error" in stanzaResult) {
    return stanzaResult;
  }

  const selectedStanzaResult = selectStanzas(stanzaResult.stanzas, input.stanzaIds);

  if ("error" in selectedStanzaResult) {
    return selectedStanzaResult;
  }

  const buildConfigResult = await loadTogoStanzaBuildConfig(input.rootDirectory);

  if ("error" in buildConfigResult) {
    return { error: buildConfigResult.error };
  }

  try {
    if (input.prepareOutputDirectory) {
      prepareOutputDirectory(input.outputDirectory, input.rootDirectory);
      writeOutputMarker(input.outputDirectory);
    } else {
      mkdirSync(input.outputDirectory, { recursive: true });
    }

    await buildEntrypoints(
      selectedStanzaResult.stanzas,
      input.outputDirectory,
      input.rootDirectory,
      buildConfigResult.config.vite,
    );
    buildStyles(selectedStanzaResult.stanzas, input.outputDirectory, input.rootDirectory);
    copyBuildAssets(selectedStanzaResult.stanzas, input.outputDirectory, input.rootDirectory, {
      copyRootAssets: !input.stanzaIds,
    });
    writeHtmlFiles(selectedStanzaResult.stanzas, input.outputDirectory);
  } catch (error) {
    return { error: formatBuildError(error, input.rootDirectory) };
  }

  return {
    allStanzas: stanzaResult.stanzas,
    builtStanzas: selectedStanzaResult.stanzas,
    warnings: buildConfigResult.warnings,
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

function selectStanzas(
  stanzas: readonly StanzaDefinition[],
  stanzaIds: readonly string[] | undefined,
):
  | {
      stanzas: StanzaDefinition[];
    }
  | {
      error: string;
    } {
  if (!stanzaIds) {
    return { stanzas: [...stanzas] };
  }

  const selectedIds = new Set(stanzaIds);
  const selectedStanzas = stanzas.filter((stanza) => selectedIds.has(stanza.id));

  for (const id of selectedIds) {
    if (!selectedStanzas.some((stanza) => stanza.id === id)) {
      return { error: `No stanza found for targeted build: ${id}.` };
    }
  }

  return { stanzas: selectedStanzas };
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
  const templatesResult = readTemplates(input.directory, id);

  if ("error" in templatesResult) {
    return templatesResult;
  }

  return {
    stanza: withOptionalDefinition({
      definition,
      directory: input.directory,
      entrypointPath: entrypointResult.entrypointPath,
      id,
      label,
      metadata,
      metadataPath: input.metadataPath,
      templates: templatesResult.templates,
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
  rootDirectory: string,
  userViteConfig: InlineConfig | undefined,
): Promise<void> {
  const wrapperDirectory = mkdtempSync(join(tmpdir(), "togostanza-build-"));
  const input = Object.fromEntries(
    stanzas.map((stanza) => {
      const wrapperPath = join(wrapperDirectory, `${stanza.id}.js`);
      writeFileSync(wrapperPath, formatEntrypointWrapper(stanza), "utf8");
      return [stanza.id, wrapperPath];
    }),
  );
  const internalConfig: InlineConfig = {
    base: "./",
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      rollupOptions: {
        input,
        output: {
          assetFileNames: "_assets/[name]-[hash][extname]",
          chunkFileNames: "_chunks/[name]-[hash].js",
          entryFileNames: "[name].js",
        },
      },
      sourcemap: true,
      target: "es2024",
    },
    configFile: false,
    logLevel: "silent",
    plugins: [vue(), collectEntryCssPlugin(outputDirectory)],
    publicDir: false,
    resolve: {
      alias: {
        "handlebars/runtime.js": handlebarsRuntimePath(),
        "togostanza/internal/runtime": internalRuntimePath(),
        "togostanza/stanza": publicStanzaPath(),
      },
    },
    root: rootDirectory,
  };
  const config = mergeConfig(userViteConfig ?? {}, internalConfig);

  try {
    await viteBuild(config);
  } finally {
    rmSync(wrapperDirectory, { force: true, recursive: true });
  }
}

function collectEntryCssPlugin(outputDirectory: string): Plugin {
  const entryCssByName = new Map<string, string>();

  return {
    generateBundle(_options, bundle): void {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.isEntry) {
          continue;
        }

        const importedCss = readViteImportedCss(output);
        const cssParts = [...importedCss].flatMap((fileName) => {
          const asset = bundle[fileName];

          if (asset?.type !== "asset") {
            return [];
          }

          return [String(asset.source)];
        });

        if (cssParts.length > 0) {
          entryCssByName.set(output.name, cssParts.join("\n\n"));
        }
      }
    },
    name: "togostanza-entry-css-collector",
    writeBundle(): void {
      for (const [name, css] of entryCssByName) {
        writeFileSync(join(outputDirectory, `${name}.css`), `${css.trimEnd()}\n`, "utf8");
      }
    },
  };
}

function readViteImportedCss(output: unknown): Set<string> {
  if (!isRecord(output)) {
    return new Set();
  }

  const viteMetadata = output["viteMetadata"];

  if (!isRecord(viteMetadata)) {
    return new Set();
  }

  const importedCss = viteMetadata["importedCss"];

  return importedCss instanceof Set ? importedCss : new Set();
}

function formatEntrypointWrapper(stanza: StanzaDefinition): string {
  const importPath = pathToFileURL(stanza.entrypointPath).href;
  const templates = formatTemplates(stanza.templates);

  return [
    'import Handlebars from "handlebars/runtime.js";',
    'import { registerStanza } from "togostanza/internal/runtime";',
    `import StanzaClass from ${JSON.stringify(importPath)};`,
    "",
    `const metadata = ${JSON.stringify(stanza.metadata, null, 2)};`,
    `const templates = ${templates};`,
    "",
    "registerStanza({",
    `  id: ${JSON.stringify(stanza.id)},`,
    `  tagName: ${JSON.stringify(`togostanza-${stanza.id}`)},`,
    `  cssUrl: new URL(${JSON.stringify(`./${stanza.id}.css`)}, import.meta.url),`,
    `  aboutUrl: new URL(${JSON.stringify(`./${stanza.id}.html`)}, import.meta.url),`,
    `  assetBaseUrl: new URL(${JSON.stringify(`./${stanza.id}/assets/`)}, import.meta.url),`,
    "  metadata,",
    "  StanzaClass,",
    "  templates,",
    "});",
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
    const viteCss = readGeneratedCss(cssPath, stanza.id);

    if (!pathIsFile(stylePath)) {
      writeFileSync(cssPath, formatGeneratedCss([viteCss], `${stanza.id}.css.map`), "utf8");
      writeFileSync(cssMapPath, `${JSON.stringify(emptySourceMap())}\n`, "utf8");
      continue;
    }

    try {
      const result = compileString(
        preprocessSassSource(readFileSync(stylePath, "utf8"), rootDirectory),
        {
          importers: [createSassImporter(rootDirectory)],
          sourceMap: true,
          sourceMapIncludeSources: true,
          url: pathToFileURL(stylePath),
        },
      );
      const css = rewriteStanzaAssetUrls(result.css, stanza.id);

      writeFileSync(cssPath, formatGeneratedCss([viteCss, css], `${stanza.id}.css.map`), "utf8");
      writeFileSync(cssMapPath, `${JSON.stringify(result.sourceMap, null, 2)}\n`, "utf8");
    } catch (error) {
      throw new Error(
        `Sass compile failed for ${stanza.id} at ${stylePath}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}

function rewriteStanzaAssetUrls(css: string, stanzaId: string): string {
  return css.replace(
    /url\(\s*(["']?)(\.\/assets\/|assets\/)([^"')\s]+)\1\s*\)/g,
    (_match, quote: string, _prefix: string, assetPath: string) =>
      `url(${quote}./${stanzaId}/assets/${assetPath}${quote})`,
  );
}

function preprocessSassSource(source: string, rootDirectory: string): string {
  return source.replace(
    /(@(?:import|use|forward)\s+)(["'])\.\/(@[^"']+)\2/g,
    (_match, directive: string, quote: string, packagePath: string) => {
      const resolvedPath = join(rootDirectory, "node_modules", packagePath);
      return `${directive}${quote}${resolvedPath}${quote}`;
    },
  );
}

function readGeneratedCss(cssPath: string, stanzaId: string): string {
  if (!pathIsFile(cssPath)) {
    return "";
  }

  return readFileSync(cssPath, "utf8")
    .replace(
      new RegExp(String.raw`/\*# sourceMappingURL=${escapeRegExp(stanzaId)}\.css\.map \*/`, "g"),
      "",
    )
    .trim();
}

function formatGeneratedCss(parts: readonly string[], sourceMapFileName: string): string {
  const css = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");

  return `${css ? `${css}\n` : ""}/*# sourceMappingURL=${sourceMapFileName} */\n`;
}

function copyBuildAssets(
  stanzas: readonly StanzaDefinition[],
  outputDirectory: string,
  rootDirectory: string,
  options: { copyRootAssets?: boolean } = {},
): void {
  if (options.copyRootAssets ?? true) {
    copyDirectoryContents(join(rootDirectory, "assets"), join(outputDirectory, "assets"));
  }

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

function createSassImporter(rootDirectory: string): Importer<"sync"> {
  return {
    canonicalize(url) {
      if (url.startsWith("@/")) {
        return pathToFileURL(resolveSassImportPath(join(rootDirectory, url.slice(2))));
      }

      if (url.startsWith("./@")) {
        return pathToFileURL(
          resolveSassImportPath(join(rootDirectory, "node_modules", url.slice(2))),
        );
      }

      return null;
    },
    load(canonicalUrl) {
      if (canonicalUrl.protocol !== "file:") {
        return null;
      }

      return {
        contents: readFileSync(fileURLToPath(canonicalUrl), "utf8"),
        sourceMapUrl: canonicalUrl,
        syntax: "scss",
      };
    },
  };
}

function resolveSassImportPath(pathWithoutExtension: string): string {
  const candidates = [
    pathWithoutExtension,
    `${pathWithoutExtension}.scss`,
    `${pathWithoutExtension}.sass`,
    `${pathWithoutExtension}.css`,
    join(dirname(pathWithoutExtension), `_${basename(pathWithoutExtension)}.scss`),
    join(dirname(pathWithoutExtension), `_${basename(pathWithoutExtension)}.sass`),
    join(dirname(pathWithoutExtension), `_${basename(pathWithoutExtension)}.css`),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? pathWithoutExtension;
}

function publicStanzaPath(): string {
  const sourcePath = fileURLToPath(new URL("../stanza.ts", import.meta.url));

  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  return fileURLToPath(new URL("../stanza.js", import.meta.url));
}

function internalRuntimePath(): string {
  const sourcePath = fileURLToPath(new URL("../runtime/stanza.ts", import.meta.url));

  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  return fileURLToPath(new URL("../runtime/stanza.js", import.meta.url));
}

function handlebarsRuntimePath(): string {
  return require.resolve("handlebars/runtime.js");
}

function withOptionalDefinition(input: {
  definition: string | undefined;
  directory: string;
  entrypointPath: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  metadataPath: string;
  templates: Record<string, string>;
}): StanzaDefinition {
  return {
    directory: input.directory,
    entrypointPath: input.entrypointPath,
    id: input.id,
    label: input.label,
    metadata: input.metadata,
    metadataPath: input.metadataPath,
    templates: input.templates,
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

function readTemplates(
  stanzaDirectory: string,
  stanzaId: string,
):
  | {
      templates: Record<string, string>;
    }
  | {
      error: string;
    } {
  const templatesDirectory = join(stanzaDirectory, "templates");

  if (!pathIsDirectory(templatesDirectory)) {
    return { templates: {} };
  }

  const templates: Record<string, string> = {};

  for (const entryName of readdirSync(templatesDirectory).toSorted()) {
    const templatePath = join(templatesDirectory, entryName);

    if (!entryName.endsWith(".hbs") || !pathIsFile(templatePath)) {
      continue;
    }

    try {
      templates[entryName] = String(Handlebars.precompile(readFileSync(templatePath, "utf8")));
    } catch (error) {
      return {
        error: `Invalid template for ${stanzaId}: failed to precompile ${templatePath}: ${errorMessage(error)}.`,
      };
    }
  }

  return { templates };
}

function formatTemplates(templates: Record<string, string>): string {
  const entries = Object.entries(templates);

  if (entries.length === 0) {
    return "{}";
  }

  return [
    "{",
    ...entries.map(
      ([name, template]) => `  ${JSON.stringify(name)}: Handlebars.template(${template}),`,
    ),
    "}",
  ].join("\n");
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

function formatBuildError(error: unknown, rootDirectory: string): string {
  const message = errorMessage(error);
  const hint =
    isUnresolvedImportError(message) && tsconfigLikelyDefinesPaths(rootDirectory)
      ? " If this import relies on tsconfig compilerOptions.paths, configure the equivalent alias in togostanza.config.ts via vite.resolve.alias. Phase 2-4 does not resolve tsconfig paths directly."
      : "";

  return `Build failed: ${message}${hint}`;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isUnresolvedImportError(message: string): boolean {
  return (
    message.includes("failed to resolve import") ||
    message.includes("Could not resolve") ||
    message.includes("Could not load")
  );
}

function tsconfigLikelyDefinesPaths(rootDirectory: string): boolean {
  try {
    return /"paths"\s*:/.test(readFileSync(join(rootDirectory, "tsconfig.json"), "utf8"));
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    return false;
  }
}
