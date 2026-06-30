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

test("maps runtime parameters in built Stanza custom elements", async ({ page }) => {
  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeParameterProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/parameter-probe.js"></script>
    <togostanza-parameter-probe
      id="flag-present"
      label="flag-present"
      count="42"
      flag
      payload='{"kind":"present","values":[1,2]}'
      mode="compact"
      note="hello"
    ></togostanza-parameter-probe>
    <togostanza-parameter-probe
      id="flag-absent"
      label="flag-absent"
      count="0"
      payload='{"kind":"absent","enabled":false}'
      mode="comfortable"
      note="absent"
    ></togostanza-parameter-probe>
    <togostanza-parameter-probe
      id="flag-string-false"
      label="flag-string-false"
      count="7.5"
      flag="false"
      payload='["false-string",{"nested":true}]'
      mode="compact"
      note="string false"
    ></togostanza-parameter-probe>
    <togostanza-parameter-probe
      id="mutation"
      label="before-mutation"
      count="1"
      payload='{"kind":"mutation","step":"initial"}'
      mode="compact"
      note="before text mutation"
    ></togostanza-parameter-probe>
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
    await page.waitForFunction(() => customElements.get("togostanza-parameter-probe"));

    await expectParameterProbe(page, "#flag-present", {
      count: "42:number",
      flag: "true:boolean",
      label: "flag-present:string",
      mode: "compact:string",
      note: "hello:string",
      payload: '{"kind":"present","values":[1,2]}:object',
      styleGap: "undefined",
    });
    await expectParameterProbe(page, "#flag-absent", {
      count: "0:number",
      flag: "false:boolean",
      label: "flag-absent:string",
      mode: "comfortable:string",
      note: "absent:string",
      payload: '{"kind":"absent","enabled":false}:object',
      styleGap: "undefined",
    });
    await expectParameterProbe(page, "#flag-string-false", {
      count: "7.5:number",
      flag: "true:boolean",
      label: "flag-string-false:string",
      mode: "compact:string",
      note: "string false:string",
      payload: '["false-string",{"nested":true}]:object',
      styleGap: "undefined",
    });
    await expect
      .poll(() =>
        page
          .locator("#flag-present")
          .evaluate((element) =>
            getComputedStyle(element).getPropertyValue("--parameter-probe-gap").trim(),
          ),
      )
      .toBe("8px");

    await page.locator("#mutation").evaluate((element) => {
      element.setAttribute("count", "9.25");
    });
    await expect.poll(() => readProbeValue(page, "#mutation", "count")).toBe("9.25:number");
    expect(await readProbeValue(page, "#mutation", "last-attribute")).toBe("count:1->9.25");

    await page.locator("#mutation").evaluate((element) => {
      element.setAttribute("payload", '{"kind":"mutation","step":"changed"}');
    });
    await expect
      .poll(() => readProbeValue(page, "#mutation", "payload"))
      .toBe('{"kind":"mutation","step":"changed"}:object');
    expect(await readProbeValue(page, "#mutation", "last-attribute")).toBe(
      'payload:{"kind":"mutation","step":"initial"}->{"kind":"mutation","step":"changed"}',
    );

    await page.locator("#mutation").evaluate((element) => {
      element.setAttribute("flag", "");
    });
    await expect.poll(() => readProbeValue(page, "#mutation", "flag")).toBe("true:boolean");

    await page.locator("#mutation").evaluate((element) => {
      element.removeAttribute("flag");
    });
    await expect.poll(() => readProbeValue(page, "#mutation", "flag")).toBe("false:boolean");

    expect(requestLog.some((requestPath) => requestPath.endsWith("/metadata.json"))).toBe(false);
  } finally {
    await closeServer(server);
  }
});

