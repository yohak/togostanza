import "bootstrap/dist/css/bootstrap.min.css";
import { computed, createApp, h, reactive, ref, type CSSProperties, type VNode } from "vue";

type MetadataEntry = Record<string, unknown>;

type PreviewData = {
  definition?: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
};

type PreviewTab = "about" | "events" | "parameters" | "styles";

type PreviewField = {
  choices: string[];
  defaultValue: string;
  description: string;
  hasInitialValue: boolean;
  key: string;
  required: boolean;
  type: string;
};

const previewDataElement = document.querySelector<HTMLScriptElement>("#togostanza-preview-data");
const mountElement = document.querySelector<HTMLElement>("#togostanza-help-app");

if (!previewDataElement || !mountElement) {
  throw new Error("TogoStanza help preview could not find its page data or mount element.");
}

const previewData = JSON.parse(previewDataElement.textContent ?? "") as PreviewData;

installPreviewStyles();

createApp({
  setup() {
    const activeTab = ref<PreviewTab>("parameters");
    const copyState = ref<"copied" | "failed" | "idle">("idle");
    const parameterFields = readFields(previewData.metadata["stanza:parameter"], "parameter");
    const styleFields = readFields(previewData.metadata["stanza:style"], "style");
    const parameterValues = reactive(
      Object.fromEntries(parameterFields.map((field) => [field.key, field.defaultValue])),
    );
    const styleValues = reactive(
      Object.fromEntries(styleFields.map((field) => [field.key, field.defaultValue])),
    );
    const parameterTouched = reactive<Record<string, boolean>>({});
    const styleTouched = reactive<Record<string, boolean>>({});
    const parameterAttributes = computed(() => {
      const attributes: Record<string, string> = {};

      for (const field of parameterFields) {
        const value = parameterValues[field.key] ?? "";

        if (!field.hasInitialValue && !parameterTouched[field.key]) {
          continue;
        }

        if (field.type === "boolean") {
          if (booleanValue(value)) {
            attributes[field.key] = "";
          }
          continue;
        }

        attributes[field.key] = value;
      }

      return attributes;
    });
    const previewStyles = computed<CSSProperties>(() =>
      Object.fromEntries(
        styleFields
          .filter((field) => field.hasInitialValue || styleTouched[field.key])
          .map((field) => [field.key, styleValues[field.key] ?? ""]),
      ),
    );
    const snippet = computed(() =>
      formatSnippet(
        previewData.id,
        parameterFields,
        parameterValues,
        parameterTouched,
        styleFields,
        styleValues,
        styleTouched,
      ),
    );

    async function copySnippet(): Promise<void> {
      try {
        await navigator.clipboard.writeText(snippet.value);
        copyState.value = "copied";
      } catch {
        copyState.value = "failed";
      }
    }

    return () =>
      h("main", { class: "container-fluid py-4 px-lg-5" }, [
        h("header", { class: "mb-4" }, [
          h("a", { class: "link-secondary text-decoration-none", href: "./index.html" }, "Stanzas"),
          h("h1", { class: "display-6 mt-2 mb-2" }, previewData.label),
          previewData.definition
            ? h("p", { class: "lead text-body-secondary mb-0" }, previewData.definition)
            : null,
        ]),
        h("div", { class: "row g-4 align-items-start" }, [
          h("section", { class: "col-xl-5" }, [
            renderTabs(activeTab),
            h(
              "div",
              { class: "border border-top-0 rounded-bottom p-3 p-lg-4 bg-body" },
              renderActivePanel(
                activeTab.value,
                parameterFields,
                parameterValues,
                parameterTouched,
                styleFields,
                styleValues,
                styleTouched,
                previewData,
              ),
            ),
          ]),
          h("section", { class: "col-xl-7" }, [
            h("div", { class: "border rounded p-3 p-lg-4 bg-body mb-4" }, [
              h("h2", { class: "h5 mb-3" }, "Preview"),
              h(
                "div",
                {
                  class: "togostanza-preview-stage",
                  "data-togostanza-preview": previewData.id,
                },
                [
                  h(`togostanza-${previewData.id}`, {
                    ...parameterAttributes.value,
                    style: previewStyles.value,
                  }),
                ],
              ),
            ]),
            h("div", { class: "border rounded p-3 p-lg-4 bg-body" }, [
              h("div", { class: "d-flex align-items-center justify-content-between gap-3 mb-3" }, [
                h("h2", { class: "h5 mb-0" }, "HTML snippet"),
                h(
                  "button",
                  {
                    class: "btn btn-outline-secondary btn-sm",
                    onClick: copySnippet,
                    type: "button",
                  },
                  copyState.value === "copied"
                    ? "Copied"
                    : copyState.value === "failed"
                      ? "Copy failed"
                      : "Copy",
                ),
              ]),
              h(
                "pre",
                {
                  class: "togostanza-snippet mb-0",
                  "data-togostanza-snippet": "",
                },
                h("code", snippet.value),
              ),
            ]),
          ]),
        ]),
      ]);
  },
}).mount(mountElement);

