import { spawn, type ChildProcess } from "node:child_process";
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test, type ConsoleMessage, type Page, type Request } from "@playwright/test";
import {
  assertCompatLocalReferencesReady,
  assertExpectedCompatLocalStanzaDirectories,
  compatFixturePath,
  expectedMetastanzaStanzas,
  expectedTogoMediumStanzas,
} from "../support/compat-local.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositoryRoot = resolve(packageRoot, "..");
const temporaryDirectories: string[] = [];

type SparqlRequest = {
  body: string;
  contentType: string;
  method: string;
};

type BrowserDiagnostics = {
  consoleErrors: string[];
  dispose(): void;
  failedRequests: string[];
  pageErrors: string[];
};

type MetastanzaSmokeCase = {
  assertRendered(page: Page, selector: string): Promise<void>;
  fixtureFile: string;
  id: string;
  overrides?: Record<string, string>;
};

type TogoMediumSmokeCase = {
  expectedText?: string;
  id: string;
  overrides?: Record<string, string>;
};

const metastanzaSmokeCases: readonly MetastanzaSmokeCase[] = [
  {
    assertRendered: assertSvgRendered,
    fixtureFile: "chart-data.json",
    id: "barchart",
    overrides: {
      legend: "false",
      style: "--togostanza-grid-dash-length: 1;",
      xgrid: "false",
      ygrid: "false",
    },
  },
  {
    assertRendered: assertHashTableRendered,
    fixtureFile: "hash-table.json",
    id: "hash-table",
  },
  {
    assertRendered: assertSvgRendered,
    fixtureFile: "chart-data.json",
    id: "linechart",
    overrides: {
      legend: "false",
      style: "--togostanza-grid-dash-length: 1;",
      xgrid: "false",
      ygrid: "false",
    },
  },
  {
    assertRendered: assertTableRendered,
    fixtureFile: "table-data.json",
    id: "pagination-table",
  },
  {
    assertRendered: assertSvgRendered,
    fixtureFile: "pie-data.json",
    id: "piechart",
    overrides: {
      legend: "false",
    },
  },
  {
    assertRendered: assertSvgRendered,
    fixtureFile: "scatter-data.json",
    id: "scatterplot",
    overrides: {
      legend: "false",
      style: "--togostanza-grid-dash-length: 1;",
      xgrid: "false",
      ygrid: "false",
    },
  },
  {
    assertRendered: assertScorecardRendered,
    fixtureFile: "scorecard.json",
    id: "scorecard",
    overrides: {
      height: "90",
    },
  },
  {
    assertRendered: assertTableRendered,
    fixtureFile: "table-data.json",
    id: "scroll-table",
  },
  {
    assertRendered: assertTextRendered,
    fixtureFile: "text.txt",
    id: "text",
    overrides: {
      "highlight-css-url": "",
      mode: "text",
    },
  },
  {
    assertRendered: assertSvgRendered,
    fixtureFile: "tree-data.json",
    id: "tree",
  },
];

