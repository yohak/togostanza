import { cpSync, createReadStream, mkdtempSync, rmSync, statSync, watch, } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { buildStanzaArtifacts } from "./build.js";
import { getStringOption, parseOptions } from "./options.js";
import { resolveStanzaRepoContext } from "./repo-context.js";
import { failure } from "./result.js";
import { formatStatusTimestamp } from "./status-time.js";
const defaultPort = 8080;
const listenHost = "127.0.0.1";
const watchDebounceMs = 80;
const ignoredWatchRoots = new Set([".git", "dist", "node_modules"]);
const shutdownSignals = ["SIGINT", "SIGTERM"];
export async function handleServe(args, options = {}) {
    const parsedResult = parseOptions(args, [{ kind: "value", name: "--port" }]);
    if ("error" in parsedResult) {
        return parsedResult.error;
    }
    const { parsed } = parsedResult;
    if (parsed.positional.length > 0) {
        return failure(`Unexpected argument: ${parsed.positional[0]}`);
    }
    const portResult = parsePort(getStringOption(parsed, "--port"));
    if ("error" in portResult) {
        return failure(portResult.error);
    }
    const cwd = options.cwd ?? process.cwd();
    const repoContextResult = resolveStanzaRepoContext(cwd);
    if ("error" in repoContextResult) {
        return failure(repoContextResult.error);
    }
    const rootDirectory = repoContextResult.context.rootDirectory;
    const outputDirectories = new Set();
    const initialBuild = await buildAll(rootDirectory, outputDirectories);
    let state = initialBuild.state;
    let closed = false;
    let rebuildTimer;
    let rebuildInProgress = false;
    let pendingAll = false;
    const pendingStanzaIds = new Set();
    const watchers = [];
    let removeSignalHandlers;
    let closePromise;
    const server = createServer((request, response) => {
        applyCorsHeaders(response, request.headers.origin, request.headers["access-control-request-headers"]);
        if (request.method === "OPTIONS") {
            response.writeHead(204);
            response.end();
            return;
        }
        const requestPath = safeDecodePath((request.url ?? "/").split("?")[0] ?? "/");
        if (!requestPath) {
            writePlainText(response, 400, "Bad request path.");
            return;
        }
        respond(requestPath, response, state);
    });
    if (options.watch ?? true) {
        try {
            watchers.push(watch(rootDirectory, { recursive: true }, (_eventType, filename) => {
                if (!filename || closed) {
                    return;
                }
                const target = classifyChangedPath(rootDirectory, String(filename), state);
                if (!target) {
                    return;
                }
                if (target.kind === "all") {
                    pendingAll = true;
                    pendingStanzaIds.clear();
                }
                else if (!pendingAll) {
                    pendingStanzaIds.add(target.id);
                }
                scheduleRebuild();
            }));
        }
        catch (error) {
            await cleanupServeResources(server, watchers, outputDirectories);
            return failure(`Failed to start file watcher: ${errorMessage(error)}`);
        }
    }
    const listenResult = await listen(server, portResult.port);
    if ("error" in listenResult) {
        await cleanupServeResources(server, watchers, outputDirectories);
        return failure(listenResult.error);
    }
    const session = {
        close: async () => {
            closePromise ??= closeServeSession();
            await closePromise;
        },
        port: listenResult.port,
    };
    removeSignalHandlers = installSignalHandlers(session);
    options.onServeSession?.(session);
    return {
        exitCode: 0,
        stdout: [
            `Serving Stanza repository: ${repoContextResult.context.packageName}`,
            `URL: http://${listenHost}:${listenResult.port}/`,
            formatInitialBuildStatus(initialBuild),
            "Press Ctrl-C to stop.",
        ].join("\n"),
    };
    async function closeServeSession() {
        closed = true;
        if (rebuildTimer) {
            clearTimeout(rebuildTimer);
            rebuildTimer = undefined;
        }
        removeSignalHandlers?.();
        removeSignalHandlers = undefined;
        await cleanupServeResources(server, watchers, outputDirectories);
    }
    function scheduleRebuild() {
        if (rebuildTimer) {
            clearTimeout(rebuildTimer);
        }
        rebuildTimer = setTimeout(() => {
            rebuildTimer = undefined;
            void runScheduledRebuild();
        }, watchDebounceMs);
    }
    async function runScheduledRebuild() {
        if (closed) {
            return;
        }
        if (rebuildInProgress) {
            scheduleRebuild();
            return;
        }
        rebuildInProgress = true;
        try {
            if (pendingAll || state.kind !== "ready") {
                pendingAll = false;
                pendingStanzaIds.clear();
                const rebuild = await buildAll(rootDirectory, outputDirectories);
                state = rebuild.state;
                options.progressOutput?.(formatAllRebuildStatus(rebuild));
                return;
            }
            const stanzaIds = [...pendingStanzaIds].toSorted();
            pendingStanzaIds.clear();
            for (const stanzaId of stanzaIds) {
                // eslint-disable-next-line no-await-in-loop -- each rebuild updates the serve state used by the next rebuild.
                const rebuild = await rebuildStanza(rootDirectory, outputDirectories, state, stanzaId);
                state = rebuild.state;
                options.progressOutput?.(formatStanzaRebuildStatus(stanzaId, rebuild));
            }
        }
        finally {
            rebuildInProgress = false;
            if (pendingAll || pendingStanzaIds.size > 0) {
                scheduleRebuild();
            }
        }
    }
}
function installSignalHandlers(session) {
    const disposers = shutdownSignals.map((signal) => {
        const handleSignal = () => {
            void session.close().finally(() => {
                process.kill(process.pid, signal);
            });
        };
        process.once(signal, handleSignal);
        return () => {
            process.off(signal, handleSignal);
        };
    });
    return () => {
        for (const dispose of disposers) {
            dispose();
        }
    };
}
async function buildAll(rootDirectory, outputDirectories) {
    const startedAt = performance.now();
    const outputDirectory = createServeOutputDirectory(outputDirectories);
    const result = await buildStanzaArtifacts({ outputDirectory, rootDirectory });
    const durationMs = elapsedMs(startedAt);
    if ("error" in result) {
        removeOutputDirectory(outputDirectory, outputDirectories);
        return {
            durationMs,
            state: {
                error: result.error,
                kind: "error",
            },
        };
    }
    removeOtherOutputDirectories(outputDirectory, outputDirectories);
    return {
        durationMs,
        state: {
            kind: "ready",
            outputDirectory,
            stanzaErrors: new Map(),
            stanzas: result.allStanzas,
        },
    };
}
async function rebuildStanza(rootDirectory, outputDirectories, state, stanzaId) {
    const startedAt = performance.now();
    const outputDirectory = createServeOutputDirectory(outputDirectories);
    cpSync(state.outputDirectory, outputDirectory, { recursive: true });
    removeStanzaOutputs(outputDirectory, stanzaId);
    const result = await buildStanzaArtifacts({
        outputDirectory,
        rootDirectory,
        stanzaIds: [stanzaId],
    });
    if ("error" in result) {
        removeOutputDirectory(outputDirectory, outputDirectories);
        const nextErrors = new Map(state.stanzaErrors);
        nextErrors.set(stanzaId, result.error);
        return {
            durationMs: elapsedMs(startedAt),
            state: {
                ...state,
                stanzaErrors: nextErrors,
            },
        };
    }
    removeOutputDirectory(state.outputDirectory, outputDirectories);
    const nextErrors = new Map(state.stanzaErrors);
    nextErrors.delete(stanzaId);
    return {
        durationMs: elapsedMs(startedAt),
        state: {
            kind: "ready",
            outputDirectory,
            stanzaErrors: nextErrors,
            stanzas: result.allStanzas,
        },
    };
}
function formatInitialBuildStatus(input) {
    const timestamp = formatStatusTimestamp();
    return input.state.kind === "ready"
        ? `${timestamp} Initial build completed in ${input.durationMs} ms.`
        : `${timestamp} Initial build failed in ${input.durationMs} ms.`;
}
function formatAllRebuildStatus(input) {
    const timestamp = formatStatusTimestamp();
    return input.state.kind === "ready"
        ? `${timestamp} Rebuilt all stanzas in ${input.durationMs} ms.`
        : `${timestamp} Rebuild failed in ${input.durationMs} ms.`;
}
function formatStanzaRebuildStatus(stanzaId, input) {
    const timestamp = formatStatusTimestamp();
    return input.state.stanzaErrors.has(stanzaId)
        ? `${timestamp} Rebuild failed for stanza ${stanzaId} in ${input.durationMs} ms.`
        : `${timestamp} Rebuilt stanza ${stanzaId} in ${input.durationMs} ms.`;
}
function elapsedMs(startedAt) {
    return Math.max(0, Math.round(performance.now() - startedAt));
}
function removeStanzaOutputs(outputDirectory, stanzaId) {
    for (const filename of [
        `${stanzaId}.css`,
        `${stanzaId}.css.map`,
        `${stanzaId}.html`,
        `${stanzaId}.js`,
        `${stanzaId}.js.map`,
    ]) {
        rmSync(join(outputDirectory, filename), { force: true });
    }
    rmSync(join(outputDirectory, stanzaId), { force: true, recursive: true });
}
function respond(requestPath, response, state) {
    if (state.kind === "error") {
        writeErrorPage(response, state.error);
        return;
    }
    if (requestPath === "/") {
        writeHtml(response, 200, formatIndexHtml(state.stanzas, state.stanzaErrors));
        return;
    }
    const requestStanzaId = stanzaIdFromRequestPath(requestPath, state.stanzas);
    if (requestStanzaId) {
        const stanzaError = state.stanzaErrors.get(requestStanzaId);
        if (stanzaError) {
            writeErrorPage(response, stanzaError);
            return;
        }
    }
    if (requestPath.endsWith(".html") && requestStanzaId) {
        const stanza = state.stanzas.find((candidate) => candidate.id === requestStanzaId);
        if (stanza) {
            writeHtml(response, 200, formatPreviewHtml(stanza));
            return;
        }
    }
    const filePath = resolve(state.outputDirectory, `.${requestPath}`);
    if (!pathIsInside(state.outputDirectory, filePath) || !pathIsFile(filePath)) {
        writePlainText(response, 404, "Not found.");
        return;
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    createReadStream(filePath).pipe(response);
}
function formatIndexHtml(stanzas, stanzaErrors) {
    const links = stanzas
        .map((stanza) => {
        const suffix = stanzaErrors.has(stanza.id) ? " (build error)" : "";
        return `      <li><a href="./${escapeHtml(stanza.id)}.html">${escapeHtml(stanza.label)}</a>${suffix}</li>`;
    })
        .join("\n");
    return [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1">',
        "    <title>TogoStanza development server</title>",
        "  </head>",
        "  <body>",
        "    <h1>Stanzas</h1>",
        "    <ul>",
        links,
        "    </ul>",
        "  </body>",
        "</html>",
        "",
    ].join("\n");
}
function formatPreviewHtml(stanza) {
    return [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1">',
        `    <title>${escapeHtml(stanza.label)}</title>`,
        `    <script type="module" src="./${escapeHtml(stanza.id)}.js"></script>`,
        "  </head>",
        "  <body>",
        `    <togostanza-${escapeHtml(stanza.id)}></togostanza-${escapeHtml(stanza.id)}>`,
        "  </body>",
        "</html>",
        "",
    ].join("\n");
}
function stanzaIdFromRequestPath(requestPath, stanzas) {
    const normalizedPath = requestPath.startsWith("/") ? requestPath.slice(1) : requestPath;
    const firstSegment = normalizedPath.split("/")[0] ?? "";
    if (firstSegment.endsWith(".html")) {
        return findStanzaId(stanzas, firstSegment.slice(0, -".html".length));
    }
    if (firstSegment.endsWith(".js")) {
        return findStanzaId(stanzas, firstSegment.slice(0, -".js".length));
    }
    if (firstSegment.endsWith(".css")) {
        return findStanzaId(stanzas, firstSegment.slice(0, -".css".length));
    }
    return findStanzaId(stanzas, firstSegment);
}
function findStanzaId(stanzas, id) {
    return stanzas.some((stanza) => stanza.id === id) ? id : undefined;
}
function classifyChangedPath(rootDirectory, filename, state) {
    const absolutePath = resolve(rootDirectory, filename);
    if (!pathIsInside(rootDirectory, absolutePath)) {
        return undefined;
    }
    const relativePath = relative(rootDirectory, absolutePath);
    const parts = relativePath.split(/[\\/]+/).filter(Boolean);
    const [firstPart, secondPart] = parts;
    if (!firstPart || ignoredWatchRoots.has(firstPart)) {
        return undefined;
    }
    if (firstPart !== "stanzas") {
        return { kind: "all" };
    }
    if (!secondPart) {
        return { kind: "all" };
    }
    if (state.kind === "ready" && state.stanzas.some((stanza) => stanza.id === secondPart)) {
        return { id: secondPart, kind: "stanza" };
    }
    return { kind: "all" };
}
function parsePort(value) {
    if (!value) {
        return { port: defaultPort };
    }
    if (!/^\d+$/.test(value)) {
        return { error: `Invalid port: ${value} must be an integer between 1 and 65535.` };
    }
    const port = Number(value);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        return { error: `Invalid port: ${value} must be an integer between 1 and 65535.` };
    }
    return { port };
}
function listen(server, port) {
    return new Promise((resolveListen) => {
        const handleError = (error) => {
            resolveListen({ error: `Failed to start serve: ${errorMessage(error)}` });
        };
        server.once("error", handleError);
        server.listen(port, listenHost, () => {
            server.off("error", handleError);
            const address = server.address();
            const resolvedPort = typeof address === "object" && address ? address.port : port;
            resolveListen({ port: resolvedPort });
        });
    });
}
async function cleanupServeResources(server, watchers, outputDirectories) {
    for (const watcher of watchers) {
        watcher.close();
    }
    await closeServer(server);
    const outputDirectoryList = Array.from(outputDirectories);
    for (const outputDirectory of outputDirectoryList) {
        removeOutputDirectory(outputDirectory, outputDirectories);
    }
}
function closeServer(server) {
    return new Promise((resolveClose, reject) => {
        if (!server.listening) {
            resolveClose();
            return;
        }
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
function createServeOutputDirectory(outputDirectories) {
    const outputDirectory = mkdtempSync(join(tmpdir(), "togostanza-serve-"));
    outputDirectories.add(outputDirectory);
    return outputDirectory;
}
function removeOtherOutputDirectories(keptOutputDirectory, outputDirectories) {
    const outputDirectoryList = Array.from(outputDirectories);
    for (const outputDirectory of outputDirectoryList) {
        if (outputDirectory !== keptOutputDirectory) {
            removeOutputDirectory(outputDirectory, outputDirectories);
        }
    }
}
function removeOutputDirectory(outputDirectory, outputDirectories) {
    rmSync(outputDirectory, { force: true, recursive: true });
    outputDirectories.delete(outputDirectory);
}
function writeErrorPage(response, message) {
    writeHtml(response, 500, [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1">',
        "    <title>TogoStanza build error</title>",
        "  </head>",
        "  <body>",
        "    <h1>TogoStanza build error</h1>",
        `    <pre>${escapeHtml(message)}</pre>`,
        "  </body>",
        "</html>",
        "",
    ].join("\n"));
}
function writeHtml(response, status, body) {
    response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
    response.end(body);
}
function writePlainText(response, status, body) {
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(body);
}
function applyCorsHeaders(response, origin, requestedHeaders) {
    const allowedOrigin = allowedCorsOrigin(origin);
    if (!allowedOrigin) {
        return;
    }
    response.setHeader("access-control-allow-origin", allowedOrigin);
    response.setHeader("access-control-allow-methods", "GET, HEAD, OPTIONS");
    response.setHeader("access-control-allow-headers", typeof requestedHeaders === "string" ? requestedHeaders : "content-type");
    response.setHeader("access-control-max-age", "600");
    response.setHeader("vary", "Origin");
}
function allowedCorsOrigin(origin) {
    if (typeof origin !== "string") {
        return undefined;
    }
    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== "http:" && protocol !== "https:") {
            return undefined;
        }
        return isLoopbackHostname(hostname) ? origin : undefined;
    }
    catch {
        return undefined;
    }
}
function isLoopbackHostname(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
function contentType(path) {
    switch (extname(path).toLowerCase()) {
        case ".css":
            return "text/css; charset=utf-8";
        case ".gif":
            return "image/gif";
        case ".html":
            return "text/html; charset=utf-8";
        case ".jpeg":
        case ".jpg":
            return "image/jpeg";
        case ".js":
        case ".mjs":
            return "text/javascript; charset=utf-8";
        case ".json":
            return "application/json; charset=utf-8";
        case ".png":
            return "image/png";
        case ".svg":
            return "image/svg+xml; charset=utf-8";
        case ".txt":
            return "text/plain; charset=utf-8";
        case ".webp":
            return "image/webp";
        case ".woff":
            return "font/woff";
        case ".woff2":
            return "font/woff2";
        default:
            return "application/octet-stream";
    }
}
function safeDecodePath(path) {
    try {
        return decodeURIComponent(path);
    }
    catch {
        return undefined;
    }
}
function pathIsInside(rootDirectory, candidatePath) {
    const relativePath = relative(rootDirectory, candidatePath);
    return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
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
function isFileNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function escapeHtml(value) {
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
//# sourceMappingURL=serve.js.map