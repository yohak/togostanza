type StanzaRuntimeContext = {
  element: HTMLElement;
  metadata: Record<string, unknown>;
  root: ShadowRoot;
};

type StanzaConstructor = new () => Stanza;

export type StanzaRegistration = {
  aboutUrl: URL;
  cssUrl: URL;
  id: string;
  metadata: Record<string, unknown>;
  StanzaClass: StanzaConstructor;
  tagName: string;
};

export default class Stanza {
  element!: HTMLElement;
  metadata: Record<string, unknown> = {};
  params: Record<string, unknown> = {};
  root!: ShadowRoot;

  initializeRuntime(context: StanzaRuntimeContext): void {
    this.element = context.element;
    this.metadata = context.metadata;
    this.root = context.root;
  }

  renderTemplate(_input: unknown): void {
    // Phase 2-3 fills in template rendering.
  }
}

export function registerStanza(registration: StanzaRegistration): void {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") {
    return;
  }

  if (customElements.get(registration.tagName)) {
    return;
  }

  class TogoStanzaElement extends HTMLElement {
    static observedAttributes = ["togostanza-menu-placement"];

    stanzaInstance: Stanza;
    #menuShell: HTMLElement;

    constructor() {
      super();

      const root = this.attachShadow({ mode: "open" });
      root.append(createStyleDefaults(registration.metadata));
      root.append(createStylesheetLink(registration.cssUrl));
      root.append(document.createElement("main"));

      this.#menuShell = createMenuShell(registration.aboutUrl);
      root.append(this.#menuShell);

      this.stanzaInstance = new registration.StanzaClass();
      this.stanzaInstance.initializeRuntime({
        element: this,
        metadata: registration.metadata,
        root,
      });
    }

    connectedCallback(): void {
      this.#updateMenuShell();
    }

    attributeChangedCallback(): void {
      this.#updateMenuShell();
    }

    #updateMenuShell(): void {
      const placement = resolveMenuPlacement(this, registration.metadata);

      this.#menuShell.dataset.placement = placement;
      this.#menuShell.hidden = placement === "none";
    }
  }

  customElements.define(registration.tagName, TogoStanzaElement);
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

  const aboutLink = document.createElement("a");
  aboutLink.href = aboutUrl.href;
  aboutLink.textContent = "About";

  menu.append(aboutLink);

  return menu;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