function renderTabs(activeTab: { value: PreviewTab }): VNode {
  const tabs: readonly [PreviewTab, string][] = [
    ["parameters", "Parameters"],
    ["styles", "Styles"],
    ["events", "Events"],
    ["about", "About"],
  ];

  return h(
    "nav",
    { "aria-label": "Stanza help sections", class: "nav nav-tabs" },
    tabs.map(([id, label]) =>
      h(
        "button",
        {
          "aria-selected": activeTab.value === id ? "true" : "false",
          class: ["nav-link", activeTab.value === id ? "active" : ""],
          "data-togostanza-tab": id,
          onClick: () => {
            activeTab.value = id;
          },
          role: "tab",
          type: "button",
        },
        label,
      ),
    ),
  );
}

function renderActivePanel(
  activeTab: PreviewTab,
  parameterFields: readonly PreviewField[],
  parameterValues: Record<string, string>,
  parameterTouched: Record<string, boolean>,
  styleFields: readonly PreviewField[],
  styleValues: Record<string, string>,
  styleTouched: Record<string, boolean>,
  data: PreviewData,
): VNode | VNode[] {
  switch (activeTab) {
    case "parameters":
      return renderFields(parameterFields, parameterValues, parameterTouched, "parameter");
    case "styles":
      return renderFields(styleFields, styleValues, styleTouched, "style");
    case "events":
      return renderEvents(data.metadata);
    case "about":
      return renderAbout(data);
  }
}

function renderFields(
  fields: readonly PreviewField[],
  values: Record<string, string>,
  touched: Record<string, boolean>,
  kind: "parameter" | "style",
): VNode | VNode[] {
  if (fields.length === 0) {
    return h("p", { class: "text-body-secondary mb-0" }, `No ${kind}s are defined.`);
  }

  return fields.map((field) =>
    h("div", { class: "mb-4", key: field.key }, [
      h("div", { class: "d-flex justify-content-between gap-3 mb-2" }, [
        h("label", { class: "form-label fw-semibold mb-0", for: fieldInputId(kind, field.key) }, [
          field.required ? h("span", { class: "text-danger me-1" }, "*") : null,
          field.key,
        ]),
        h("span", { class: "badge text-bg-light border fw-normal" }, field.type || "string"),
      ]),
      renderFieldInput(field, values, touched, kind),
      field.description ? h("div", { class: "form-text" }, field.description) : null,
    ]),
  );
}

function renderFieldInput(
  field: PreviewField,
  values: Record<string, string>,
  touched: Record<string, boolean>,
  kind: "parameter" | "style",
): VNode {
  const id = fieldInputId(kind, field.key);
  const dataAttribute = `data-togostanza-${kind}`;

  if (field.type === "single-choice") {
    return h(
      "select",
      {
        class: "form-select",
        [dataAttribute]: field.key,
        id,
        onChange: (event: Event) => {
          touched[field.key] = true;
          values[field.key] = (event.target as HTMLSelectElement).value;
        },
        value: values[field.key] ?? "",
      },
      field.choices.map((choice) => h("option", { key: choice, value: choice }, choice)),
    );
  }

  if (field.type === "boolean") {
    return h("div", { class: "form-check form-switch" }, [
      h("input", {
        checked: booleanValue(values[field.key] ?? ""),
        class: "form-check-input",
        [dataAttribute]: field.key,
        id,
        onChange: (event: Event) => {
          touched[field.key] = true;
          values[field.key] = String((event.target as HTMLInputElement).checked);
        },
        role: "switch",
        type: "checkbox",
      }),
      h(
        "label",
        { class: "form-check-label", for: id },
        booleanValue(values[field.key] ?? "") ? "Enabled" : "Disabled",
      ),
    ]);
  }

  const inputType = htmlInputType(field.type);

  return h("input", {
    class: ["form-control", inputType === "color" ? "form-control-color" : ""],
    [dataAttribute]: field.key,
    id,
    onInput: (event: Event) => {
      touched[field.key] = true;
      values[field.key] = (event.target as HTMLInputElement).value;
    },
    type: inputType,
    value: values[field.key] ?? "",
  });
}

function renderEvents(metadata: Record<string, unknown>): VNode {
  return h("div", { class: "vstack gap-4" }, [
    renderEventGroup("Incoming events", metadata["stanza:incomingEvent"]),
    renderEventGroup("Outgoing events", metadata["stanza:outgoingEvent"]),
  ]);
}

function renderEventGroup(title: string, value: unknown): VNode {
  const entries = readMetadataEntries(value);

  return h("section", [
    h("h2", { class: "h6" }, title),
    entries.length === 0
      ? h("p", { class: "text-body-secondary mb-0" }, "None")
      : h(
          "dl",
          { class: "mb-0" },
          entries.flatMap((entry) => [
            h("dt", { class: "fw-semibold" }, stringValue(entry["stanza:key"])),
            h("dd", { class: "text-body-secondary" }, stringValue(entry["stanza:description"])),
          ]),
        ),
  ]);
}

