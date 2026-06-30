import { spawn } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const temporaryDirectories: string[] = [];

test.afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("renders a custom element with an open shadow root", async ({ page }) => {
  await page.setContent(`
    <togostanza-smoke data-label="ready"></togostanza-smoke>
    <script type="module">
      class SmokeStanza extends HTMLElement {
        connectedCallback() {
          const root = this.attachShadow({ mode: "open" });
          const main = document.createElement("main");
          main.textContent = this.getAttribute("data-label") ?? "";
          root.append(main);
        }
      }

      customElements.define("togostanza-smoke", SmokeStanza);
    </script>
  `);

  const renderedText = await page
    .locator("togostanza-smoke")
    .evaluate((element) => element.shadowRoot?.querySelector("main")?.textContent);

  expect(renderedText).toBe("ready");
});

test("loads built Stanza custom elements from static module scripts", async ({ page }) => {
  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  await runCli(["generate", "stanza", "visibleMenu", "--timestamp", "2026-06-30"], cwd);
  await runCli(["generate", "stanza", "metadataNone", "--timestamp", "2026-06-30"], cwd);
  writeFileSync(
    resolve(cwd, "stanzas", "visible-menu", "style.scss"),
    "main {\n  color: rgb(1, 2, 3);\n}\n",
    "utf8",
  );
  updateMetadata(resolve(cwd, "stanzas", "metadata-none", "metadata.json"), {
    "stanza:menu-placement": "none",
  });
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/visible-menu.js"></script>
    <script type="module" src="./public/metadata-none.js"></script>
    <togostanza-visible-menu id="visible" say-to="runtime" togostanza-menu_placement="none"></togostanza-visible-menu>
    <togostanza-visible-menu id="attribute-hidden" togostanza-menu-placement="none"></togostanza-visible-menu>
    <togostanza-metadata-none id="metadata-hidden"></togostanza-metadata-none>
  </body>
</html>
`,
    "utf8",
  );
  const requestLog: string[] = [];
  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-visible-menu"));
    await page.waitForFunction(() => customElements.get("togostanza-metadata-none"));

    await expect
      .poll(() =>
        page.locator("#visible").evaluate((element) => {
          const main = element.shadowRoot?.querySelector("main");
          return main ? getComputedStyle(main).color : "";
        }),
      )
      .toBe("rgb(1, 2, 3)");

    await expect
      .poll(() =>
        page
          .locator("#visible")
          .evaluate((element) =>
            getComputedStyle(element).getPropertyValue("--greeting-color").trim(),
          ),
      )
      .toBe("#eb7900");

    const runtimeState = await page.locator("#visible").evaluate((element) => {
      const host = element as HTMLElement & {
        stanzaInstance?: {
          element?: Element;
          root?: ShadowRoot;
        };
      };

      return {
        elementConnected: host.stanzaInstance?.element === host,
        rootConnected: host.stanzaInstance?.root === host.shadowRoot,
      };
    });

    expect(runtimeState).toEqual({
      elementConnected: true,
      rootConnected: true,
    });

    await expect
      .poll(() =>
        page
          .locator("#visible")
          .evaluate((element) => element.shadowRoot?.querySelector("main")?.textContent?.trim()),
      )
      .toBe("Hello, runtime!");

    await page.locator("#visible").evaluate((element) => {
      element.setAttribute("say-to", "updated");
    });

    await expect
      .poll(() =>
        page.locator("#visible").evaluate((element) => {
          const main = element.shadowRoot?.querySelector("main");

          return {
            paragraphs: main?.querySelectorAll("p").length,
            text: main?.textContent?.trim(),
          };
        }),
      )
      .toEqual({
        paragraphs: 1,
        text: "Hello, updated!",
      });

    await expectMenuState(page, "#visible", {
      hidden: false,
      hrefSuffix: "/public/visible-menu.html",
      placement: "bottom-right",
    });
    await expectMenuState(page, "#attribute-hidden", {
      hidden: true,
      hrefSuffix: "/public/visible-menu.html",
      placement: "none",
    });
    await expectMenuState(page, "#metadata-hidden", {
      hidden: true,
      hrefSuffix: "/public/metadata-none.html",
      placement: "none",
    });

    expect(requestLog.some((requestPath) => requestPath.endsWith("/metadata.json"))).toBe(false);
  } finally {
    await closeServer(server);
  }
});

async function expectMenuState(
  page: Page,
  selector: string,
  expected: {
    hidden: boolean;
    hrefSuffix: string;
    placement: string;
  },
): Promise<void> {
  const state = await page.locator(selector).evaluate((element) => {
    const menu = element.shadowRoot?.querySelector<HTMLElement>("[data-togostanza-menu]");
    const aboutLink = menu?.querySelector<HTMLAnchorElement>("a");

    return {
      hidden: menu?.hidden,
      href: aboutLink?.href,
      placement: menu?.dataset.placement,
    };
  });

  expect(state.hidden).toBe(expected.hidden);
  expect(state.placement).toBe(expected.placement);
  expect(state.href).toBeDefined();
  expect(state.href?.endsWith(expected.hrefSuffix)).toBe(true);
}

function runCli(args: string[], cwd: string): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(packageRoot, "bin/togostanza.mjs"), ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      reject(new Error(`togostanza ${args.join(" ")} failed with ${code}: ${stderr}`));
    });
  });
}

function updateMetadata(path: string, values: Record<string, unknown>): void {
  const metadata = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  writeFileSync(path, `${JSON.stringify({ ...metadata, ...values }, null, 2)}\n`, "utf8");
}

function makeTemporaryDirectory(): string {
  const parentDirectory = mkdtempSync(resolve(tmpdir(), "togostanza-browser-"));
  const directory = resolve(parentDirectory, "repo");
  mkdirSync(directory);
  temporaryDirectories.push(parentDirectory);
  return directory;
}

function startStaticServer(rootDirectory: string, requestLog: string[]): Promise<Server> {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "/");
    requestLog.push(requestPath);

    if (requestPath.endsWith("/metadata.json")) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("metadata fetch is not part of Phase 2-2 runtime initialization");
      return;
    }

    const filePath = resolve(rootDirectory, `.${requestPath}`);

    if (!filePath.startsWith(rootDirectory) || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
      return;
    }

    response.writeHead(200, { "content-type": contentType(filePath) });
    createReadStream(filePath).pipe(response);
  });

  return new Promise((resolveServer, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolveServer(server);
    });
  });
}

function addressPort(server: Server): number {
  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("Expected HTTP server to listen on a local port.");
  }

  return address.port;
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
  });
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
