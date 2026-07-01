#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const requireFromPackage = createRequire(resolve(repositoryRoot, "package", "package.json"));
const { chromium } = requireFromPackage("@playwright/test");

const cases = [
  {
    id: "003",
    cwd: "workbench/cases/003-runtime-embedding/remake/generated-repo",
    url: "http://127.0.0.1:4173/runtime-embed.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-hello", "Hello, runtime!");
      await expectCustomElement(
        page,
        "togostanza-menuless-hello",
        "Hello without menu, runtime!",
      );
    },
  },
  {
    id: "004",
    cwd: "workbench/cases/004-runtime-parameters/remake/generated-repo",
    url: "http://127.0.0.1:4174/fixtures/runtime-parameters.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-parameter-probe", "Runtime parameter probe");
      await expectProbeText(page, "togostanza-parameter-probe", "label-value", "flag-present");
      await expectProbeText(page, "togostanza-parameter-probe", "count-value", "42");
      await expectProbeText(page, "togostanza-parameter-probe", "flag-value", "true");
    },
  },
  {
    id: "005",
    cwd: "workbench/cases/005-stanza-source-api/remake/generated-repo",
    url: "http://127.0.0.1:4175/fixtures/source-api.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-api-probe", "Stanza source API probe");
      await expectProbeText(page, "#api-probe-mutation-target", "query", "ok");
      await page.locator("[data-action='set-label']").click();
      await expectProbeText(page, "#api-probe-mutation-target", "string-param", "after-mutation");
    },
  },
  {
    id: "006",
    cwd: "workbench/cases/006-inter-stanza-coordination/remake/generated-repo",
    url: "http://127.0.0.1:4176/fixtures/inter-stanza.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-coordination-sender", "Send from-sender");
      await expectObservedText(page, "data-source-label", "from-data-source");
      await page
        .locator("togostanza-coordination-sender")
        .evaluate((element) => element.shadowRoot?.querySelector("button")?.click());
      await expectObservedText(page, "selected-label", "from-sender");
    },
  },
  {
    id: "007",
    cwd: "workbench/cases/007-config-and-resolution/remake/generated-repo",
    url: "http://127.0.0.1:4177/fixtures/config-resolution.html",
    verify: async (page) => {
      await expectCustomElement(
        page,
        "togostanza-config-resolution",
        "case-007 relative import resolved",
      );
      await waitForCondition(page, () => {
        const host = document.querySelector("togostanza-config-resolution");
        const images = [...(host?.shadowRoot?.querySelectorAll("img") ?? [])];
        return images.length === 2 && images.every((image) => image.naturalWidth > 0);
      });
    },
  },
  {
    id: "008",
    cwd: "workbench/cases/008-react-runtime/remake/generated-repo",
    url: "http://127.0.0.1:4178/fixtures/react-runtime.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-react-runtime", "React runtime probe");
      await expectProbeText(page, "togostanza-react-runtime", "label", "initial-react");
      await page.locator("[data-action='mutate']").click();
      await expectProbeText(page, "togostanza-react-runtime", "label", "after-react-mutation");
      await expectProbeText(page, "togostanza-react-runtime", "count", "2");
    },
  },
  {
    id: "009",
    cwd: "workbench/cases/009-vue-runtime/remake/generated-repo",
    url: "http://127.0.0.1:4179/fixtures/vue-runtime.html",
    verify: async (page) => {
      await expectCustomElement(page, "togostanza-vue-runtime", "Vue runtime probe");
      await expectProbeText(page, "togostanza-vue-runtime", "label", "initial-vue");
    },
  },
  {
    id: "010",
    cwd: "workbench/cases/010-togostanza-utils-compat/remake/generated-repo",
    url: "http://127.0.0.1:4180/fixtures/utils-compat.html",
    allowedConsoleErrors: [/404 \(Not Found\)/],
    verify: async (page) => {
      await expectProbeText(page, "togostanza-utils-probe", "overall", "ok");
      await waitForCondition(page, () => {
        const host = document.querySelector("togostanza-utils-probe");
        return [
          ...(host?.shadowRoot?.querySelectorAll("[data-status='ng']") ?? []),
        ].length === 0;
      });
    },
  },
];

const browser = await chromium.launch();

try {
  for (const testCase of cases) {
    await verifyCase(testCase);
  }
} finally {
  await browser.close();
}

async function verifyCase(testCase) {
  const cwd = resolve(repositoryRoot, testCase.cwd);
  console.log(`\n[${testCase.id}] build:local`);
  run("pnpm", ["run", "build:local"], cwd);

  console.log(`[${testCase.id}] serve:fixture`);
  const server = spawn("pnpm", ["run", "serve:fixture"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const serverLog = [];
  server.stdout.on("data", (chunk) => serverLog.push(chunk.toString()));
  server.stderr.on("data", (chunk) => serverLog.push(chunk.toString()));

  try {
    await waitForHttp(testCase.url);
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    try {
      await page.goto(testCase.url, { waitUntil: "load" });
      await testCase.verify(page);

      const allowedConsoleErrors = testCase.allowedConsoleErrors ?? [];
      const unexpectedConsoleErrors = consoleErrors.filter(
        (error) => !allowedConsoleErrors.some((pattern) => pattern.test(error)),
      );

      if (unexpectedConsoleErrors.length > 0 || pageErrors.length > 0) {
        throw new Error(
          [
            `browser errors in ${testCase.id}`,
            ...unexpectedConsoleErrors.map((error) => `console: ${error}`),
            ...pageErrors.map((error) => `pageerror: ${error}`),
          ].join("\n"),
        );
      }
    } finally {
      await page.close();
    }

    console.log(`[${testCase.id}] ok`);
  } finally {
    server.kill("SIGTERM");
    await delay(100);

    if (server.exitCode === null) {
      server.kill("SIGKILL");
    }
  }

  if (serverLog.some((line) => /EADDRINUSE/.test(line))) {
    throw new Error(`server failed for ${testCase.id}:\n${serverLog.join("")}`);
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}`);
  }
}

async function waitForHttp(url) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 10_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function expectCustomElement(page, selector, expectedText) {
  await waitForCondition(
    page,
    (args) => {
      const element = document.querySelector(args.selector);
      const text = element?.shadowRoot?.querySelector("main")?.textContent ?? "";
      return text.includes(args.expectedText);
    },
    { expectedText, selector },
  );
}

async function expectProbeText(page, hostSelector, probeName, expectedText) {
  await waitForCondition(
    page,
    (args) => {
      const element = document.querySelector(args.hostSelector);
      const text =
        element?.shadowRoot?.querySelector(`[data-probe="${args.probeName}"]`)?.textContent ?? "";
      return text.includes(args.expectedText);
    },
    { expectedText, hostSelector, probeName },
  );
}

async function expectObservedText(page, observedName, expectedText) {
  await waitForCondition(
    page,
    (args) => {
      const receiver = document.querySelector("togostanza-coordination-receiver");
      const text =
        receiver?.shadowRoot?.querySelector(`[data-observed="${args.observedName}"]`)
          ?.textContent ?? "";
      return text.includes(args.expectedText);
    },
    { expectedText, observedName },
  );
}

async function waitForCondition(page, predicate, arg = undefined) {
  await page.waitForFunction(predicate, arg, {
    timeout: 10_000,
  });
}