function renderAbout(data: PreviewData): VNode {
  const hiddenKeys = new Set([
    "@context",
    "stanza:incomingEvent",
    "stanza:outgoingEvent",
    "stanza:parameter",
    "stanza:style",
  ]);
  const rows = Object.entries(data.metadata)
    .filter(([key, value]) => !hiddenKeys.has(key) && isDisplayableMetadataValue(value))
    .map(([key, value]) =>
      h("tr", { key }, [
        h("th", { class: "text-nowrap", scope: "row" }, key),
        h("td", formatMetadataValue(value)),
      ]),
    );

  return h("div", [
    h("div", { class: "table-responsive mb-4" }, [
      h("table", { class: "table table-sm align-middle mb-0" }, [h("tbody", rows)]),
    ]),
    h(
      "a",
      {
        class: "btn btn-outline-primary",
        download: `${data.id}-metadata.json`,
        href: `./${data.id}/metadata.json`,
      },
      "Download JSON",
    ),
  ]);
}

function readFields(value: unknown, kind: "parameter" | "style"): PreviewField[] {
  return readMetadataEntries(value).flatMap((entry) => {
    const key = entry["stanza:key"];

    if (typeof key !== "string" || key.length === 0) {
      return [];
    }

    const hasDefault = Object.hasOwn(entry, "stanza:default");
    const hasExample = kind === "parameter" && Object.hasOwn(entry, "stanza:example");
    const hasInitialValue = hasDefault || hasExample;
    const initialValue = hasDefault
      ? entry["stanza:default"]
      : hasExample
        ? entry["stanza:example"]
        : undefined;

    return [
      {
        choices: Array.isArray(entry["stanza:choice"])
          ? entry["stanza:choice"].map(stringValue)
          : [],
        defaultValue: stringValue(initialValue),
        description: stringValue(entry["stanza:description"]),
        hasInitialValue,
        key,
        required: entry["stanza:required"] === true,
        type: stringValue(entry["stanza:type"]) || "string",
      },
    ];
  });
}

function readMetadataEntries(value: unknown): MetadataEntry[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function formatSnippet(
  id: string,
  parameterFields: readonly PreviewField[],
  parameterValues: Record<string, string>,
  parameterTouched: Record<string, boolean>,
  styleFields: readonly PreviewField[],
  styleValues: Record<string, string>,
  styleTouched: Record<string, boolean>,
): string {
  const tagName = `togostanza-${id}`;
  const attributeLines = parameterFields.flatMap((field) => {
    const value = parameterValues[field.key] ?? "";

    if (!field.hasInitialValue && !parameterTouched[field.key]) {
      return [];
    }

    if (field.type === "boolean") {
      return booleanValue(value) ? [`  ${field.key}`] : [];
    }

    return [`  ${field.key}="${escapeAttribute(value)}"`];
  });
  const changedStyles = styleFields.filter(
    (field) =>
      (field.hasInitialValue || styleTouched[field.key]) &&
      (styleValues[field.key] ?? "") !== field.defaultValue,
  );
  const styleBlock =
    changedStyles.length === 0
      ? []
      : [
          "<style>",
          `  ${tagName} {`,
          ...changedStyles.map((field) => `    ${field.key}: ${styleValues[field.key] ?? ""};`),
          "  }",
          "</style>",
          "",
        ];
  const tag =
    attributeLines.length === 0
      ? `<${tagName}></${tagName}>`
      : [`<${tagName}`, ...attributeLines, `></${tagName}>`].join("\n");

  return [`<script type="module" src="./${id}.js"></script>`, "", ...styleBlock, tag].join("\n");
}

function fieldInputId(kind: string, key: string): string {
  return `togostanza-${kind}-${key.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function htmlInputType(type: string): string {
  const supportedTypes = new Set([
    "color",
    "date",
    "datetime-local",
    "email",
    "month",
    "number",
    "range",
    "search",
    "tel",
    "text",
    "time",
    "url",
    "week",
  ]);
  const normalizedType = type === "datetime" ? "datetime-local" : type;

  return supportedTypes.has(normalizedType) ? normalizedType : "text";
}

function booleanValue(value: string): boolean {
  return value.trim().toLowerCase() === "true";
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function isDisplayableMetadataValue(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((item) => typeof item !== "object"))
  );
}

function formatMetadataValue(value: unknown): string {
  return Array.isArray(value) ? value.map(stringValue).join(", ") : stringValue(value);
}

function isRecord(value: unknown): value is MetadataEntry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function installPreviewStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: light;
    }

    body {
      background: #f5f7f8;
      color: #202428;
    }

    .togostanza-preview-stage {
      min-height: 18rem;
      overflow: auto;
      padding: 1rem;
      background: #f5f7f8;
    }

    .togostanza-snippet {
      max-height: 24rem;
      overflow: auto;
      padding: 1rem;
      color: #f8f9fa;
      background: #202428;
      border-radius: 0.25rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    @media (max-width: 575.98px) {
      .nav-tabs .nav-link {
        padding-inline: 0.65rem;
      }
    }
  `;
  document.head.append(style);
}
