#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
}

function safeFilePath(root, pathname, defaultPath) {
  const requestPath = pathname === "/" ? defaultPath : pathname;
  const relativePath = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const filePath = resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return null;
  }

  return filePath;
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

const options = parseArgs(process.argv.slice(2));
const port = Number(options.port);
const defaultPath = options.default;
const sparqlPath = options.sparql;
const root = resolve(process.cwd());

if (!Number.isInteger(port) || port <= 0 || !defaultPath) {
  console.error("Usage: static-fixture-server.mjs --port <port> --default <path> [--sparql <path>]");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (sparqlPath && url.pathname === sparqlPath) {
    const body = await readRequestBody(request);
    const contentType = request.headers["content-type"] ?? "";
    console.log(`SPARQL ${request.method} ${contentType} ${body}`);
    response.writeHead(200, { "content-type": "application/sparql-results+json; charset=utf-8" });
    response.end(JSON.stringify({ head: { vars: ["s"] }, results: { bindings: [] } }));
    return;
  }

  const filePath = safeFilePath(root, url.pathname, defaultPath);

  if (!filePath) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
});

server.listen(port, () => {
  console.log(`http://localhost:${port}${defaultPath}`);
});
