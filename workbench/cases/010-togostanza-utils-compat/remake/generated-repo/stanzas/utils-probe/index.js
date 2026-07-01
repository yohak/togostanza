import Stanza from "togostanza/stanza";
import {
  appendCustomCss,
  dividerMenuItem,
  downloadCSVMenuItem,
  downloadJSONMenuItem,
  downloadPngMenuItem,
  downloadSvgMenuItem,
  downloadTSVMenuItem,
} from "togostanza-utils";
import applyFilter from "togostanza-utils/apply-filter";
import loadData from "togostanza-utils/load-data";

function ok(name, detail) {
  return { name, status: "ok", detail };
}

function ng(name, detail) {
  return { name, status: "ng", detail };
}

function assertCheck(name, condition, detail) {
  return condition ? ok(name, detail) : ng(name, detail);
}

function idsOf(records) {
  return records.map((record) => record.__togostanza_id__).join(",");
}

function resolveDocumentUrl(element, url) {
  return new URL(url, element.ownerDocument.baseURI).href;
}

export default class UtilsProbe extends Stanza {
  menu() {
    const data = this._jsonData ?? [];

    return [
      downloadSvgMenuItem(this, "utils-probe"),
      downloadPngMenuItem(this, "utils-probe"),
      dividerMenuItem(),
      downloadJSONMenuItem(this, "utils-probe", data),
      downloadCSVMenuItem(this, "utils-probe", data),
      downloadTSVMenuItem(this, "utils-probe", data),
    ];
  }

  async render() {
    const main = this.root.querySelector("main");
    const checks = [];
    const urls = {
      csv: resolveDocumentUrl(this.element, this.params["csv-url"]),
      customCssA: resolveDocumentUrl(this.element, this.params["custom-css-a-url"]),
      customCssB: resolveDocumentUrl(this.element, this.params["custom-css-b-url"]),
      error: resolveDocumentUrl(this.element, this.params["error-url"]),
      json: resolveDocumentUrl(this.element, this.params["json-url"]),
      sparql: resolveDocumentUrl(this.element, this.params["sparql-url"]),
      tsv: resolveDocumentUrl(this.element, this.params["tsv-url"]),
    };

    const jsonData = await loadData(urls.json, "json", main);
    this._jsonData = jsonData;
    checks.push(assertCheck("loadData json", jsonData.length === 3, `${jsonData.length} rows`));
    checks.push(assertCheck("__togostanza_id__", idsOf(jsonData) === "0,1,2", idsOf(jsonData)));

    const cachedJsonData = await loadData(urls.json, "json", main);
    checks.push(assertCheck("loadData cache", cachedJsonData === jsonData, "same object returned"));

    const csvData = await loadData(urls.csv, "csv", main);
    checks.push(assertCheck("loadData csv", csvData[1]?.label === "beta", csvData.map((row) => row.label).join(",")));

    const tsvData = await loadData(urls.tsv, "tsv", main);
    checks.push(assertCheck("loadData tsv", tsvData[2]?.label === "alphabet", tsvData.map((row) => row.label).join(",")));

    const sparqlData = await loadData(urls.sparql, "sparql-results-json", main);
    checks.push(assertCheck("loadData sparql-results-json", sparqlData[0]?.label === "alpha", JSON.stringify(sparqlData)));

    try {
      await loadData(urls.error, "json", main, 1000);
      checks.push(ng("loadData error ui", "request unexpectedly succeeded"));
    } catch (error) {
      const errorMessage = main.querySelector(".metastanza-error-message")?.textContent ?? "";
      checks.push(assertCheck("loadData error ui", errorMessage.includes("MetaStanza API error"), error.toString()));
    }

    checks.push(assertCheck("loadData loading cleanup", !main.querySelector("#metastanza-loading-icon-div"), "loading element removed"));

    const filtered = applyFilter(jsonData, [
      { type: "substring", target: "label", value: "alpha" },
      { type: "gte", target: "value", value: 1 },
      { type: "lte", target: "value", value: 3 },
    ]);
    checks.push(assertCheck("applyFilter", filtered.length === 2, filtered.map((row) => row.label).join(",")));

    appendCustomCss(this, urls.customCssA);
    appendCustomCss(this, urls.customCssB);
    const customLinks = this.root.querySelectorAll("link[data-togostanza-custom-css]");
    checks.push(
      assertCheck(
        "appendCustomCss replacement",
        customLinks.length === 1 && customLinks[0].href === urls.customCssB,
        Array.from(customLinks).map((link) => link.href).join(",")
      )
    );

    checks.push(
      assertCheck(
        "download root compat",
        this.root.host?.stanzaInstance?.element === this.element,
        this.root.host?.stanzaInstance?.element?.tagName ?? "missing"
      )
    );
    checks.push(assertCheck("download style compat", Boolean(this.root.querySelector("style")), "shadow style present"));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        overallStatus: checks.every((check) => check.status === "ok") ? "ok" : "ng",
        checks,
      },
    });

    const menuItems = this.menu();
    const menuLabels = menuItems.map((item) => item.label ?? item.type).join(",");
    const itemHandlers = menuItems
      .filter((item) => item.type === "item")
      .every((item) => typeof item.handler === "function");
    const divider = menuItems.some((item) => item.type === "divider");
    const menuChecks = [
      assertCheck("menu item contract", itemHandlers, menuLabels),
      assertCheck("divider menu item", divider, menuLabels),
    ];

    for (const check of menuChecks) {
      const row = document.createElement("tr");
      row.setAttribute("data-check", check.name);
      row.innerHTML = `<td>${check.name}</td><td data-status="${check.status}">${check.status}</td><td>${check.detail}</td>`;
      this.root.querySelector("tbody").appendChild(row);
    }

    const finalChecks = [...checks, ...menuChecks];
    this.root.querySelector("[data-probe='overall']").textContent = finalChecks.every((check) => check.status === "ok") ? "ok" : "ng";
  }
}