const togoMediumSmokeCases: readonly TogoMediumSmokeCase[] = [
  { expectedText: "Glucose", id: "gmdb-component-detail" },
  { id: "gmdb-find-media-by-components" },
  { id: "gmdb-find-media-by-organism-phenotype" },
  { id: "gmdb-find-media-by-taxonomic-tree", overrides: { taxonomy_type: "NCBI" } },
  { id: "gmdb-gms-by-tid" },
  { id: "gmdb-media-alignment-table-by-components" },
  { id: "gmdb-media-alignment-table-by-strains" },
  { id: "gmdb-medium-builder" },
  { expectedText: "Demo Medium", id: "gmdb-medium-detail" },
  {
    expectedText: "Togo Medium Demo",
    id: "gmdb-meta-list",
    overrides: {
      api_url: "https://togomedium.local/list_media",
      column_names: "true",
      column_sizes: "40,60",
      limit: "2",
      title: "TogoMedium smoke",
    },
  },
  { id: "gmdb-roundtree", overrides: { newick: "https://togomedium.local/roundtree.newick" } },
  { id: "gmdb-similar-media-node", overrides: { gm_id: "M1" } },
  { id: "gmdb-stats-culturable-species" },
  { expectedText: "Demo Strain", id: "gmdb-strain-detail" },
  { expectedText: "Escherichia coli", id: "gmdb-taxon-detail" },
];

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
      const main = host.shadowRoot?.querySelector("main");
      const mainContainer = main?.parentElement;

      return {
        elementConnected: host.stanzaInstance?.element === host,
        mainContainerTag: mainContainer?.tagName ?? "",
        mainParentIsElement: main?.parentNode instanceof HTMLElement,
        mainParentMarker: mainContainer?.getAttribute("data-togostanza-main-container") ?? null,
        rootConnected: host.stanzaInstance?.root === host.shadowRoot,
      };
    });

    expect(runtimeState).toEqual({
      elementConnected: true,
      mainContainerTag: "DIV",
      mainParentIsElement: true,
      mainParentMarker: "",
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

test("provides runtime fields before derived Stanza field initializers run", async ({ page }) => {
  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  await runCli(["generate", "stanza", "fieldRuntimeProbe", "--timestamp", "2026-06-30"], cwd);
  writeFileSync(
    resolve(cwd, "stanzas", "field-runtime-probe", "index.js"),
    [
      'import Stanza from "togostanza/stanza";',
      "",
      "export default class FieldRuntimeProbe extends Stanza {",
      '  main = this.root.querySelector("main");',
      "  hostTagName = this.element.tagName;",
      "",
      "  render() {",
      "    this.main.textContent = `${this.hostTagName}:${this.root.host === this.element}`;",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/field-runtime-probe.js"></script>
    <togostanza-field-runtime-probe id="field-runtime"></togostanza-field-runtime-probe>
  </body>
</html>
`,
    "utf8",
  );
  const server = await startStaticServer(cwd, []);

  try {
    const port = addressPort(server);
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-field-runtime-probe"));

    await expect
      .poll(() =>
        page.locator("#field-runtime").evaluate((element) => {
          return element.shadowRoot?.querySelector("main")?.textContent ?? "";
        }),
      )
      .toBe("TOGOSTANZA-FIELD-RUNTIME-PROBE:true");
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

test("supports Phase 2-3 Stanza source APIs in built custom elements", async ({ page }) => {
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
      query-endpoint="/sparql"
    ></togostanza-api-probe>
  </body>
</html>
`,
    "utf8",
  );
  const requestLog: string[] = [];
  const sparqlRequests: SparqlRequest[] = [];
  const server = await startStaticServer(cwd, requestLog, sparqlRequests);

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
    await expect.poll(() => readProbeValue(page, "#api-probe", "query-status")).toBe("ok");

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

    const fontLinks = await page.locator("#api-probe").evaluate((element) => {
      return [...(element.shadowRoot?.querySelectorAll<HTMLLinkElement>("link") ?? [])].map(
        (link) => link.href,
      );
    });

    expect(
      fontLinks.some((href) => href.endsWith("/public/api-probe/assets/api-probe-font.css")),
    ).toBe(true);
    await expect
      .poll(() =>
        page.locator("#api-probe").evaluate((element) => {
          const shadowLinks = [
            ...(element.shadowRoot?.querySelectorAll<HTMLLinkElement>("link") ?? []),
          ].filter((link) => link.href.endsWith("/public/api-probe/assets/api-probe-font.css"));
          const headLinks = [...document.head.querySelectorAll<HTMLLinkElement>("link")].filter(
            (link) => link.href.endsWith("/public/api-probe/assets/api-probe-font.css"),
          );

          return {
            head: headLinks.length,
            shadow: shadowLinks.length,
          };
        }),
      )
      .toEqual({
        head: 1,
        shadow: 1,
      });

    await expect
      .poll(() =>
        page.locator("#api-probe").evaluate((element) => {
          const menu = element.shadowRoot?.querySelector<HTMLElement>("[data-togostanza-menu]");
          const itemLabels = [
            ...(menu?.querySelectorAll<HTMLElement>("[data-togostanza-menu-item]") ?? []),
          ].map((item) => item.textContent?.trim());

          return {
            dividerCount: menu?.querySelectorAll("[data-togostanza-menu-divider]").length,
            itemLabels,
          };
        }),
      )
      .toEqual({
        dividerCount: 1,
        itemLabels: ["Inspect before-mutation"],
      });

    await page.locator("#api-probe").evaluate((element) => {
      element.shadowRoot?.querySelector<HTMLButtonElement>("[data-togostanza-menu-item]")?.click();
    });
    expect(await readProbeValue(page, "#api-probe", "menu-click")).toBe("before-mutation");

    expect(sparqlRequests).toHaveLength(1);
    expect(sparqlRequests[0]).toMatchObject({
      method: "POST",
    });
    expect(sparqlRequests[0]?.contentType).toContain("application/x-www-form-urlencoded");
    expect(readSparqlQuery(sparqlRequests[0])).toContain("LIMIT 3");

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
    await expect.poll(() => readSparqlQuery(sparqlRequests.at(-1))).toContain("LIMIT 5");
    await expect
      .poll(() =>
        page.locator("#api-probe").evaluate((element) => {
          const menu = element.shadowRoot?.querySelector<HTMLElement>("[data-togostanza-menu]");
          return [
            ...(menu?.querySelectorAll<HTMLElement>("[data-togostanza-menu-item]") ?? []),
          ].map((item) => item.textContent?.trim());
        }),
      )
      .toEqual(["Inspect after-mutation"]);

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

test("coordinates built Stanza custom elements inside togostanza container", async ({ page }) => {
  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeInterStanzaCoordinationProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/coordination-sender.js"></script>
    <script type="module" src="./public/coordination-receiver.js"></script>
    <togostanza--container id="coordination-case">
      <togostanza--event-map
        on="selectedValue"
        receiver="togostanza-coordination-receiver"
        value-path="payload.label"
        target-attribute="selected-label"
      ></togostanza--event-map>
      <togostanza--data-source
        url="./sample-data.json"
        receiver="togostanza-coordination-receiver"
        target-attribute="data-url"
      ></togostanza--data-source>
      <togostanza-missing-stanza></togostanza-missing-stanza>
      <togostanza-coordination-sender value="from-sender"></togostanza-coordination-sender>
      <togostanza-coordination-receiver></togostanza-coordination-receiver>
    </togostanza--container>
  </body>
</html>
`,
    "utf8",
  );
  writeFileSync(
    resolve(cwd, "sample-data.json"),
    `${JSON.stringify({ items: [{ label: "from-data-source" }] }, null, 2)}\n`,
    "utf8",
  );
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const requestLog: string[] = [];
  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza--container"));
    await page.waitForFunction(() => customElements.get("togostanza--event-map"));
    await page.waitForFunction(() => customElements.get("togostanza--data-source"));
    await page.waitForFunction(() => customElements.get("togostanza-coordination-sender"));
    await page.waitForFunction(() => customElements.get("togostanza-coordination-receiver"));

    expect(pageErrors).toEqual([]);
    await expect
      .poll(() => readProbeValue(page, "togostanza-coordination-receiver", "selected-label"))
      .toBe("(none)");
    await expect
      .poll(() => readProbeValue(page, "togostanza-coordination-receiver", "data-source-label"))
      .toBe("from-data-source");
    expect(
      await readProbeValue(page, "togostanza-coordination-receiver", "handled-event-type"),
    ).toBe("(none)");

    await page.locator("togostanza-coordination-sender").evaluate((element) => {
      element.shadowRoot
        ?.querySelector<HTMLButtonElement>("[data-action='send-undeclared']")
        ?.click();
    });
    expect(await readProbeValue(page, "togostanza-coordination-receiver", "selected-label")).toBe(
      "(none)",
    );
    expect(
      await readProbeValue(page, "togostanza-coordination-receiver", "handled-event-type"),
    ).toBe("(none)");

    await page.locator("togostanza-coordination-sender").evaluate((element) => {
      element.shadowRoot?.querySelector<HTMLButtonElement>("[data-action='send']")?.click();
    });

    await expect
      .poll(() => readProbeValue(page, "togostanza-coordination-receiver", "selected-label"))
      .toBe("from-sender");
    await expect
      .poll(() => readProbeValue(page, "togostanza-coordination-receiver", "handled-event-type"))
      .toBe("selectedValue");
    expect(
      await readProbeValue(page, "togostanza-coordination-receiver", "handled-event-detail"),
    ).toBe('{"payload":{"label":"from-sender"}}');
    expect(requestLog.some((requestPath) => requestPath === "/sample-data.json")).toBe(true);
    expect(customElementDuplicateDefinitionErrors(pageErrors)).toEqual([]);
  } finally {
    await closeServer(server);
  }
});

test("loads Phase 2-4 CSS and JavaScript asset references from built custom elements", async ({
  page,
}) => {
  test.setTimeout(20_000);

  const cwd = makeTemporaryDirectory();
  await test.step("build asset resolution fixture", async () => {
    await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
    writeAssetResolutionProbe(cwd);
    await runCli(["build", "--output-path", "public"], cwd);
  });
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/asset-resolution-probe.js"></script>
    <togostanza-asset-resolution-probe id="asset-resolution"></togostanza-asset-resolution-probe>
  </body>
</html>
`,
    "utf8",
  );
  const requestLog: string[] = [];
  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    const origin = `http://127.0.0.1:${port}`;
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-asset-resolution-probe"));

    await expect
      .poll(
        () =>
          page.locator("#asset-resolution").evaluate((element) => {
            const root = element.shadowRoot;
            const localImage = root?.querySelector<HTMLImageElement>("[data-probe='local-asset']");
            const packageImage = root?.querySelector<HTMLImageElement>(
              "[data-probe='package-asset']",
            );
            const cssMarker = root?.querySelector<HTMLElement>("[data-probe='css-asset']");

            return {
              cssBackground: cssMarker ? getComputedStyle(cssMarker).backgroundImage : "",
              localLoaded:
                (localImage?.naturalHeight ?? 0) > 0 && (localImage?.naturalWidth ?? 0) > 0,
              localSource: localImage?.currentSrc ?? "",
              packageLoaded:
                (packageImage?.naturalHeight ?? 0) > 0 && (packageImage?.naturalWidth ?? 0) > 0,
              packageSource: packageImage?.currentSrc ?? "",
            };
          }),
        { timeout: 2_000 },
      )
      .toMatchObject({
        localLoaded: true,
        packageLoaded: true,
      });

    const assetState = await page.locator("#asset-resolution").evaluate((element) => {
      const root = element.shadowRoot;
      const localImage = root?.querySelector<HTMLImageElement>("[data-probe='local-asset']");
      const packageImage = root?.querySelector<HTMLImageElement>("[data-probe='package-asset']");
      const cssMarker = root?.querySelector<HTMLElement>("[data-probe='css-asset']");

      return {
        cssBackground: cssMarker ? getComputedStyle(cssMarker).backgroundImage : "",
        localSource: localImage?.currentSrc ?? "",
        packageSource: packageImage?.currentSrc ?? "",
      };
    });

    expect(assetState.cssBackground).toContain(
      `${origin}/public/asset-resolution-probe/assets/css-marker.svg`,
    );
    expect(assetState.cssBackground).not.toContain(`${origin}/assets/css-marker.svg`);
    expect(assetState.localSource).toContain("/public/_assets/local-marker-");
    expect(assetState.localSource).not.toContain(`${origin}/_assets/local-marker-`);
    expect(assetState.packageSource).toContain("/public/_assets/package-marker-");
    expect(assetState.packageSource).not.toContain(`${origin}/_assets/package-marker-`);

    await expect
      .poll(() =>
        requestLog.some(
          (requestPath) => requestPath === "/public/asset-resolution-probe/assets/css-marker.svg",
        ),
      )
      .toBe(true);
    expect(requestLog.some((requestPath) => requestPath.startsWith("/assets/"))).toBe(false);
  } finally {
    await closeServer(server);
  }
});

test("renders a React TSX Stanza from repository dependencies", async ({ page }) => {
  test.setTimeout(20_000);

  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeReactRuntimeProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/react-runtime-probe.js"></script>
    <togostanza-react-runtime-probe
      id="react-runtime"
      label="initial-react"
      count="1"
    ></togostanza-react-runtime-probe>
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
    await page.waitForFunction(() => customElements.get("togostanza-react-runtime-probe"));

    await expect.poll(() => readProbeValue(page, "#react-runtime", "label")).toBe("initial-react");
    expect(await readProbeValue(page, "#react-runtime", "count")).toBe("1");
    expect(await readProbeValue(page, "#react-runtime", "render-count")).toBe("1");
    await expect
      .poll(() =>
        page.locator("#react-runtime").evaluate((element) => {
          return [...(element.shadowRoot?.querySelectorAll<HTMLLinkElement>("link") ?? [])].some(
            (link) =>
              link.href.endsWith("/public/react-runtime-probe/assets/react-runtime-font.css"),
          );
        }),
      )
      .toBe(true);

    await page.locator("#react-runtime").evaluate((element) => {
      element.setAttribute("label", "after-react-mutation");
      element.setAttribute("count", "2");
    });

    await expect
      .poll(() => readProbeValue(page, "#react-runtime", "label"))
      .toBe("after-react-mutation");
    expect(await readProbeValue(page, "#react-runtime", "count")).toBe("2");
    expect(await readProbeValue(page, "#react-runtime", "render-count")).toBe("2");
    expect(requestLog.some((requestPath) => requestPath.includes("react-runtime-probe.js"))).toBe(
      true,
    );
  } finally {
    await closeServer(server);
  }
});

test("applies Emotion styles inside a React Stanza shadow root @compat-local", async ({ page }) => {
  test.setTimeout(20_000);
  assertCompatLocalReferencesReady(repositoryRoot);

  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeEmotionShadowProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/emotion-shadow-probe.js"></script>
    <togostanza-emotion-shadow-probe id="emotion-shadow"></togostanza-emotion-shadow-probe>
  </body>
</html>
`,
    "utf8",
  );
  const server = await startStaticServer(cwd, []);

  try {
    const port = addressPort(server);
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-emotion-shadow-probe"));
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await expect
      .poll(() =>
        page.locator("#emotion-shadow").evaluate((element) => {
          return element.getAttribute("data-rendered") ?? "";
        }),
      )
      .toBe("true");

    await expect.poll(() => readProbeValue(page, "#emotion-shadow", "label")).toBe("emotion ok");
    await expect
      .poll(() =>
        page.locator("#emotion-shadow").evaluate((element) => {
          const marker = element.shadowRoot?.querySelector<HTMLElement>(
            "[data-probe='emotion-style']",
          );

          return marker ? getComputedStyle(marker).color : "";
        }),
      )
      .toBe("rgb(42, 24, 12)");
  } finally {
    await closeServer(server);
  }
});

test("directly embeds all real metastanza Stanzas @compat-local", async ({ page }) => {
  test.setTimeout(180_000);
  assertCompatLocalReferencesReady(repositoryRoot);
  assertExpectedCompatLocalStanzaDirectories(repositoryRoot);

  const cwd = makeTemporaryDirectory();
  writeMetastanzaRegressionRepo(cwd);
  await runCli(["build", "--output-path", "public"], cwd);

  const requestLog: string[] = [];
  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    for (const smokeCase of metastanzaSmokeCases) {
      // eslint-disable-next-line no-await-in-loop -- each Stanza gets an isolated page navigation.
      await runMetastanzaSmokeCase({
        cwd,
        page,
        port,
        requestLog,
        smokeCase,
      });
    }
  } finally {
    await closeServer(server);
  }
});

test("directly embeds all real TogoMedium Stanzas @compat-local", async ({ page }) => {
  test.setTimeout(240_000);
  assertCompatLocalReferencesReady(repositoryRoot);
  assertExpectedCompatLocalStanzaDirectories(repositoryRoot);

  const cwd = makeTemporaryDirectory();
  writeTogoMediumRegressionRepo(cwd);
  await runCli(["build", "--output-path", "public"], cwd);

  const requestLog: string[] = [];
  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    for (const smokeCase of togoMediumSmokeCases) {
      // eslint-disable-next-line no-await-in-loop -- each Stanza gets an isolated page navigation.
      await runTogoMediumSmokeCase({
        cwd,
        page,
        port,
        requestLog,
        smokeCase,
      });
    }
  } finally {
    await closeServer(server);
  }
});

test("loads a real TogoMedium Web route against local Stanza serve @compat-local", async ({
  page,
}) => {
  test.setTimeout(240_000);
  assertCompatLocalReferencesReady(repositoryRoot);
  assertExpectedCompatLocalStanzaDirectories(repositoryRoot);

  const cwd = makeTemporaryDirectory();
  writeTogoMediumRegressionRepo(cwd);

  const stanzaPort = await findAvailablePort();
  const webPort = await findAvailablePort();
  const stanzaServe = startServeCli(["serve", "--port", String(stanzaPort)], cwd);
  let webServe: RunningProcess | undefined;

  try {
    await stanzaServe.waitForStdout(`http://127.0.0.1:${stanzaPort}/`);
    webServe = startTogoMediumWebServer({
      port: webPort,
      stanzaBaseUrl: `http://127.0.0.1:${stanzaPort}`,
      temporaryRoot: cwd,
    });
    await waitForHttpOk(
      `http://127.0.0.1:${webPort}/find-media-by-components`,
      () => webServe?.output() ?? "",
    );

    const diagnostics = collectBrowserDiagnostics(page);

    try {
      await page.goto(`http://127.0.0.1:${webPort}/find-media-by-components`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(() =>
        customElements.get("togostanza-gmdb-find-media-by-components"),
      );
      await expectTogoMediumHostReady(page, "togostanza-gmdb-find-media-by-components");

      const scriptSrc = await page
        .locator('script[src$="/gmdb-find-media-by-components.js"]')
        .evaluate((element) => (element as HTMLScriptElement).src);
      expect(scriptSrc).toBe(`http://127.0.0.1:${stanzaPort}/gmdb-find-media-by-components.js`);
      expect(diagnostics.consoleErrors).toEqual([]);
      expect(filterFatalFailedRequests(diagnostics.failedRequests)).toEqual([]);
      expect(customElementDuplicateDefinitionErrors(diagnostics.pageErrors)).toEqual([]);
      expect(diagnostics.pageErrors).toEqual([]);
    } finally {
      diagnostics.dispose();
    }
  } finally {
    await webServe?.close();
    await stanzaServe.close();
  }
});

test("renders a Vue SFC Stanza from repository dependencies", async ({ page }) => {
  test.setTimeout(20_000);

  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeVueRuntimeProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);
  writeFileSync(
    resolve(cwd, "fixture.html"),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/vue-runtime-probe.js"></script>
    <togostanza-vue-runtime-probe
      id="vue-runtime"
      label="initial-vue"
    ></togostanza-vue-runtime-probe>
  </body>
</html>
`,
    "utf8",
  );
  const server = await startStaticServer(cwd, []);

  try {
    const port = addressPort(server);
    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-vue-runtime-probe"));

    await expect.poll(() => readProbeValue(page, "#vue-runtime", "label")).toBe("initial-vue");
    await expect
      .poll(() =>
        page.locator("#vue-runtime").evaluate((element) => {
          const section = element.shadowRoot?.querySelector<HTMLElement>(
            "[data-probe='vue-runtime']",
          );
          return section ? getComputedStyle(section).color : "";
        }),
      )
      .toBe("rgb(12, 34, 56)");
  } finally {
    await closeServer(server);
  }
});

test("runs the real togostanza-utils package against the remake runtime @compat-local", async ({
  page,
}) => {
  test.setTimeout(25_000);
  assertCompatLocalReferencesReady(repositoryRoot);

  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  writeUtilsCompatProbe(cwd);
  await runCli(["build", "--output-path", "public"], cwd);

  const requestLog: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("download", (download) => {
    void download.cancel();
  });

  const server = await startStaticServer(cwd, requestLog);

  try {
    const port = addressPort(server);
    writeFileSync(
      resolve(cwd, "fixture.html"),
      `<!doctype html>
<html>
  <body>
    <script type="module" src="./public/utils-probe.js"></script>
    <togostanza-utils-probe
      id="utils"
      json-url="http://127.0.0.1:${port}/fixtures/data/records.json"
      csv-url="http://127.0.0.1:${port}/fixtures/data/records.csv"
      tsv-url="http://127.0.0.1:${port}/fixtures/data/records.tsv"
      sparql-url="http://127.0.0.1:${port}/fixtures/data/sparql-results.json"
      error-url="http://127.0.0.1:${port}/fixtures/data/missing.json"
      custom-css-a-url="http://127.0.0.1:${port}/fixtures/custom-a.css"
      custom-css-b-url="http://127.0.0.1:${port}/fixtures/custom-b.css"
    ></togostanza-utils-probe>
  </body>
</html>
`,
      "utf8",
    );

    await page.goto(`http://127.0.0.1:${port}/fixture.html`);
    await page.waitForFunction(() => customElements.get("togostanza-utils-probe"));
    await expect.poll(() => readProbeValue(page, "#utils", "overall")).toBe("ok");

    const checkStatuses = await page.locator("#utils").evaluate((element) => {
      return [...(element.shadowRoot?.querySelectorAll("tr[data-check]") ?? [])].map((row) => {
        return {
          name: row.getAttribute("data-check"),
          status: row.querySelector("[data-status]")?.getAttribute("data-status"),
        };
      });
    });
    expect(checkStatuses).toEqual(
      expect.arrayContaining([
        { name: "loadData json", status: "ok" },
        { name: "__togostanza_id__", status: "ok" },
        { name: "loadData cache", status: "ok" },
        { name: "loadData csv", status: "ok" },
        { name: "loadData tsv", status: "ok" },
        { name: "loadData sparql-results-json", status: "ok" },
        { name: "loadData error ui", status: "ok" },
        { name: "appendCustomCss replacement", status: "ok" },
        { name: "download root compat", status: "ok" },
        { name: "download style compat", status: "ok" },
        { name: "menu item contract", status: "ok" },
        { name: "divider menu item", status: "ok" },
      ]),
    );

    await page.locator("#utils").evaluate((element) => {
      const buttons = [
        ...(element.shadowRoot?.querySelectorAll<HTMLButtonElement>(
          "[data-togostanza-menu-item]",
        ) ?? []),
      ];
      for (const button of buttons) {
        button.click();
      }
    });
    await page.waitForTimeout(300);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((message) => !message.includes("Failed to load resource"))).toEqual(
      [],
    );
    expect(requestLog).toEqual(expect.arrayContaining(["/fixtures/data/records.json"]));
    expect(requestLog).toEqual(expect.arrayContaining(["/fixtures/data/records.csv"]));
    expect(requestLog).toEqual(expect.arrayContaining(["/fixtures/data/records.tsv"]));
    expect(requestLog).toEqual(expect.arrayContaining(["/fixtures/data/sparql-results.json"]));
  } finally {
    await closeServer(server);
  }
});