test("supports Phase 2-3a Stanza source APIs in built custom elements", async ({ page }) => {
  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeSourceApiProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/api-probe.js"></script>
    <togostanza-api-probe
      id="api-probe"
      label="before-mutation"
      limit="3"
      enabled
      payload='{"kind":"initial"}'
    ></togostanza-api-probe>
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
    await page.waitForFunction(() => customElements.get("togostanza-api-probe"));

    await expect.poll(() => readProbeValue(page, "#api-probe", "label")).toBe("before-mutation");
    expect(await readProbeValue(page, "#api-probe", "limit")).toBe("3");
    expect(await readProbeValue(page, "#api-probe", "enabled")).toBe("true");
    expect(await readProbeValue(page, "#api-probe", "payload")).toBe('{"kind":"initial"}');
    expect(await readProbeValue(page, "#api-probe", "element-tag")).toBe("TOGOSTANZA-API-PROBE");
    expect(await readProbeValue(page, "#api-probe", "root-available")).toBe("true");
    expect(await readProbeValue(page, "#api-probe", "main-available")).toBe("true");

    const runtimeState = await page.locator("#api-probe").evaluate((element) => {
      const host = element as HTMLElement & {
        stanzaInstance?: {
          element?: Element;
          root?: ShadowRoot;
        };
      };
      const main = element.shadowRoot?.querySelector<HTMLElement>("main");

      return {
        elementConnected: host.stanzaInstance?.element === host,
        mainDatasetElement: main?.dataset.apiProbeElement,
        mainDatasetRoot: main?.dataset.apiProbeRoot,
        rootConnected: host.stanzaInstance?.root === host.shadowRoot,
      };
    });

    expect(runtimeState).toEqual({
      elementConnected: true,
      mainDatasetElement: "TOGOSTANZA-API-PROBE",
      mainDatasetRoot: "available",
      rootConnected: true,
    });

    await page.locator("#api-probe").evaluate((element) => {
      element.setAttribute("label", "after-mutation");
    });
    await expect.poll(() => readProbeValue(page, "#api-probe", "label")).toBe("after-mutation");
    expect(await readProbeValue(page, "#api-probe", "last-attribute")).toBe(
      "label:before-mutation->after-mutation",
    );

    await page.locator("#api-probe").evaluate((element) => {
      element.setAttribute("limit", "5");
    });
    await expect.poll(() => readProbeValue(page, "#api-probe", "limit")).toBe("5");
    expect(await readProbeValue(page, "#api-probe", "last-attribute")).toBe("limit:3->5");

    await expect
      .poll(() =>
        page.locator("#api-probe").evaluate((element) => {
          const main = element.shadowRoot?.querySelector("main");

          return main?.querySelectorAll("[data-probe='label']").length;
        }),
      )
      .toBe(1);

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

async function expectParameterProbe(
  page: Page,
  selector: string,
  expected: {
    count: string;
    flag: string;
    label: string;
    mode: string;
    note: string;
    payload: string;
    styleGap: string;
  },
): Promise<void> {
  await expect.poll(() => readProbeValue(page, selector, "label")).toBe(expected.label);
  expect(await readProbeValue(page, selector, "count")).toBe(expected.count);
  expect(await readProbeValue(page, selector, "flag")).toBe(expected.flag);
  expect(await readProbeValue(page, selector, "payload")).toBe(expected.payload);
  expect(await readProbeValue(page, selector, "mode")).toBe(expected.mode);
  expect(await readProbeValue(page, selector, "note")).toBe(expected.note);
  expect(await readProbeValue(page, selector, "style-gap-param")).toBe(expected.styleGap);
}

function readProbeValue(page: Page, selector: string, probeName: string): Promise<string> {
  return page.locator(selector).evaluate((element, name) => {
    return element.shadowRoot?.querySelector(`[data-probe="${name}"]`)?.textContent?.trim() ?? "";
  }, probeName);
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

function writeParameterProbe(cwd: string): void {
  const stanzaDirectory = resolve(cwd, "stanzas", "parameter-probe");
  mkdirSync(resolve(stanzaDirectory, "templates"), { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "parameter-probe",
        "stanza:label": "Parameter Probe",
        "stanza:parameter": [
          { "stanza:key": "label", "stanza:type": "string" },
          { "stanza:key": "count", "stanza:type": "number" },
          { "stanza:key": "flag", "stanza:type": "boolean" },
          { "stanza:key": "payload", "stanza:type": "json" },
          { "stanza:key": "mode", "stanza:type": "single-choice" },
          { "stanza:key": "note", "stanza:type": "text" },
        ],
        "stanza:menu-placement": "none",
        "stanza:style": [
          {
            "stanza:default": "8px",
            "stanza:key": "--parameter-probe-gap",
            "stanza:type": "number",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.js"),
    `import Stanza from "togostanza/stanza";

export default class ParameterProbe extends Stanza {
  renderCount = 0;
  lastAttributeChange = { name: "", oldValue: "", newValue: "" };

  render() {
    this.renderCount += 1;
    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        count: formatValue(this.params.count),
        flag: formatValue(this.params.flag),
        label: formatValue(this.params.label),
        lastAttribute: formatAttributeChange(this.lastAttributeChange),
        mode: formatValue(this.params.mode),
        note: formatValue(this.params.note),
        payload: formatValue(this.params.payload),
        renderCount: String(this.renderCount),
        styleGapParam: String(this.params["--parameter-probe-gap"]),
      },
    });
  }

  handleAttributeChange(name, oldValue, newValue) {
    this.lastAttributeChange = {
      name,
      oldValue: oldValue ?? "null",
      newValue: newValue ?? "null",
    };
    super.handleAttributeChange(name, oldValue, newValue);
  }
}

function formatValue(value) {
  return \`\${formatDisplayValue(value)}:\${typeof value}\`;
}

function formatDisplayValue(value) {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatAttributeChange(change) {
  if (!change.name) {
    return "";
  }

  return \`\${change.name}:\${change.oldValue}->\${change.newValue}\`;
}
`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "templates", "stanza.html.hbs"),
    `<dl>
  <dt>label</dt><dd data-probe="label">{{label}}</dd>
  <dt>count</dt><dd data-probe="count">{{count}}</dd>
  <dt>flag</dt><dd data-probe="flag">{{flag}}</dd>
  <dt>payload</dt><dd data-probe="payload">{{payload}}</dd>
  <dt>mode</dt><dd data-probe="mode">{{mode}}</dd>
  <dt>note</dt><dd data-probe="note">{{note}}</dd>
  <dt>style gap param</dt><dd data-probe="style-gap-param">{{styleGapParam}}</dd>
  <dt>last attribute</dt><dd data-probe="last-attribute">{{lastAttribute}}</dd>
  <dt>render count</dt><dd data-probe="render-count">{{renderCount}}</dd>
</dl>
`,
    "utf8",
  );
}

function writeSourceApiProbe(cwd: string): void {
  const stanzaDirectory = resolve(cwd, "stanzas", "api-probe");
  mkdirSync(resolve(stanzaDirectory, "templates"), { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "api-probe",
        "stanza:label": "API Probe",
        "stanza:parameter": [
          { "stanza:key": "label", "stanza:type": "string" },
          { "stanza:key": "limit", "stanza:type": "number" },
          { "stanza:key": "enabled", "stanza:type": "boolean" },
          { "stanza:key": "payload", "stanza:type": "json" },
        ],
        "stanza:menu-placement": "none",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.js"),
    `import Stanza from "togostanza/stanza";

export default class ApiProbe extends Stanza {
  renderCount = 0;
  lastAttributeChange = { name: "", oldValue: "", newValue: "" };

  render() {
    this.renderCount += 1;
    const mainBeforeRender = this.root?.querySelector("main");

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        elementTag: this.element?.tagName ?? "",
        enabled: String(this.params.enabled),
        label: String(this.params.label),
        lastAttribute: formatAttributeChange(this.lastAttributeChange),
        limit: String(this.params.limit),
        mainAvailable: String(Boolean(mainBeforeRender)),
        payload: JSON.stringify(this.params.payload),
        renderCount: String(this.renderCount),
        rootAvailable: String(Boolean(this.root)),
      },
    });

    const mainAfterRender = this.root?.querySelector("main");
    if (mainAfterRender) {
      mainAfterRender.dataset.apiProbeElement = this.element?.tagName ?? "";
      mainAfterRender.dataset.apiProbeRoot = this.root ? "available" : "missing";
    }
  }

  handleAttributeChange(name, oldValue, newValue) {
    this.lastAttributeChange = {
      name,
      oldValue: oldValue ?? "null",
      newValue: newValue ?? "null",
    };
    super.handleAttributeChange(name, oldValue, newValue);
  }
}

function formatAttributeChange(change) {
  if (!change.name) {
    return "";
  }

  return \`\${change.name}:\${change.oldValue}->\${change.newValue}\`;
}
`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "templates", "stanza.html.hbs"),
    `<dl>
  <dt>label</dt><dd data-probe="label">{{label}}</dd>
  <dt>limit</dt><dd data-probe="limit">{{limit}}</dd>
  <dt>enabled</dt><dd data-probe="enabled">{{enabled}}</dd>
  <dt>payload</dt><dd data-probe="payload">{{payload}}</dd>
  <dt>element tag</dt><dd data-probe="element-tag">{{elementTag}}</dd>
  <dt>root available</dt><dd data-probe="root-available">{{rootAvailable}}</dd>
  <dt>main available</dt><dd data-probe="main-available">{{mainAvailable}}</dd>
  <dt>last attribute</dt><dd data-probe="last-attribute">{{lastAttribute}}</dd>
  <dt>render count</dt><dd data-probe="render-count">{{renderCount}}</dd>
</dl>
`,
    "utf8",
  );
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
