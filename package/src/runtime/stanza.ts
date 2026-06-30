type StanzaRuntimeContext = {
  assetBaseUrl: URL;
  element: HTMLElement;
  metadata: Record<string, unknown>;
  requestRender: () => Promise<void>;
  root: ShadowRoot;
  templates: Record<string, TemplateRenderer>;
};

type StanzaConstructor = new () => Stanza;
type TemplateRenderer = (parameters?: Record<string, unknown>) => string;
type AttributeSource = Pick<HTMLElement, "getAttribute" | "hasAttribute">;
type StanzaElement = HTMLElement & {
  stanzaInstance?: Stanza;
};

type MenuEntry = MenuDivider | MenuItem;

type MenuDivider = {
  type: "divider";
};

type MenuItem = {
  handler?: () => void;
  label: string;
  type: "item";
};

export type QueryInput = {
  endpoint: string;
  method?: "POST";
  parameters?: Record<string, unknown>;
  template: string;
};

export type RenderTemplateInput = {
  parameters?: Record<string, unknown>;
  selector?: string;
  template: string;
};

export type StanzaRegistration = {
  aboutUrl: URL;
  assetBaseUrl: URL;
  cssUrl: URL;
  id: string;
  metadata: Record<string, unknown>;
  StanzaClass: StanzaConstructor;
  tagName: string;
  templates: Record<string, TemplateRenderer>;
};

const initializeRuntime = Symbol("togostanza.initializeRuntime");

export default class Stanza {
  element!: HTMLElement;
  metadata: Record<string, unknown> = {};
  params: Record<string, unknown> = {};
  root!: ShadowRoot;
  #assetBaseUrl: URL | undefined;
  #requestRender: (() => Promise<void>) | undefined;
  #templates: Record<string, TemplateRenderer> = {};

  [initializeRuntime](context: StanzaRuntimeContext): void {
    this.#assetBaseUrl = context.assetBaseUrl;
    this.element = context.element;
    this.metadata = context.metadata;
    this.#requestRender = context.requestRender;
    this.root = context.root;
    this.#templates = context.templates;
  }

  render(): unknown {
    return undefined;
  }

  handleAttributeChange(_name: string, _oldValue: string | null, _newValue: string | null): void {
    void this.#requestRender?.();
  }

  handleEvent(_event: Event): void {
    // Real Stanza-to-Stanza event wiring belongs to Phase 2-5.
  }

  importWebFontCSS(cssUrl: string): void {
    const link = document.createElement("link");
    link.href = resolveStanzaAssetUrl(cssUrl, this.#assetBaseUrl).href;
    link.rel = "stylesheet";
    this.root.append(link);
  }

  menu(): MenuEntry[] {
    return [];
  }

  async query(input: QueryInput): Promise<unknown> {
    const method = input.method ?? "POST";

    if (method !== "POST") {
      throw new Error(`Unsupported query method: ${method}`);
    }

    const query = this.renderTemplateString(input.template, input.parameters);
    const body = new URLSearchParams({ query });
    const response = await fetch(input.endpoint, {
      body,
      headers: {
        accept: "application/sparql-results+json, application/json",
      },
      method,
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("json")) {
      return await response.json();
    }

    return await response.text();
  }

  renderTemplate(input: RenderTemplateInput): void {
    const target = input.selector
      ? this.root.querySelector<HTMLElement>(input.selector)
      : this.root.querySelector<HTMLElement>("main");

    if (!target) {
      throw new Error(`Template target not found: ${input.selector ?? "main"}`);
    }

    target.innerHTML = this.renderTemplateString(input.template, input.parameters);
  }

  protected renderTemplateString(template: string, parameters?: Record<string, unknown>): string {
    const renderer = this.#templates[template];

    if (!renderer) {
      throw new Error(`Unknown template: ${template}`);
    }

    return String(renderer(parameters ?? {}));
  }
}

export function registerStanza(registration: StanzaRegistration): void {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") {
    return;
  }

  registerCoordinationElements();

  if (customElements.get(registration.tagName)) {
    return;
  }

  const parameterKeys = parameterAttributeKeys(registration.metadata);
  const observedAttributes = ["togostanza-menu-placement", ...parameterKeys];

  class TogoStanzaElement extends HTMLElement {
    static observedAttributes = observedAttributes;

    stanzaInstance: Stanza;
    #menuShell: HTMLElement;
    #hasConnected = false;

    constructor() {
      super();

      const root = this.attachShadow({ mode: "open" });
      root.append(createStyleDefaults(registration.metadata));
      root.append(createStylesheetLink(registration.cssUrl));
      root.append(document.createElement("main"));

      this.#menuShell = createMenuShell(registration.aboutUrl);
      root.append(this.#menuShell);

      this.stanzaInstance = new registration.StanzaClass();
      this.stanzaInstance[initializeRuntime]({
        assetBaseUrl: registration.assetBaseUrl,
        element: this,
        metadata: registration.metadata,
        requestRender: () => this.#renderStanzaWithReport(),
        root,
        templates: registration.templates,
      });
    }

    connectedCallback(): void {
      this.#hasConnected = true;
      this.#refreshParams();
      this.#updateMenuShell();
      this.#scheduleRender();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue) {
        return;
      }

      this.#refreshParams();
      this.#updateMenuShell();

      if (this.#hasConnected && parameterKeys.includes(name)) {
        this.stanzaInstance.handleAttributeChange(name, oldValue, newValue);
      }
    }

    #refreshParams(): void {
      this.stanzaInstance.params = createStanzaParams(this, registration.metadata);
    }

    #scheduleRender(): void {
      void this.#renderStanzaWithReport();
    }