test("serves a built Stanza preview through togostanza serve", async ({ page }) => {
  test.setTimeout(20_000);

  const cwd = makeTemporaryDirectory();
  await runCli(["init", ".", "--skip-install", "--skip-git"], cwd);
  await runCli(["generate", "stanza", "servePreview", "--timestamp", "2026-06-30"], cwd);
  writeFileSync(
    resolve(cwd, "stanzas", "serve-preview", "style.scss"),
    "main {\n  color: rgb(9, 8, 7);\n}\n",
    "utf8",
  );
  const port = await findAvailablePort();
  const server = startServeCli(["serve", "--port", String(port)], cwd);

  try {
    await server.waitForStdout(`http://127.0.0.1:${port}/`);
    await page.goto(`http://127.0.0.1:${port}/serve-preview.html`);
    await page.waitForFunction(() => customElements.get("togostanza-serve-preview"));

    const renderedText = await page
      .locator("togostanza-serve-preview")
      .evaluate((element) => element.shadowRoot?.querySelector("main")?.textContent ?? "");
    expect(renderedText).toContain("Hello,");

    await expect
      .poll(() =>
        page.locator("togostanza-serve-preview").evaluate((element) => {
          const main = element.shadowRoot?.querySelector("main");
          return main ? getComputedStyle(main).color : "";
        }),
      )
      .toBe("rgb(9, 8, 7)");
    expect(existsSync(resolve(cwd, "dist"))).toBe(false);
  } finally {
    await server.close();
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

function readShadowText(page: Page, hostSelector: string, shadowSelector: string): Promise<string> {
  return page.locator(hostSelector).evaluate((element, selector) => {
    return element.shadowRoot?.querySelector(selector)?.textContent?.trim() ?? "";
  }, shadowSelector);
}

function readSparqlQuery(request: SparqlRequest | undefined): string {
  return new URLSearchParams(request?.body ?? "").get("query") ?? "";
}

function customElementDuplicateDefinitionErrors(pageErrors: string[]): string[] {
  return pageErrors.filter((message) => {
    return message.includes("has already been used with this registry");
  });
}

async function runMetastanzaSmokeCase(input: {
  cwd: string;
  page: Page;
  port: number;
  requestLog: string[];
  smokeCase: MetastanzaSmokeCase;
}): Promise<void> {
  const { cwd, page, port, requestLog, smokeCase } = input;
  const selector = `#metastanza-${smokeCase.id}`;
  const tagName = `togostanza-${smokeCase.id}`;
  const fixturePath = compatFixturePath("metastanza", smokeCase.id, "fixture.html");
  const dataPath = compatFixturePath("metastanza", smokeCase.id, smokeCase.fixtureFile);
  const generatedScriptPath = `public/${smokeCase.id}.js`;
  const attributes = metadataExampleAttributes(cwd, smokeCase.id, {
    ...smokeCase.overrides,
    "data-url": `http://127.0.0.1:${port}/${dataPath}`,
  });
  const diagnostics = collectBrowserDiagnostics(page);
  const requestStart = requestLog.length;

  writeFileSync(
    resolve(cwd, fixturePath),
    `<!doctype html>
<html>
  <body>
    <script type="module" src="/${generatedScriptPath}"></script>
    <${tagName}
      id="metastanza-${smokeCase.id}"
      ${formatHtmlAttributes(attributes)}
    ></${tagName}>
  </body>
</html>
`,
    "utf8",
  );

  try {
    await page.goto(`http://127.0.0.1:${port}/${fixturePath}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction((name) => customElements.get(name), tagName);
    await expectMetastanzaHostReady(page, selector);
    await smokeCase.assertRendered(page, selector);

    const requests = requestLog.slice(requestStart);
    expect(requests).toContain(`/${dataPath}`);
    expect(diagnostics.consoleErrors).toEqual([]);
    expect(filterFatalFailedRequests(diagnostics.failedRequests)).toEqual([]);
    expect(customElementDuplicateDefinitionErrors(diagnostics.pageErrors)).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
  } catch (error) {
    throw new Error(
      formatMetastanzaSmokeFailure({
        dataPath,
        diagnostics,
        error,
        fixturePath,
        generatedScriptPath,
        requests: requestLog.slice(requestStart),
        stanzaId: smokeCase.id,
      }),
      { cause: error },
    );
  } finally {
    diagnostics.dispose();
  }
}

async function runTogoMediumSmokeCase(input: {
  cwd: string;
  page: Page;
  port: number;
  requestLog: string[];
  smokeCase: TogoMediumSmokeCase;
}): Promise<void> {
  const { cwd, page, port, requestLog, smokeCase } = input;
  const selector = `#togomedium-${smokeCase.id}`;
  const tagName = `togostanza-${smokeCase.id}`;
  const fixturePath = compatFixturePath("togomedium", smokeCase.id, "fixture.html");
  const generatedScriptPath = `public/${smokeCase.id}.js`;
  const attributes = metadataExampleAttributes(cwd, smokeCase.id, smokeCase.overrides ?? {});
  const diagnostics = collectBrowserDiagnostics(page);
  const requestStart = requestLog.length;
  mkdirSync(dirname(resolve(cwd, fixturePath)), { recursive: true });

  writeFileSync(
    resolve(cwd, fixturePath),
    `<!doctype html>
<html>
  <body>
    <script>${formatTogoMediumFetchMockScript()}</script>
    <script type="module" src="/${generatedScriptPath}"></script>
    <${tagName}
      id="togomedium-${smokeCase.id}"
      ${formatHtmlAttributes(attributes)}
    ></${tagName}>
  </body>
</html>
`,
    "utf8",
  );

  try {
    await page.goto(`http://127.0.0.1:${port}/${fixturePath}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction((name) => customElements.get(name), tagName);
    await expectTogoMediumHostReady(page, selector);

    if (smokeCase.expectedText) {
      await expect
        .poll(() => readShadowText(page, selector, "main"))
        .toContain(smokeCase.expectedText);
    }

    expect(diagnostics.consoleErrors).toEqual([]);
    expect(filterFatalFailedRequests(diagnostics.failedRequests)).toEqual([]);
    expect(customElementDuplicateDefinitionErrors(diagnostics.pageErrors)).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
  } catch (error) {
    throw new Error(
      formatTogoMediumSmokeFailure({
        diagnostics,
        error,
        fixturePath,
        generatedScriptPath,
        requests: requestLog.slice(requestStart),
        stanzaId: smokeCase.id,
      }),
      { cause: error },
    );
  } finally {
    diagnostics.dispose();
  }
}

function collectBrowserDiagnostics(page: Page): BrowserDiagnostics {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const pageErrors: string[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onRequestFailed = (request: Request) => {
    failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ""}`.trim());
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return {
    consoleErrors,
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    },
    failedRequests,
    pageErrors,
  };
}

function filterFatalFailedRequests(failedRequests: readonly string[]): string[] {
  return failedRequests.filter(
    (request) =>
      !request.startsWith("https://cdn.jsdelivr.net/npm/katex@") &&
      !request.startsWith("https://dbcls.rois.ac.jp/DBCLS-common-header-footer/") &&
      !request.startsWith("https://fonts.googleapis.com/"),
  );
}

async function expectMetastanzaHostReady(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        const main = element.shadowRoot?.querySelector("main");

        return {
          hasMain: Boolean(main),
          hasShadowRoot: Boolean(element.shadowRoot),
          mainParentIsElement: main?.parentNode instanceof HTMLElement,
          upgraded: element.constructor !== HTMLElement,
        };
      }),
    )
    .toEqual({
      hasMain: true,
      hasShadowRoot: true,
      mainParentIsElement: true,
      upgraded: true,
    });
}

async function expectTogoMediumHostReady(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        const main = element.shadowRoot?.querySelector("main");

        return {
          hasMain: Boolean(main),
          hasRenderedContent:
            (main?.childElementCount ?? 0) > 0 || Boolean(main?.textContent?.trim()),
          hasShadowRoot: Boolean(element.shadowRoot),
          mainParentIsElement: main?.parentNode instanceof HTMLElement,
          upgraded: element.constructor !== HTMLElement,
        };
      }),
    )
    .toEqual({
      hasMain: true,
      hasRenderedContent: true,
      hasShadowRoot: true,
      mainParentIsElement: true,
      upgraded: true,
    });
}

