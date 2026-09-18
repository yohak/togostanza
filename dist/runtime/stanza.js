import { registerTogoStanzaMenuElement, } from "./menu.js";
const coordinationReadyMaxAttempts = 10;
let pendingRuntimeContext;
const initializeRuntime = Symbol("togostanza.initializeRuntime");
export default class Stanza {
    element;
    metadata = {};
    root;
    #assetBaseUrl;
    #renderDebounceTimer;
    #requestRender;
    #templates = {};
    constructor() {
        if (pendingRuntimeContext) {
            this[initializeRuntime](pendingRuntimeContext);
        }
    }
    get params() {
        return createStanzaParams(this.element, this.metadata);
    }
    [initializeRuntime](context) {
        this.#assetBaseUrl = context.assetBaseUrl;
        this.element = context.element;
        this.metadata = context.metadata;
        this.#requestRender = context.requestRender;
        this.root = context.root;
        this.#templates = context.templates;
    }
    render() {
        return undefined;
    }
    handleAttributeChange(_name, _oldValue, _newValue) {
        if (this.#renderDebounceTimer) {
            clearTimeout(this.#renderDebounceTimer);
        }
        this.#renderDebounceTimer = setTimeout(() => {
            this.#renderDebounceTimer = undefined;
            void this.#requestRender?.();
        }, 50);
    }
    handleEvent(_event) {
        // Real Stanza-to-Stanza event wiring belongs to Phase 2-5.
    }
    importWebFontCSS(cssUrl) {
        const link = document.createElement("link");
        link.href = resolveStanzaAssetUrl(cssUrl, this.#assetBaseUrl).href;
        link.rel = "stylesheet";
        document.head.append(link);
        this.root.append(link.cloneNode());
    }
    menu() {
        return [];
    }
    async query(input) {
        const method = input.method ?? "POST";
        if (method !== "POST") {
            throw new Error(`Unsupported query method: ${method}`);
        }
        const query = this.renderTemplateString(input.template, input.parameters);
        const body = new URLSearchParams({ query });
        const response = await fetch(input.endpoint, {
            body,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
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
    renderTemplate(input) {
        const target = input.selector
            ? this.root.querySelector(input.selector)
            : this.root.querySelector("main");
        if (!target) {
            throw new Error(`Template target not found: ${input.selector ?? "main"}`);
        }
        target.innerHTML = this.renderTemplateString(input.template, input.parameters);
    }
    renderTemplateString(template, parameters) {
        const renderer = this.#templates[template];
        if (!renderer) {
            throw new Error(`Unknown template: ${template}`);
        }
        return String(renderer(parameters ?? {}));
    }
}
export function registerStanza(registration) {
    if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") {
        return;
    }
    registerCoordinationElements();
    registerTogoStanzaMenuElement();
    if (customElements.get(registration.tagName)) {
        return;
    }
    const parameterKeys = parameterAttributeKeys(registration.metadata);
    const observedAttributes = ["togostanza-menu-placement", ...parameterKeys];
    class TogoStanzaElement extends HTMLElement {
        static observedAttributes = observedAttributes;
        stanzaInstance;
        #menuElement;
        #hasConnected = false;
        constructor() {
            super();
            const root = this.attachShadow({ mode: "open" });
            root.append(createStyleDefaults(registration.metadata));
            root.append(createStylesheetLink(registration.cssUrl));
            const { container, menu } = createMainContainer();
            this.#menuElement = menu;
            this.#menuElement.href = registration.aboutUrl.href;
            this.#menuElement.scriptUrl = registration.scriptUrl.href;
            root.append(container);
            const context = {
                assetBaseUrl: registration.assetBaseUrl,
                element: this,
                metadata: registration.metadata,
                requestRender: () => this.#renderStanzaWithReport(),
                root,
                templates: registration.templates,
            };
            this.stanzaInstance = createStanzaInstance(registration.StanzaClass, context);
            this.stanzaInstance[initializeRuntime](context);
            this.#menuElement.menuDefinition = this.stanzaInstance.menu.bind(this.stanzaInstance);
            this.#menuElement.stanzaInstance = this.stanzaInstance;
        }
        connectedCallback() {
            this.#hasConnected = true;
            this.#updateMenu();
            this.#scheduleRender();
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) {
                return;
            }
            this.#updateMenu();
            if (this.#hasConnected && parameterKeys.includes(name)) {
                this.stanzaInstance.handleAttributeChange(name, oldValue, newValue);
            }
        }
        #scheduleRender() {
            void this.#renderStanzaWithReport();
        }
        async #renderStanzaWithReport() {
            try {
                await this.#renderStanza();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`togostanza render failed for ${registration.id}: ${message}`);
            }
        }
        async #renderStanza() {
            await this.stanzaInstance.render();
            this.#updateMenu();
        }
        #updateMenu() {
            const placement = resolveMenuPlacement(this, registration.metadata);
            this.#menuElement.dataset.placement = placement;
            this.#menuElement.hidden = placement === "none";
            this.#menuElement.placement = placement;
            this.#menuElement.refresh();
        }
    }
    customElements.define(registration.tagName, TogoStanzaElement);
}
function createStanzaInstance(StanzaClass, context) {
    pendingRuntimeContext = context;
    try {
        return new StanzaClass();
    }
    finally {
        pendingRuntimeContext = undefined;
    }
}
function createMainContainer() {
    const container = document.createElement("div");
    const menu = document.createElement("togostanza--menu");
    container.dataset.togostanzaMainContainer = "";
    container.style.position = "relative";
    menu.dataset.togostanzaMenu = "";
    container.append(document.createElement("main"), menu);
    return { container, menu };
}
function registerCoordinationElements() {
    if (!customElements.get("togostanza--container")) {
        class TogoStanzaContainerElement extends HTMLElement {
            #connected = false;
            connectedCallback() {
                if (this.#connected) {
                    return;
                }
                this.#connected = true;
                this.#connectWhenReady(0);
            }
            #connectWhenReady(attempt) {
                const stanzaElements = this.#stanzaElements();
                const readyStanzaElements = stanzaElements.filter((element) => element.stanzaInstance !== undefined);
                if (readyStanzaElements.length === stanzaElements.length) {
                    this.#connectStanzaHandlers(readyStanzaElements);
                    this.#connectEventMaps(readyStanzaElements);
                    void this.#connectDataSources();
                    return;
                }
                if (attempt >= coordinationReadyMaxAttempts) {
                    const missingElements = stanzaElements
                        .filter((element) => element.stanzaInstance === undefined)
                        .map((element) => element.tagName.toLowerCase());
                    console.warn(`togostanza--container timed out waiting for stanza upgrades: ${missingElements.join(", ")}`);
                    if (readyStanzaElements.length > 0) {
                        this.#connectStanzaHandlers(readyStanzaElements);
                        this.#connectEventMaps(readyStanzaElements);
                        void this.#connectDataSources();
                    }
                    return;
                }
                window.setTimeout(() => this.#connectWhenReady(attempt + 1), 2 ** Math.min(attempt, 11));
            }
            #stanzaElements() {
                return [...this.querySelectorAll("*")].filter((element) => {
                    return (element.tagName.startsWith("TOGOSTANZA-") &&
                        !element.tagName.startsWith("TOGOSTANZA--"));
                });
            }
            #connectStanzaHandlers(stanzaElements) {
                for (const sourceElement of stanzaElements) {
                    const sourceInstance = sourceElement.stanzaInstance;
                    if (!sourceInstance) {
                        continue;
                    }
                    for (const eventName of eventNames(sourceInstance.metadata, "stanza:outgoingEvent")) {
                        sourceElement.addEventListener(eventName, (event) => {
                            for (const receiverElement of stanzaElements) {
                                const receiverInstance = receiverElement.stanzaInstance;
                                if (receiverInstance &&
                                    eventNames(receiverInstance.metadata, "stanza:incomingEvent").includes(eventName)) {
                                    receiverInstance.handleEvent(event);
                                }
                            }
                        });
                    }
                }
            }
            #connectEventMaps(stanzaElements) {
                for (const mapElement of this.querySelectorAll("togostanza--event-map")) {
                    const eventName = mapElement.getAttribute("on");
                    const receiverSelector = mapElement.getAttribute("receiver");
                    const targetAttribute = mapElement.getAttribute("target-attribute");
                    if (!eventName || !receiverSelector || !targetAttribute) {
                        continue;
                    }
                    const receiverElement = this.querySelector(receiverSelector);
                    const receiverInstance = receiverElement?.stanzaInstance;
                    if (!receiverElement || !receiverInstance) {
                        console.warn(`togostanza--event-map receiver not found: ${receiverSelector}`);
                        continue;
                    }
                    if (!eventNames(receiverInstance.metadata, "stanza:incomingEvent").includes(eventName)) {
                        console.warn(`togostanza--event-map receiver does not declare incoming event: ${eventName}`);
                        continue;
                    }
                    if (!parameterAttributeKeys(receiverInstance.metadata).includes(targetAttribute)) {
                        console.warn(`togostanza--event-map target-attribute is not a receiver parameter: ${targetAttribute}`);
                        continue;
                    }
                    for (const sourceElement of stanzaElements) {
                        const sourceInstance = sourceElement.stanzaInstance;
                        if (!sourceInstance ||
                            !eventNames(sourceInstance.metadata, "stanza:outgoingEvent").includes(eventName)) {
                            continue;
                        }
                        sourceElement.addEventListener(eventName, (event) => {
                            const valuePath = mapElement.getAttribute("value-path");
                            const value = event instanceof CustomEvent
                                ? valueAtPath(event.detail, valuePath)
                                : valueAtPath(undefined, valuePath);
                            setMappedAttribute(receiverElement, targetAttribute, value);
                        });
                    }
                }
            }
            async #connectDataSources() {
                const dataSources = [...this.querySelectorAll("togostanza--data-source")];
                await Promise.all(dataSources.map((dataSource) => this.#connectDataSource(dataSource)));
            }
            async #connectDataSource(dataSource) {
                const sourceUrl = dataSource.getAttribute("url");
                const receiverSelector = dataSource.getAttribute("receiver");
                const targetAttribute = dataSource.getAttribute("target-attribute");
                if (!sourceUrl || !receiverSelector || !targetAttribute) {
                    return;
                }
                const receiverElement = this.querySelector(receiverSelector);
                const receiverInstance = receiverElement?.stanzaInstance;
                if (!receiverElement || !receiverInstance) {
                    console.warn(`togostanza--data-source receiver not found: ${receiverSelector}`);
                    return;
                }
                if (!parameterAttributeKeys(receiverInstance.metadata).includes(targetAttribute)) {
                    console.warn(`togostanza--data-source target-attribute is not a receiver parameter: ${targetAttribute}`);
                    return;
                }
                try {
                    const response = await fetch(new URL(sourceUrl, document.baseURI));
                    const blob = await response.blob();
                    receiverElement.setAttribute(targetAttribute, URL.createObjectURL(blob));
                }
                catch (error) {
                    console.error(`togostanza--data-source failed to fetch ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        customElements.define("togostanza--container", TogoStanzaContainerElement);
    }
    if (!customElements.get("togostanza--event-map")) {
        class TogoStanzaEventMapElement extends HTMLElement {
        }
        customElements.define("togostanza--event-map", TogoStanzaEventMapElement);
    }
    if (!customElements.get("togostanza--data-source")) {
        class TogoStanzaDataSourceElement extends HTMLElement {
        }
        customElements.define("togostanza--data-source", TogoStanzaDataSourceElement);
    }
}
function createStyleDefaults(metadata) {
    const style = document.createElement("style");
    const rules = styleDefaultRules(metadata);
    if (rules) {
        style.append(rules);
    }
    return style;
}
function createStylesheetLink(cssUrl) {
    const link = document.createElement("link");
    link.href = cssUrl.href;
    link.rel = "stylesheet";
    return link;
}
function resolveMenuPlacement(element, metadata) {
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
function styleDefaultRules(metadata) {
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
export function createStanzaParams(element, metadata) {
    const params = {};
    for (const parameter of parameterDefinitions(metadata)) {
        if (parameter.type === "boolean") {
            params[parameter.key] = element.hasAttribute(parameter.key);
            continue;
        }
        const attributeValue = element.getAttribute(parameter.key);
        if (attributeValue === null) {
            params[parameter.key] = undefined;
            continue;
        }
        params[parameter.key] = parseParameterValue(attributeValue, parameter.type);
    }
    return params;
}
function parseParameterValue(value, type) {
    switch (type) {
        case "boolean":
            return value !== "";
        case "number":
            return value ? Number(value) : undefined;
        case "json":
            return value ? JSON.parse(value) : undefined;
        case "date":
        case "datetime":
            return value ? new Date(value) : undefined;
        default:
            return value;
    }
}
function resolveStanzaAssetUrl(cssUrl, assetBaseUrl) {
    const baseUrl = assetBaseUrl ?? new URL(".", document.baseURI);
    if (cssUrl.startsWith("./assets/")) {
        return new URL(cssUrl.slice("./assets/".length), baseUrl);
    }
    if (cssUrl.startsWith("assets/")) {
        return new URL(cssUrl.slice("assets/".length), baseUrl);
    }
    return new URL(cssUrl, baseUrl);
}
function parameterAttributeKeys(metadata) {
    return parameterDefinitions(metadata).map((parameter) => parameter.key);
}
function parameterDefinitions(metadata) {
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
function eventNames(metadata, key) {
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
function valueAtPath(value, path) {
    if (!path) {
        return value;
    }
    return path.split(".").reduce((current, segment) => {
        if (!isRecord(current)) {
            return undefined;
        }
        return current[segment];
    }, value);
}
function setMappedAttribute(element, attributeName, value) {
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
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=stanza.js.map