    async #renderStanzaWithReport(): Promise<void> {
      try {
        await this.#renderStanza();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`togostanza render failed for ${registration.id}: ${message}`);
      }
    }

    async #renderStanza(): Promise<void> {
      await this.stanzaInstance.render();
      this.#updateMenuShell();
    }

    #updateMenuShell(): void {
      const placement = resolveMenuPlacement(this, registration.metadata);

      this.#menuShell.dataset.placement = placement;
      this.#menuShell.hidden = placement === "none";
      renderMenuItems(this.#menuShell, this.stanzaInstance.menu());
    }
  }

  customElements.define(registration.tagName, TogoStanzaElement);
}

function registerCoordinationElements(): void {
  if (!customElements.get("togostanza--container")) {
    class TogoStanzaContainerElement extends HTMLElement {
      #connected = false;

      connectedCallback(): void {
        if (this.#connected) {
          return;
        }

        this.#connected = true;
        this.#connectWhenReady(0);
      }

      #connectWhenReady(attempt: number): void {
        const stanzaElements = this.#stanzaElements();

        if (stanzaElements.every((element) => element.stanzaInstance)) {
          this.#connectStanzaHandlers(stanzaElements);
          this.#connectEventMaps(stanzaElements);
          void this.#connectDataSources();
          return;
        }

        window.setTimeout(() => this.#connectWhenReady(attempt + 1), 2 ** Math.min(attempt, 11));
      }

      #stanzaElements(): StanzaElement[] {
        return [...this.querySelectorAll<HTMLElement>("*")].filter(
          (element): element is StanzaElement => {
            return (
              element.tagName.startsWith("TOGOSTANZA-") &&
              !element.tagName.startsWith("TOGOSTANZA--")
            );
          },
        );
      }

      #connectStanzaHandlers(stanzaElements: StanzaElement[]): void {
        for (const sourceElement of stanzaElements) {
          const sourceInstance = sourceElement.stanzaInstance;

          if (!sourceInstance) {
            continue;
          }

          for (const eventName of eventNames(sourceInstance.metadata, "stanza:outgoingEvent")) {
            sourceElement.addEventListener(eventName, (event) => {
              for (const receiverElement of stanzaElements) {
                const receiverInstance = receiverElement.stanzaInstance;

                if (
                  receiverInstance &&
                  eventNames(receiverInstance.metadata, "stanza:incomingEvent").includes(eventName)
                ) {
                  receiverInstance.handleEvent(event);
                }
              }
            });
          }
        }
      }

      #connectEventMaps(stanzaElements: StanzaElement[]): void {
        for (const mapElement of this.querySelectorAll<HTMLElement>("togostanza--event-map")) {
          const eventName = mapElement.getAttribute("on");
          const receiverSelector = mapElement.getAttribute("receiver");
          const targetAttribute = mapElement.getAttribute("target-attribute");

          if (!eventName || !receiverSelector || !targetAttribute) {
            continue;
          }

          const receiverElement = this.querySelector<StanzaElement>(receiverSelector);
          const receiverInstance = receiverElement?.stanzaInstance;

          if (!receiverElement || !receiverInstance) {
            console.warn(`togostanza--event-map receiver not found: ${receiverSelector}`);
            continue;
          }

          if (!eventNames(receiverInstance.metadata, "stanza:incomingEvent").includes(eventName)) {
            console.warn(
              `togostanza--event-map receiver does not declare incoming event: ${eventName}`,
            );
            continue;
          }

          if (!parameterAttributeKeys(receiverInstance.metadata).includes(targetAttribute)) {
            console.warn(
              `togostanza--event-map target-attribute is not a receiver parameter: ${targetAttribute}`,
            );
            continue;
          }

          for (const sourceElement of stanzaElements) {
            const sourceInstance = sourceElement.stanzaInstance;

            if (
              !sourceInstance ||
              !eventNames(sourceInstance.metadata, "stanza:outgoingEvent").includes(eventName)
            ) {
              continue;
            }

            sourceElement.addEventListener(eventName, (event) => {
              const valuePath = mapElement.getAttribute("value-path");
              const value =
                event instanceof CustomEvent
                  ? valueAtPath(event.detail, valuePath)
                  : valueAtPath(undefined, valuePath);

              setMappedAttribute(receiverElement, targetAttribute, value);
            });
          }
        }
      }

      async #connectDataSources(): Promise<void> {
        const dataSources = [...this.querySelectorAll<HTMLElement>("togostanza--data-source")];
        await Promise.all(dataSources.map((dataSource) => this.#connectDataSource(dataSource)));
      }

      async #connectDataSource(dataSource: HTMLElement): Promise<void> {
        const sourceUrl = dataSource.getAttribute("url");
        const receiverSelector = dataSource.getAttribute("receiver");
        const targetAttribute = dataSource.getAttribute("target-attribute");

        if (!sourceUrl || !receiverSelector || !targetAttribute) {
          return;
        }

        const receiverElement = this.querySelector<StanzaElement>(receiverSelector);
        const receiverInstance = receiverElement?.stanzaInstance;

        if (!receiverElement || !receiverInstance) {
          console.warn(`togostanza--data-source receiver not found: ${receiverSelector}`);
          return;
        }

        if (!parameterAttributeKeys(receiverInstance.metadata).includes(targetAttribute)) {
          console.warn(
            `togostanza--data-source target-attribute is not a receiver parameter: ${targetAttribute}`,
          );
          return;
        }

        try {
          const response = await fetch(new URL(sourceUrl, document.baseURI));
          const blob = await response.blob();
          receiverElement.setAttribute(targetAttribute, URL.createObjectURL(blob));
        } catch (error) {
          console.error(
            `togostanza--data-source failed to fetch ${sourceUrl}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    customElements.define("togostanza--container", TogoStanzaContainerElement);
  }

  if (!customElements.get("togostanza--event-map")) {
    class TogoStanzaEventMapElement extends HTMLElement {}

    customElements.define("togostanza--event-map", TogoStanzaEventMapElement);
  }

  if (!customElements.get("togostanza--data-source")) {
    class TogoStanzaDataSourceElement extends HTMLElement {}

    customElements.define("togostanza--data-source", TogoStanzaDataSourceElement);
  }
}

function createStyleDefaults(metadata: Record<string, unknown>): HTMLStyleElement {
  const style = document.createElement("style");
  const rules = styleDefaultRules(metadata);

  if (rules) {
    style.append(rules);
  }

  return style;
}

function createStylesheetLink(cssUrl: URL): HTMLLinkElement {
  const link = document.createElement("link");
  link.href = cssUrl.href;
  link.rel = "stylesheet";

  return link;
}

function createMenuShell(aboutUrl: URL): HTMLElement {
  const menu = document.createElement("nav");
  menu.dataset.togostanzaMenu = "";

  const items = document.createElement("div");
  items.dataset.togostanzaMenuItems = "";

  const aboutLink = document.createElement("a");
  aboutLink.href = aboutUrl.href;
  aboutLink.textContent = "About";

  menu.append(items, aboutLink);

  return menu;
}

function renderMenuItems(menu: HTMLElement, entries: MenuEntry[]): void {
  const items = menu.querySelector<HTMLElement>("[data-togostanza-menu-items]");

  if (!items) {
    return;
  }

  items.replaceChildren(...entries.map((entry) => createMenuEntryElement(entry)));
}

function createMenuEntryElement(entry: MenuEntry): HTMLElement {
  if (entry.type === "divider") {
    const divider = document.createElement("hr");
    divider.dataset.togostanzaMenuDivider = "";
    return divider;
  }

  const button = document.createElement("button");
  button.dataset.togostanzaMenuItem = "";
  button.textContent = entry.label;

  if (entry.handler) {
    button.addEventListener("click", entry.handler);
  }

  return button;
}

function resolveMenuPlacement(element: HTMLElement, metadata: Record<string, unknown>): string {
  const attributePlacement = element.getAttribute("togostanza-menu-placement");

  if (attributePlacement) {
    return attributePlacement;
  }

  const metadataPlacement = metadata["stanza:menu-placement"];

  if (typeof metadataPlacement === "string" && metadataPlacement) {
    return metadataPlacement;
  }

  return "bottom-right";
}

function styleDefaultRules(metadata: Record<string, unknown>): string {
  const styleDefinitions = metadata["stanza:style"];

  if (!Array.isArray(styleDefinitions)) {
    return "";
  }

  const declarations = styleDefinitions
    .map((definition) => {
      if (!isRecord(definition)) {
        return undefined;
      }

      const key = definition["stanza:key"];
      const defaultValue = definition["stanza:default"];

      if (typeof key !== "string" || typeof defaultValue !== "string") {
        return undefined;
      }

      return `  ${key}: ${defaultValue};`;
    })
    .filter((declaration) => declaration !== undefined);

  if (declarations.length === 0) {
    return "";
  }

  return [":host {", ...declarations, "}"].join("\n");
}

export function createStanzaParams(
  element: AttributeSource,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const parameter of parameterDefinitions(metadata)) {
    if (parameter.type === "boolean") {
      params[parameter.key] = element.hasAttribute(parameter.key);
      continue;
    }

    const attributeValue = element.getAttribute(parameter.key);

    if (attributeValue === null) {
      continue;
    }

    params[parameter.key] = parseParameterValue(attributeValue, parameter.type);
  }

  return params;
}

function parseParameterValue(value: string, type: string): unknown {
  switch (type) {
    case "boolean":
      return value !== "";
    case "number":
      return Number(value);
    case "json":
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    case "date":
    case "datetime":
      return new Date(value);
    default:
      return value;
  }
}

function resolveStanzaAssetUrl(cssUrl: string, assetBaseUrl: URL | undefined): URL {
  const baseUrl = assetBaseUrl ?? new URL(".", document.baseURI);

  if (cssUrl.startsWith("./assets/")) {
    return new URL(cssUrl.slice("./assets/".length), baseUrl);
  }

  if (cssUrl.startsWith("assets/")) {
    return new URL(cssUrl.slice("assets/".length), baseUrl);
  }

  return new URL(cssUrl, baseUrl);
}

function parameterAttributeKeys(metadata: Record<string, unknown>): string[] {
  return parameterDefinitions(metadata).map((parameter) => parameter.key);
}

function parameterDefinitions(
  metadata: Record<string, unknown>,
): Array<{ key: string; type: string }> {
  const parameters = metadata["stanza:parameter"];

  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters.flatMap((parameter) => {
    if (!isRecord(parameter)) {
      return [];
    }

    const key = parameter["stanza:key"];
    const type = parameter["stanza:type"];

    if (typeof key !== "string" || key === "") {
      return [];
    }

    return [
      {
        key,
        type: typeof type === "string" ? type : "string",
      },
    ];
  });
}

function eventNames(metadata: Record<string, unknown>, key: string): string[] {
  const events = metadata[key];

  if (!Array.isArray(events)) {
    return [];
  }

  return events.flatMap((event) => {
    if (!isRecord(event)) {
      return [];
    }

    const eventName = event["stanza:key"];
    return typeof eventName === "string" && eventName ? [eventName] : [];
  });
}

function valueAtPath(value: unknown, path: string | null): unknown {
  if (!path) {
    return value;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, value);
}

function setMappedAttribute(element: HTMLElement, attributeName: string, value: unknown): void {
  if (value === undefined || value === false) {
    element.removeAttribute(attributeName);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (typeof value === "string") {
    element.setAttribute(attributeName, value);
    return;
  }

  element.setAttribute(attributeName, JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