async function assertSvgRendered(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector("main svg"));
      }),
    )
    .toBe(true);
}

async function assertHashTableRendered(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() => readShadowText(page, selector, "main"))
    .toContain("Compatibility dataset");
}

async function assertTableRendered(page: Page, selector: string): Promise<void> {
  await expect.poll(() => readShadowText(page, selector, "main")).toContain("Demo Alpha");
}

async function assertScorecardRendered(page: Page, selector: string): Promise<void> {
  await expect.poll(() => readShadowText(page, selector, "#key")).toBe("compatibility_score");
  await expect.poll(() => readShadowText(page, selector, "#value")).toBe("42");
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        const wrapper = element.shadowRoot?.querySelector<HTMLElement>(".chart-wrapper");
        const value = element.shadowRoot?.querySelector<HTMLElement>("#value");

        return wrapper && value
          ? {
              height: getComputedStyle(wrapper).height,
              valueColor: getComputedStyle(value).fill,
            }
          : undefined;
      }),
    )
    .toEqual({
      height: "90px",
      valueColor: "rgb(78, 80, 89)",
    });
}

async function assertTextRendered(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() => readShadowText(page, selector, "main"))
    .toContain("Metastanza compatibility text");
}

function metadataExampleAttributes(
  cwd: string,
  stanzaId: string,
  overrides: Record<string, string>,
): Record<string, string> {
  const metadata = JSON.parse(
    readFileSync(resolve(cwd, "stanzas", stanzaId, "metadata.json"), "utf8"),
  ) as Record<string, unknown>;
  const parameters = Array.isArray(metadata["stanza:parameter"])
    ? metadata["stanza:parameter"]
    : [];
  const attributes: Record<string, string> = {};

  for (const parameter of parameters) {
    if (!isRecord(parameter)) {
      continue;
    }

    const key = parameter["stanza:key"];
    const example = parameter["stanza:example"];

    if (typeof key !== "string" || example === undefined) {
      continue;
    }

    attributes[key] = typeof example === "string" ? example : JSON.stringify(example);
  }

  return { ...attributes, ...overrides };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatHtmlAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtmlAttribute(value)}"`)
    .join("\n      ");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatMetastanzaSmokeFailure(input: {
  dataPath: string;
  diagnostics: BrowserDiagnostics;
  error: unknown;
  fixturePath: string;
  generatedScriptPath: string;
  requests: string[];
  stanzaId: string;
}): string {
  const message = input.error instanceof Error ? input.error.message : String(input.error);

  return [
    `metastanza smoke failed for ${input.stanzaId}`,
    `generated: ${input.generatedScriptPath}`,
    `fixture: ${input.fixturePath}`,
    `data: ${input.dataPath}`,
    `error: ${message}`,
    formatDiagnosticList("console errors", input.diagnostics.consoleErrors),
    formatDiagnosticList("page errors", input.diagnostics.pageErrors),
    formatDiagnosticList("failed requests", input.diagnostics.failedRequests),
    formatDiagnosticList("recent requests", input.requests),
  ].join("\n");
}

function formatTogoMediumSmokeFailure(input: {
  diagnostics: BrowserDiagnostics;
  error: unknown;
  fixturePath: string;
  generatedScriptPath: string;
  requests: string[];
  stanzaId: string;
}): string {
  const message = input.error instanceof Error ? input.error.message : String(input.error);

  return [
    `TogoMedium smoke failed for ${input.stanzaId}`,
    `generated: ${input.generatedScriptPath}`,
    `fixture: ${input.fixturePath}`,
    `error: ${message}`,
    formatDiagnosticList("console errors", input.diagnostics.consoleErrors),
    formatDiagnosticList("page errors", input.diagnostics.pageErrors),
    formatDiagnosticList("failed requests", input.diagnostics.failedRequests),
    formatDiagnosticList("recent requests", input.requests),
  ].join("\n");
}

function formatDiagnosticList(label: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `${label}: (none)`;
  }

  return [`${label}:`, ...values.map((value) => `- ${value}`)].join("\n");
}

function runCli(args: string[], cwd: string): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(packageRoot, "bin/togostanza.mjs"), ...args], {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
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

type RunningCli = {
  close(): Promise<void>;
  waitForStdout(text: string): Promise<void>;
};

type RunningProcess = {
  close(): Promise<void>;
  output(): string;
};

function startServeCli(args: string[], cwd: string): RunningCli {
  const child = spawn(process.execPath, [resolve(packageRoot, "bin/togostanza.mjs"), ...args], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return {
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      const closed = waitForChildClose(child);
      child.kill("SIGTERM");
      await closed;
    },
    waitForStdout: async (text: string) => {
      await waitFor(
        () => stdout.includes(text),
        () => {
          return `Timed out waiting for stdout ${JSON.stringify(text)}. stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`;
        },
      );
    },
  };
}

function startTogoMediumWebServer(input: {
  port: number;
  stanzaBaseUrl: string;
  temporaryRoot: string;
}): RunningProcess {
  const referenceRoot = resolve(repositoryRoot, "references", "togomedium-web");
  const webRoot = resolve(referenceRoot, "@packages", "web");
  const originalConfigUrl = pathToFileURL(resolve(webRoot, "vite.config.ts")).href;
  const cacheDirectory = resolve(input.temporaryRoot, ".vite-togomedium-web");
  const configPath = resolve(input.temporaryRoot, "togomedium-web.vite.config.mjs");

  writeFileSync(
    configPath,
    [
      `import originalConfig from ${JSON.stringify(originalConfigUrl)};`,
      "",
      "export default async function config(env) {",
      "  const base = typeof originalConfig === 'function' ? await originalConfig(env) : originalConfig;",
      "  return {",
      "    ...base,",
      `    cacheDir: ${JSON.stringify(cacheDirectory)},`,
      "    server: {",
      "      ...(base.server ?? {}),",
      "      host: '127.0.0.1',",
      `      port: ${input.port},`,
      "      strictPort: true,",
      "    },",
      "  };",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const child = spawn(
    process.execPath,
    [
      resolve(referenceRoot, "node_modules", "vite", "bin", "vite.js"),
      webRoot,
      "--config",
      configPath,
      "--host",
      "127.0.0.1",
      "--port",
      String(input.port),
      "--strictPort",
    ],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        VITE_URL_API: "https://togomedium.local/api/",
        VITE_URL_STANZA: input.stanzaBaseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return {
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      const closed = waitForChildClose(child);
      child.kill("SIGTERM");
      await closed;
    },
    output: () => `${stdout}${stderr}`,
  };
}

async function findAvailablePort(): Promise<number> {
  const server = await startStaticServer(tmpdir(), []);
  const port = addressPort(server);
  await closeServer(server);
  return port;
}

async function waitForHttpOk(url: string, formatProcessOutput: () => string): Promise<void> {
  const timeoutAt = Date.now() + 30_000;
  let lastError = "";

  while (Date.now() < timeoutAt) {
    try {
      // eslint-disable-next-line no-await-in-loop -- polling waits for the dev server to become reachable.
      const response = await fetch(url);

      if (response.ok) {
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    // eslint-disable-next-line no-await-in-loop -- polling intentionally waits between attempts.
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(
    `Timed out waiting for ${url}. lastError=${lastError} output=${formatProcessOutput()}`,
  );
}

function waitForChildClose(child: ChildProcess): Promise<void> {
  return new Promise((resolveClose) => {
    child.on("close", () => {
      resolveClose();
    });
  });
}

async function waitFor(predicate: () => boolean, formatError: () => string): Promise<void> {
  const timeoutAt = Date.now() + 4_000;

  while (Date.now() < timeoutAt) {
    if (predicate()) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop -- polling intentionally waits between attempts.
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }

  throw new Error(formatError());
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
  mkdirSync(resolve(stanzaDirectory, "assets"), { recursive: true });
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
          { "stanza:key": "query-endpoint", "stanza:type": "string" },
        ],
        "stanza:menu-placement": "bottom-right",
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
  menuClickLabel = "";
  lastAttributeChange = { name: "", oldValue: "", newValue: "" };

  async render() {
    this.renderCount += 1;
    const mainBeforeRender = this.root?.querySelector("main");
    this.importWebFontCSS("./assets/api-probe-font.css");
    const queryResult = this.params["query-endpoint"]
      ? await this.query({
          endpoint: String(this.params["query-endpoint"]),
          method: "POST",
          template: "query.sparql.hbs",
          parameters: {
            limit: this.params.limit,
          },
        })
      : { status: "not-run" };

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        elementTag: this.element?.tagName ?? "",
        enabled: String(this.params.enabled),
        label: String(this.params.label),
        lastAttribute: formatAttributeChange(this.lastAttributeChange),
        limit: String(this.params.limit),
        mainAvailable: String(Boolean(mainBeforeRender)),
        menuClick: this.menuClickLabel,
        payload: JSON.stringify(this.params.payload),
        queryStatus: queryResult.status ?? "unknown",
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

  menu() {
    return [
      {
        type: "item",
        label: \`Inspect \${this.params.label}\`,
        handler: () => {
          this.menuClickLabel = String(this.params.label);
          this.renderTemplate({
            template: "stanza.html.hbs",
            parameters: {
              elementTag: this.element?.tagName ?? "",
              enabled: String(this.params.enabled),
              label: String(this.params.label),
              lastAttribute: formatAttributeChange(this.lastAttributeChange),
              limit: String(this.params.limit),
              mainAvailable: String(Boolean(this.root?.querySelector("main"))),
              menuClick: this.menuClickLabel,
              payload: JSON.stringify(this.params.payload),
              queryStatus: "menu-click",
              renderCount: String(this.renderCount),
              rootAvailable: String(Boolean(this.root)),
            },
          });
        },
      },
      { type: "divider" },
    ];
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
    resolve(stanzaDirectory, "assets", "api-probe-font.css"),
    ":host { --api-probe-font-loaded: yes; }\n",
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
  <dt>query status</dt><dd data-probe="query-status">{{queryStatus}}</dd>
  <dt>menu click</dt><dd data-probe="menu-click">{{menuClick}}</dd>
  <dt>last attribute</dt><dd data-probe="last-attribute">{{lastAttribute}}</dd>
  <dt>render count</dt><dd data-probe="render-count">{{renderCount}}</dd>
</dl>
`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "templates", "query.sparql.hbs"),
    "SELECT * WHERE { ?s ?p ?o } LIMIT {{limit}}\n",
    "utf8",
  );
}

function writeInterStanzaCoordinationProbe(cwd: string): void {
  const senderDirectory = resolve(cwd, "stanzas", "coordination-sender");
  const receiverDirectory = resolve(cwd, "stanzas", "coordination-receiver");
  mkdirSync(resolve(senderDirectory, "templates"), { recursive: true });
  mkdirSync(resolve(receiverDirectory, "templates"), { recursive: true });
  writeFileSync(
    resolve(senderDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "coordination-sender",
        "stanza:label": "Coordination Sender",
        "stanza:menu-placement": "none",
        "stanza:parameter": [{ "stanza:key": "value", "stanza:type": "string" }],
        "stanza:incomingEvent": [],
        "stanza:outgoingEvent": [
          {
            "stanza:description": "Selected value payload.",
            "stanza:key": "selectedValue",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(senderDirectory, "index.js"),
    `import Stanza from "togostanza/stanza";

export default class CoordinationSender extends Stanza {
  render() {
    const value = this.params.value || "from-sender";

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: { value },
    });

    this.root.querySelector("[data-action='send']")?.addEventListener("click", () => {
      this.element.dispatchEvent(
        new CustomEvent("selectedValue", {
          detail: {
            payload: {
              label: value,
            },
          },
        }),
      );
    });

    this.root.querySelector("[data-action='send-undeclared']")?.addEventListener("click", () => {
      this.element.dispatchEvent(
        new CustomEvent("undeclaredValue", {
          detail: {
            payload: {
              label: "from-undeclared",
            },
          },
        }),
      );
    });
  }
}

`,
    "utf8",
  );
  writeFileSync(
    resolve(senderDirectory, "templates", "stanza.html.hbs"),
    `<button type="button" data-action="send">Send {{value}}</button>
<button type="button" data-action="send-undeclared">Send undeclared</button>
`,
    "utf8",
  );
  writeFileSync(
    resolve(receiverDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "coordination-receiver",
        "stanza:label": "Coordination Receiver",
        "stanza:menu-placement": "none",
        "stanza:parameter": [
          { "stanza:key": "selected-label", "stanza:type": "string" },
          { "stanza:key": "data-url", "stanza:type": "string" },
        ],
        "stanza:incomingEvent": [
          {
            "stanza:description": "Selected value event.",
            "stanza:key": "selectedValue",
          },
        ],
        "stanza:outgoingEvent": [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(receiverDirectory, "index.js"),
    `import Stanza from "togostanza/stanza";

export default class CoordinationReceiver extends Stanza {
  lastHandledEvent = undefined;

  handleEvent(event) {
    this.lastHandledEvent = {
      detail: event.detail,
      type: event.type,
    };
    void this.render();
  }

  async render() {
    const dataUrl = this.params["data-url"];
    let dataSourceLabel = "(none)";

    if (dataUrl) {
      const data = await fetch(dataUrl).then((response) => response.json());
      dataSourceLabel = data.items?.[0]?.label ?? "(missing label)";
    }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        dataSourceLabel,
        handledEventDetail: this.lastHandledEvent
          ? JSON.stringify(this.lastHandledEvent.detail)
          : "(none)",
        handledEventType: this.lastHandledEvent?.type ?? "(none)",
        selectedLabel: this.params["selected-label"] ?? "(none)",
      },
    });
  }
}
`,
    "utf8",
  );
  writeFileSync(
    resolve(receiverDirectory, "templates", "stanza.html.hbs"),
    `<dl>
  <dt>selected label</dt><dd data-probe="selected-label">{{selectedLabel}}</dd>
  <dt>data-source label</dt><dd data-probe="data-source-label">{{dataSourceLabel}}</dd>
  <dt>handled event type</dt><dd data-probe="handled-event-type">{{handledEventType}}</dd>
  <dt>handled event detail</dt><dd data-probe="handled-event-detail">{{handledEventDetail}}</dd>
</dl>
`,
    "utf8",
  );
}

function writeReactRuntimeProbe(cwd: string): void {
  linkReactPackages(cwd);
  writeFileSync(
    resolve(cwd, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react",
          module: "ESNext",
          moduleResolution: "bundler",
          target: "ES2024",
        },
        include: ["stanzas/**/*.tsx"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const stanzaDirectory = resolve(cwd, "stanzas", "react-runtime-probe");
  mkdirSync(resolve(stanzaDirectory, "assets"), { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "react-runtime-probe",
        "stanza:label": "React Runtime Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [
          { "stanza:key": "label", "stanza:type": "string" },
          { "stanza:key": "count", "stanza:type": "number" },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.tsx"),
    [
      'import React from "react";',
      'import { createRoot, type Root } from "react-dom/client";',
      'import Stanza from "togostanza/stanza";',
      "",
      "type ProbeProps = {",
      "  count: unknown;",
      "  label: unknown;",
      "  renderCount: number;",
      "};",
      "",
      "function Probe({ count, label, renderCount }: ProbeProps) {",
      "  return (",
      '    <section data-probe="react-runtime">',
      "      <h1>React runtime probe</h1>",
      "      <dl>",
      '        <dt>label</dt><dd data-probe="label">{String(label)}</dd>',
      '        <dt>count</dt><dd data-probe="count">{String(count)}</dd>',
      '        <dt>render count</dt><dd data-probe="render-count">{renderCount}</dd>',
      "      </dl>",
      "    </section>",
      "  );",
      "}",
      "",
      "export default class ReactRuntimeProbe extends Stanza {",
      "  private reactRoot?: Root;",
      "  private renderCount = 0;",
      "",
      "  render() {",
      "    this.renderCount += 1;",
      '    this.importWebFontCSS("./assets/react-runtime-font.css");',
      '    const main = this.root.querySelector("main");',
      "",
      "    if (!main) {",
      '      throw new Error("React Runtime Probe expected a main element.");',
      "    }",
      "",
      "    this.reactRoot ??= createRoot(main);",
      "    this.reactRoot.render(",
      "      <Probe",
      "        count={this.params.count}",
      "        label={this.params.label}",
      "        renderCount={this.renderCount}",
      "      />,",
      "    );",
      "  }",
      "",
      "  handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {",
      "    super.handleAttributeChange(name, oldValue, newValue);",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "assets", "react-runtime-font.css"),
    ":host { --react-runtime-font: loaded; }\n",
    "utf8",
  );
}

function linkReactPackages(cwd: string): void {
  linkNodePackages(cwd, ["react", "react-dom"]);
}

function writeEmotionShadowProbe(cwd: string): void {
  linkTogoMediumReactPackages(cwd);
  linkEmotionPackages(cwd);
  writeFileSync(
    resolve(cwd, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          jsxImportSource: "@emotion/react",
          module: "ESNext",
          moduleResolution: "bundler",
          target: "ES2024",
        },
        include: ["stanzas/**/*.tsx"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const stanzaDirectory = resolve(cwd, "stanzas", "emotion-shadow-probe");
  mkdirSync(stanzaDirectory, { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "emotion-shadow-probe",
        "stanza:label": "Emotion Shadow Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.tsx"),
    [
      'import createCache from "@emotion/cache";',
      'import { CacheProvider } from "@emotion/react";',
      'import React from "react";',
      'import { createRoot, type Root } from "react-dom/client";',
      'import Stanza from "togostanza/stanza";',
      "",
      "function Probe() {",
      "  return (",
      "    <section>",
      '      <p data-probe="label">emotion ok</p>',
      "      <p",
      '        data-probe="emotion-style"',
      "        css={{",
      '          color: "rgb(42, 24, 12)",',
      "        }}",
      "      >",
      "        styled by emotion",
      "      </p>",
      "    </section>",
      "  );",
      "}",
      "",
      "export default class EmotionShadowProbe extends Stanza {",
      "  private reactRoot?: Root;",
      "",
      "  render() {",
      '    const main = this.root.querySelector("main");',
      "",
      "    if (!main) {",
      '      throw new Error("Emotion Shadow Probe expected a main element.");',
      "    }",
      "",
      '    this.element.setAttribute("data-rendered", "true");',
      "    this.reactRoot ??= createRoot(main);",
      "    this.reactRoot.render(",
      "      <CacheProvider",
      "        value={createCache({",
      '          key: "stanza",',
      "          container: this.root,",
      "        })}",
      "      >",
      "        <Probe />",
      "      </CacheProvider>,",
      "    );",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
}

function linkTogoMediumReactPackages(cwd: string): void {
  assertCompatLocalReferencesReady(repositoryRoot);

  for (const packageName of ["react", "react-dom"]) {
    symlinkNodePackageFromTogoMediumReference(cwd, packageName);
  }
}

function linkEmotionPackages(cwd: string): void {
  assertCompatLocalReferencesReady(repositoryRoot);

  const scopedDirectory = resolve(cwd, "node_modules", "@emotion");
  mkdirSync(scopedDirectory, { recursive: true });

  for (const packageName of ["cache", "react"]) {
    symlinkNodePackageFromTogoMediumReference(cwd, `@emotion/${packageName}`);
  }
}

function symlinkNodePackageFromTogoMediumReference(cwd: string, packageName: string): void {
  const destination = resolve(cwd, "node_modules", packageName);
  mkdirSync(dirname(destination), { recursive: true });
  symlinkSync(
    resolve(repositoryRoot, "references", "togomedium-web", "node_modules", packageName),
    destination,
    "dir",
  );
}

function writeMetastanzaRegressionRepo(cwd: string): void {
  assertCompatLocalReferencesReady(repositoryRoot);

  const referenceRoot = resolve(repositoryRoot, "references", "metastanza");
  const stanzasDirectory = resolve(cwd, "stanzas");
  mkdirSync(stanzasDirectory, { recursive: true });

  symlinkSync(resolve(referenceRoot, "package.json"), resolve(cwd, "package.json"));
  symlinkSync(resolve(referenceRoot, "node_modules"), resolve(cwd, "node_modules"), "dir");
  symlinkSync(resolve(referenceRoot, "common.scss"), resolve(cwd, "common.scss"));
  for (const stanzaId of expectedMetastanzaStanzas) {
    symlinkSync(
      resolve(referenceRoot, "stanzas", stanzaId),
      resolve(stanzasDirectory, stanzaId),
      "dir",
    );
  }

  writeMetastanzaFixtureData(cwd);
}

function writeMetastanzaFixtureData(cwd: string): void {
  const chartData = [
    { category: "alpha", chromosome: "chr1", count: 3, group: "A" },
    { category: "beta", chromosome: "chr2", count: 5, group: "B" },
  ];

  writeJsonFixture(cwd, "barchart", "chart-data.json", chartData);
  writeJsonFixture(cwd, "linechart", "chart-data.json", chartData);
  writeJsonFixture(cwd, "piechart", "pie-data.json", [
    { category: "alpha", count: 3 },
    { category: "beta", count: 5 },
  ]);
  writeJsonFixture(cwd, "scatterplot", "scatter-data.json", [
    { area: 1.5, density: 2, population: "alpha" },
    { area: 3.5, density: 4, population: "beta" },
  ]);
  writeJsonFixture(cwd, "tree", "tree-data.json", [
    { id: "root", name: "Root", parent: null },
    { id: "child", name: "Child", parent: "root" },
  ]);
  writeJsonFixture(cwd, "hash-table", "hash-table.json", [
    {
      dataset_uri: "https://example.org/dataset/compatibility",
      description: "Compatibility dataset",
      number_of_protein: 42,
      species: "Homo sapiens",
      title: "Compatibility dataset",
    },
  ]);
  writeJsonFixture(cwd, "pagination-table", "table-data.json", formatMetastanzaTableData());
  writeJsonFixture(cwd, "scroll-table", "table-data.json", formatMetastanzaTableData());
  writeJsonFixture(cwd, "scorecard", "scorecard.json", { compatibility_score: 42 });
  writeTextFixture(cwd, "text", "text.txt", "Metastanza compatibility text\n");
}

function writeJsonFixture(cwd: string, stanzaId: string, fileName: string, value: unknown): void {
  const filePath = resolve(cwd, compatFixturePath("metastanza", stanzaId, fileName));
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeTextFixture(cwd: string, stanzaId: string, fileName: string, value: string): void {
  const filePath = resolve(cwd, compatFixturePath("metastanza", stanzaId, fileName));
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value, "utf8");
}

function formatMetastanzaTableData(): Array<Record<string, string | number>> {
  return [
    {
      beta: 0.1,
      beta_unit: "unit",
      ci_text: "0.1-0.2",
      initial_sample_size: "Demo initial sample",
      mapped_trait: "Demo Alpha",
      odds_ratio: 1.2,
      p_value: 0.001,
      pubmed_id: "123456",
      pubmed_uri: "https://example.org/pubmed/123456",
      raf: 0.5,
      replication_sample_size: "Demo replication sample",
      study: "https://example.org/study/demo",
      study_detail: "Demo study",
      variant_and_risk_allele: "rs-demo-A",
    },
    {
      beta: 0.2,
      beta_unit: "unit",
      ci_text: "0.2-0.3",
      initial_sample_size: "Demo initial sample B",
      mapped_trait: "Demo Beta",
      odds_ratio: 1.4,
      p_value: 0.002,
      pubmed_id: "789012",
      pubmed_uri: "https://example.org/pubmed/789012",
      raf: 0.7,
      replication_sample_size: "Demo replication sample B",
      study: "https://example.org/study/demo-b",
      study_detail: "Demo study B",
      variant_and_risk_allele: "rs-demo-B",
    },
  ];
}

function writeTogoMediumRegressionRepo(cwd: string): void {
  assertCompatLocalReferencesReady(repositoryRoot);

  const referenceRoot = resolve(repositoryRoot, "references", "togomedium-web");
  const stanzaPackageRoot = resolve(referenceRoot, "@packages", "stanza");
  const stanzasDirectory = resolve(cwd, "stanzas");
  mkdirSync(stanzasDirectory, { recursive: true });

  symlinkSync(resolve(stanzaPackageRoot, "package.json"), resolve(cwd, "package.json"));
  linkTogoMediumNodeModules(cwd, referenceRoot, stanzaPackageRoot);
  symlinkSync(resolve(stanzaPackageRoot, "components"), resolve(cwd, "components"), "dir");
  symlinkSync(resolve(stanzaPackageRoot, "styles"), resolve(cwd, "styles"), "dir");
  symlinkSync(resolve(stanzaPackageRoot, "utils"), resolve(cwd, "utils"), "dir");
  symlinkSync(resolve(stanzaPackageRoot, "tsconfig.json"), resolve(cwd, "tsconfig.json"));
  for (const stanzaId of expectedTogoMediumStanzas) {
    symlinkSync(
      resolve(stanzaPackageRoot, "stanzas", stanzaId),
      resolve(stanzasDirectory, stanzaId),
      "dir",
    );
  }
  writeFileSync(
    resolve(cwd, "togostanza.config.ts"),
    [
      `const referenceRoot = ${JSON.stringify(referenceRoot)};`,
      "",
      "export default {",
      "  vite: {",
      "    resolve: {",
      "      alias: [",
      "        { find: /^%stanza\\//, replacement: `${referenceRoot}/@packages/stanza/` },",
      "        { find: /^%storybook\\//, replacement: `${referenceRoot}/@packages/storybook/src/` },",
      "        { find: /^%core\\//, replacement: `${referenceRoot}/@packages/core/src/` },",
      "        { find: /^%api\\//, replacement: `${referenceRoot}/@packages/api/src/` },",
      "      ],",
      "    },",
      "    define: {",
      '      "import.meta.env.VITE_URL_API": JSON.stringify("https://togomedium.local/api/"),',
      '      "process.env": JSON.stringify({ URL_API: "https://togomedium.local/api/" }),',
      "    },",
      "  },",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );
}

function linkTogoMediumNodeModules(
  cwd: string,
  referenceRoot: string,
  stanzaPackageRoot: string,
): void {
  const destinationRoot = resolve(cwd, "node_modules");
  mkdirSync(destinationRoot, { recursive: true });
  linkNodeModulesEntries(resolve(referenceRoot, "node_modules"), destinationRoot);
  linkNodeModulesEntries(resolve(stanzaPackageRoot, "node_modules"), destinationRoot);
}

function linkNodeModulesEntries(sourceRoot: string, destinationRoot: string): void {
  for (const entry of readdirSync(sourceRoot)) {
    if (entry.startsWith(".")) {
      continue;
    }

    const sourcePath = resolve(sourceRoot, entry);
    const destinationPath = resolve(destinationRoot, entry);

    if (entry.startsWith("@")) {
      mkdirSync(destinationPath, { recursive: true });
      for (const scopedEntry of readdirSync(sourcePath)) {
        const scopedDestination = resolve(destinationPath, scopedEntry);

        if (!existsSync(scopedDestination)) {
          symlinkSync(resolve(sourcePath, scopedEntry), scopedDestination, "dir");
        }
      }

      continue;
    }

    if (!existsSync(destinationPath)) {
      symlinkSync(sourcePath, destinationPath, "dir");
    }
  }
}

function formatTogoMediumFetchMockScript(): string {
  const payloads = formatTogoMediumMockPayloads();

  return `
(() => {
  const payloads = ${JSON.stringify(payloads)};
  const jsonResponse = (body) =>
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  const textResponse = (body) =>
    new Response(body, {
      headers: { "content-type": "text/plain" },
      status: 200,
    });

  window.fetch = async (input) => {
    const rawUrl = typeof input === "string" ? input : input.url;
    const url = new URL(rawUrl, window.location.href);
    const route = url.pathname;
    const target = url.origin + url.pathname + url.search;

    if (target.includes("wikipedia.org")) {
      return jsonResponse(payloads.wikipedia);
    }

    if (target.includes("roundtree.newick")) {
      return textResponse("(kegg_A:1,kegg_B:1)n1:1,(kegg_C:1,kegg_D:1)n2:1;");
    }

    if (route.includes("gmdb_component_by_gmoid")) {
      return jsonResponse(payloads.componentDetail);
    }

    if (route.includes("gmdb_medium_by_gmid")) {
      return jsonResponse(payloads.mediumDetail);
    }

    if (route.includes("gmdb_strain_by_strainid")) {
      return jsonResponse(payloads.strainDetail);
    }

    if (route.includes("gmdb_organism_by_taxid")) {
      return jsonResponse(payloads.taxonDetail);
    }

    if (route.includes("gmdb_media_alignment_by_gm_ids")) {
      return jsonResponse(payloads.componentAlignment);
    }

    if (route.includes("gmdb_media_strains_alignment_by_gm_ids")) {
      return jsonResponse(payloads.strainAlignment);
    }

    if (route.includes("gmdb_stat_media_tax_histgram")) {
      return jsonResponse(payloads.statsCulturableSpecies);
    }

    if (route.includes("gms_by_kegg_tids_3")) {
      return jsonResponse(payloads.mediaByTid);
    }

    if (route.includes("gms_kegg_code_tid")) {
      return jsonResponse(payloads.keggCodeTid);
    }

    if (route.includes("gmdb_similar_media_node")) {
      return jsonResponse(payloads.similarMediaNode);
    }

    if (route.includes("gmdb_taxonomy_search_by_name")) {
      return jsonResponse(payloads.taxonSearch);
    }

    if (route.includes("gmdb_taxonomy_ancestors")) {
      return jsonResponse(payloads.taxonAncestors);
    }

    if (route.includes("gmdb_taxonomy_children")) {
      return jsonResponse(payloads.taxonChildren);
    }

    if (route.includes("gmdb_list_media_of_taxons")) {
      return jsonResponse(payloads.metaList);
    }

    if (route.includes("gmdb_find_media_by")) {
      return jsonResponse(payloads.findMedia);
    }

    if (route.includes("gmdb_medium_builder")) {
      return jsonResponse(payloads.mediumBuilder);
    }

    if (route.includes("gmdb_components_with_components")) {
      return jsonResponse(payloads.componentsWithComponents);
    }

    return jsonResponse(payloads.metaList);
  };
})();
`;
}

function formatTogoMediumMockPayloads(): Record<string, unknown> {
  return {
    componentAlignment: {
      components: [
        {
          function: "Carbon source",
          gmo_id: "GMO_001005",
          name: "Glucose",
          parent: null,
        },
      ],
      media: [
        {
          components: ["GMO_001005"],
          gm_id: "M1",
          name: "Demo Medium",
          organisms: ["T1"],
          original_media_id: "NBRC_M249",
        },
      ],
      organisms: [{ name: "Demo organism", tax_id: "T1" }],
    },
    componentDetail: {
      alt_labels_en: ["D-Glucose"],
      alt_labels_ja: [],
      id: "GMO_001005",
      label_ja: "グルコース",
      links: [],
      pref_label: "Glucose",
      properties: [{ gmo_id: "GMO_001005", label_en: "Carbohydrate", uri: "" }],
      roles: [],
      sub_classes: [],
      super_classes: [],
    },
    componentsWithComponents: [
      {
        components: [],
        gmo_id: "GMO_001005",
        name: "Glucose",
      },
    ],
    findMedia: {
      columns: [
        { key: "name", label: "Medium" },
        { key: "component", label: "Component" },
      ],
      contents: [
        {
          component: "Glucose",
          name: { href: "/medium/M1", label: "Togo Medium Demo" },
        },
      ],
      limit: 2,
      offset: 0,
      total: 1,
    },
    mediaByTid: {
      growth_media: [
        {
          components_group: {
            "http://purl.jp/bio/10/gmo/GMO_001005": {
              elements: [
                {
                  component: {
                    label: "Glucose",
                    uri: "http://purl.jp/bio/10/gmo/GMO_001005",
                  },
                },
              ],
              label: "Glucose",
            },
          },
          label: "Demo Medium",
          species: [{ label: "Demo organism", tid: "T1" }],
          uri: "http://purl.jp/bio/10/gm/M1",
        },
      ],
    },
    mediumBuilder: {
      components: [{ gmo_id: "GMO_001005", label: "Glucose", value: 1 }],
      medium: { gm_id: "M1", name: "Demo Medium" },
    },
    mediumDetail: {
      comments: [{ comment: "Demo note", paragraph_index: 2 }],
      components: [
        {
          items: [
            {
              component_name: "Glucose",
              gmo_id: "GMO_001005",
              label: "Glucose",
              unit: "g",
              volume: 1,
            },
          ],
          paragraph_index: 1,
          subcomponent_name: "Base",
        },
      ],
      meta: {
        gm: "M1",
        name: "Demo Medium",
        original_media_id: "NBRC_M249",
        ph: "7.0",
        src_url: "https://example.org/source",
      },
    },
    keggCodeTid: {
      A: { tid: "T1" },
      B: { tid: "T2" },
      C: { tid: "T3" },
      D: { tid: "T4" },
    },
    metaList: {
      columns: [
        { key: "name", label: "Medium" },
        { key: "component", label: "Component" },
      ],
      contents: [
        {
          component: "Glucose",
          name: { href: "/medium/M1", label: "Togo Medium Demo" },
        },
      ],
      limit: 2,
      offset: 0,
      total: 1,
    },
    similarMediaNode: {
      edges: [{ source: "M1", target: "M2", value: 1 }],
      nodes: [
        { id: "M1", label: "Demo Medium" },
        { id: "M2", label: "Similar Medium" },
      ],
    },
    statsCulturableSpecies: [
      { bin: "0-10", frequency: 10 },
      { bin: "10-20", frequency: 30 },
    ],
    strainAlignment: [
      {
        gm_id: "M1",
        label: "Demo Medium",
        organisms: [
          {
            class: { id: "1236", label: "Gammaproteobacteria" },
            domain: { id: "2", label: "Bacteria" },
            family: { id: "543", label: "Enterobacteriaceae" },
            genus: { id: "561", label: "Escherichia" },
            order: { id: "91347", label: "Enterobacterales" },
            phylum: { id: "1224", label: "Proteobacteria" },
            species: { id: "562", label: "Escherichia coli" },
            strain: { id: "S1", label: "Demo Strain" },
          },
        ],
      },
    ],
    strainDetail: {
      strain: {
        other_strain_id_list: [
          {
            other_strain_id: "S1-alt",
            other_strain_link: "https://example.org/strain/S1-alt",
          },
        ],
        strain_id: "S1",
        strain_name: "Demo Strain",
      },
      taxonomy: {
        authority_name: "Demo authority",
        lineage: [
          { label: "Bacteria", rank: "superkingdom", taxid: 2, uri: "https://example.org/taxon/2" },
          {
            label: "Escherichia coli",
            rank: "species",
            taxid: 562,
            uri: "https://example.org/taxon/562",
          },
        ],
        rank: "species",
        scientific_name: "Escherichia coli",
        taxid: 562,
      },
    },
    taxonDetail: {
      authority_name: "Demo authority",
      lineage: [
        { label: "Bacteria", rank: "superkingdom", taxid: 2, uri: "https://example.org/taxon/2" },
        {
          label: "Escherichia coli",
          rank: "species",
          taxid: 562,
          uri: "https://example.org/taxon/562",
        },
      ],
      other_type_material: [{ label: "Other Demo Strain", name: "S2" }],
      rank: "species",
      scientific_name: "Escherichia coli",
      taxid: "562",
      type_material: [{ label: "Demo Strain", name: "S1" }],
    },
    taxonAncestors: [
      { name: "Bacteria", rank: "superkingdom", tax_id: "2" },
      { name: "Escherichia coli", rank: "species", tax_id: "562" },
    ],
    taxonChildren: [{ name: "Escherichia coli", rank: "species", tax_id: "562" }],
    taxonSearch: [{ name: "Escherichia coli", rank: "species", tax_id: "562" }],
    wikipedia: {
      extract: "Demo Wikipedia summary",
      thumbnail: { source: "https://example.org/thumb.png" },
    },
  };
}

function writeVueRuntimeProbe(cwd: string): void {
  linkVuePackages(cwd);
  const stanzaDirectory = resolve(cwd, "stanzas", "vue-runtime-probe");
  mkdirSync(stanzaDirectory, { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "vue-runtime-probe",
        "stanza:label": "Vue Runtime Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [{ "stanza:key": "label", "stanza:type": "string" }],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.js"),
    [
      'import Stanza from "togostanza/stanza";',
      'import { createApp } from "vue";',
      'import App from "./App.vue";',
      "",
      "export default class VueRuntimeProbe extends Stanza {",
      "  app = undefined;",
      "",
      "  render() {",
      '    const main = this.root.querySelector("main");',
      "",
      "    if (!main) {",
      '      throw new Error("Vue Runtime Probe expected a main element.");',
      "    }",
      "",
      "    this.app?.unmount();",
      "    this.app = createApp(App, {",
      '      label: this.params.label || "(missing label)",',
      "    });",
      "    this.app.mount(main);",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "App.vue"),
    [
      "<template>",
      '  <section class="vue-runtime-probe" data-probe="vue-runtime">',
      "    <h1>Vue runtime probe</h1>",
      '    <p data-probe="label">{{ label }}</p>',
      "  </section>",
      "</template>",
      "",
      "<script>",
      "export default {",
      "  props: {",
      "    label: {",
      "      type: String,",
      "      required: true,",
      "    },",
      "  },",
      "};",
      "</script>",
      "",
      "<style>",
      ".vue-runtime-probe {",
      "  color: rgb(12, 34, 56);",
      "}",
      "</style>",
      "",
    ].join("\n"),
    "utf8",
  );
}

function linkVuePackages(cwd: string): void {
  linkNodePackages(cwd, ["vue"]);
}

function writeUtilsCompatProbe(cwd: string): void {
  installTogostanzaUtils(cwd);
  cpSync(
    resolve(
      repositoryRoot,
      "workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo/stanzas/utils-probe",
    ),
    resolve(cwd, "stanzas", "utils-probe"),
    { recursive: true },
  );
  cpSync(
    resolve(
      repositoryRoot,
      "workbench/cases/010-togostanza-utils-compat/current-pnpm/generated-repo/fixtures",
    ),
    resolve(cwd, "fixtures"),
    { recursive: true },
  );
  writeFileSync(resolve(cwd, "common.scss"), ":host {\n  --case-010-accent: #2f6f73;\n}\n", "utf8");
  updateMetadata(resolve(cwd, "stanzas", "utils-probe", "metadata.json"), {
    "stanza:style": [{ "stanza:default": "#2f6f73", "stanza:key": "--case-010-accent" }],
  });
}

function installTogostanzaUtils(cwd: string): void {
  const nodeModulesDirectory = resolve(cwd, "node_modules");
  mkdirSync(nodeModulesDirectory, { recursive: true });
  cpSync(
    resolve(repositoryRoot, "references", "togostanza-utils"),
    resolve(nodeModulesDirectory, "togostanza-utils"),
    {
      filter: (source) => !source.split(/[\\/]/).includes(".git"),
      recursive: true,
    },
  );
  linkNodePackages(cwd, ["d3", "csv-stringify", "date-fns"]);
}

function linkNodePackages(cwd: string, packageNames: readonly string[]): void {
  const nodeModulesDirectory = resolve(cwd, "node_modules");
  mkdirSync(nodeModulesDirectory, { recursive: true });

  for (const packageName of packageNames) {
    symlinkSync(
      resolve(packageRoot, "node_modules", packageName),
      resolve(nodeModulesDirectory, packageName),
      "dir",
    );
  }
}

function writeAssetResolutionProbe(cwd: string): void {
  const stanzaDirectory = resolve(cwd, "stanzas", "asset-resolution-probe");
  const packageDirectory = resolve(cwd, "node_modules", "case-browser-asset-package");
  mkdirSync(resolve(stanzaDirectory, "assets"), { recursive: true });
  mkdirSync(resolve(stanzaDirectory, "templates"), { recursive: true });
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    resolve(stanzaDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        "@context": { stanza: "http://togostanza.org/resource/stanza#" },
        "@id": "asset-resolution-probe",
        "stanza:label": "Asset Resolution Probe",
        "stanza:menu-placement": "none",
        "stanza:parameter": [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(packageDirectory, "package.json"),
    `${JSON.stringify({
      name: "case-browser-asset-package",
      type: "module",
      version: "0.0.0",
    })}\n`,
    "utf8",
  );
  writeFileSync(resolve(stanzaDirectory, "assets", "css-marker.svg"), formatSvg(16, "css"), "utf8");
  writeFileSync(
    resolve(stanzaDirectory, "assets", "local-marker.svg"),
    formatLargeSvg(12, "local"),
    "utf8",
  );
  writeFileSync(
    resolve(packageDirectory, "package-marker.svg"),
    formatLargeSvg(14, "package"),
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "style.scss"),
    `.asset-resolution-probe__css {
  background-image: url("./assets/css-marker.svg");
  background-repeat: no-repeat;
  background-size: 16px 16px;
  height: 16px;
  width: 16px;
}
`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "index.js"),
    `import Stanza from "togostanza/stanza";
import localMarkerUrl from "./assets/local-marker.svg";
import packageMarkerUrl from "case-browser-asset-package/package-marker.svg";

export default class AssetResolutionProbe extends Stanza {
  render() {
    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        localMarkerUrl,
        packageMarkerUrl,
      },
    });
  }
}
`,
    "utf8",
  );
  writeFileSync(
    resolve(stanzaDirectory, "templates", "stanza.html.hbs"),
    `<div
  class="asset-resolution-probe__css"
  data-probe="css-asset"
></div>
<img alt="local asset" data-probe="local-asset" src="{{localMarkerUrl}}">
<img alt="package asset" data-probe="package-asset" src="{{packageMarkerUrl}}">
`,
    "utf8",
  );
}

function formatSvg(size: number, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><title>${label}</title><rect width="${size}" height="${size}" fill="#2f6f73"/></svg>\n`;
}

function formatLargeSvg(size: number, label: string): string {
  return formatSvg(size, `${label}-${"x".repeat(5000)}`);
}

function makeTemporaryDirectory(): string {
  const parentDirectory = mkdtempSync(resolve(tmpdir(), "togostanza-browser-"));
  const directory = resolve(parentDirectory, "repo");
  mkdirSync(directory);
  temporaryDirectories.push(parentDirectory);
  return directory;
}

function startStaticServer(
  rootDirectory: string,
  requestLog: string[],
  sparqlRequests: SparqlRequest[] = [],
): Promise<Server> {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "/");
    requestLog.push(requestPath);

    if (requestPath === "/sparql") {
      let body = "";

      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => {
        sparqlRequests.push({
          body,
          contentType: request.headers["content-type"] ?? "",
          method: request.method ?? "",
        });
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ status: "ok" }));
      });
      return;
    }

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
    server.closeAllConnections();
  });
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
