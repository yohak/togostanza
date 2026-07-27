const menuElementName = "togostanza--menu";
const svgNamespace = "http://www.w3.org/2000/svg";
// Primer Octicons info-16 icon, MIT License.
// Copyright (c) 2023 GitHub Inc.
// Source: https://github.com/primer/octicons
const infoIconPath = "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z";
export function registerTogoStanzaMenuElement() {
    if (typeof customElements === "undefined" ||
        typeof HTMLElement === "undefined" ||
        customElements.get(menuElementName)) {
        return;
    }
    class TogoStanzaMenuElementImplementation extends HTMLElement {
        static observedAttributes = ["href", "placement"];
        menuDefinition = () => [];
        scriptUrl = "";
        stanzaInstance;
        #button;
        #popup;
        constructor() {
            super();
            const root = this.attachShadow({ mode: "open" });
            this.#button = createMenuButton();
            this.#popup = document.createElement("ul");
            this.#popup.dataset.togostanzaMenuPopup = "";
            this.#popup.hidden = true;
            this.#popup.setAttribute("role", "menu");
            this.#button.addEventListener("click", () => {
                this.#setOpen(Boolean(this.#popup.hidden));
            });
            root.append(createMenuStyles(), this.#button, this.#popup);
        }
        get href() {
            return this.getAttribute("href") ?? "";
        }
        set href(value) {
            this.setAttribute("href", value);
        }
        get placement() {
            return this.getAttribute("placement") ?? "bottom-right";
        }
        set placement(value) {
            this.setAttribute("placement", value);
        }
        connectedCallback() {
            document.addEventListener("click", this.#handleDocumentClick);
            document.addEventListener("keydown", this.#handleDocumentKeydown);
            this.refresh();
        }
        disconnectedCallback() {
            document.removeEventListener("click", this.#handleDocumentClick);
            document.removeEventListener("keydown", this.#handleDocumentKeydown);
        }
        attributeChangedCallback(name) {
            if (name === "placement" && this.placement === "none") {
                this.#setOpen(false);
            }
            if (name === "href") {
                this.refresh();
            }
        }
        refresh() {
            const entries = this.menuDefinition();
            const children = entries.map((entry) => this.#createEntry(entry));
            if (entries.length > 0) {
                children.push(createDivider());
            }
            children.push(this.#createAction("Copy HTML snippet to clipboard", () => {
                void this.#copyHTMLSnippetToClipboard();
            }, "copy"), this.#createAboutLink());
            this.#popup.replaceChildren(...children);
        }
        #handleDocumentClick = (event) => {
            if (!this.#popup.hidden && !event.composedPath().includes(this)) {
                this.#setOpen(false);
            }
        };
        #handleDocumentKeydown = (event) => {
            if (event.key === "Escape" && !this.#popup.hidden) {
                this.#setOpen(false);
                this.#button.focus();
            }
        };
        #setOpen(open) {
            if (open) {
                this.refresh();
            }
            this.#popup.hidden = !open;
            this.#button.setAttribute("aria-expanded", String(open));
            this.toggleAttribute("data-open", open);
        }
        #createEntry(entry) {
            if (entry.type === "divider") {
                return createDivider();
            }
            return this.#createAction(entry.label, () => {
                this.#setOpen(false);
                entry.handler?.();
            });
        }
        #createAction(label, handler, action) {
            const listItem = document.createElement("li");
            const button = document.createElement("button");
            if (action) {
                button.dataset.togostanzaMenuAction = action;
            }
            else {
                button.dataset.togostanzaMenuItem = "";
            }
            button.setAttribute("role", "menuitem");
            button.textContent = label;
            button.type = "button";
            button.addEventListener("click", handler);
            listItem.append(button);
            return listItem;
        }
        #createAboutLink() {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.dataset.togostanzaMenuAction = "about";
            link.href = this.href;
            link.rel = "noopener noreferrer";
            link.setAttribute("role", "menuitem");
            link.target = "_blank";
            link.textContent = "About this stanza";
            link.addEventListener("click", () => this.#setOpen(false));
            listItem.append(link);
            return listItem;
        }
        async #copyHTMLSnippetToClipboard() {
            try {
                if (!this.scriptUrl || !this.stanzaInstance?.element) {
                    throw new Error("menu runtime context is incomplete");
                }
                if (!navigator.clipboard?.writeText) {
                    throw new Error("Clipboard API is unavailable");
                }
                const script = document.createElement("script");
                script.async = true;
                script.src = this.scriptUrl;
                script.type = "module";
                const html = [script.outerHTML, this.stanzaInstance.element.outerHTML].join(" ");
                await navigator.clipboard.writeText(html);
            }
            catch (error) {
                console.warn(`togostanza menu could not copy HTML snippet: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                this.#setOpen(false);
            }
        }
    }
    customElements.define(menuElementName, TogoStanzaMenuElementImplementation);
}
function createMenuButton() {
    const button = document.createElement("button");
    const icon = document.createElementNS(svgNamespace, "svg");
    const path = document.createElementNS(svgNamespace, "path");
    button.dataset.togostanzaMenuButton = "";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-label", "Open stanza menu");
    button.title = "Stanza information";
    button.type = "button";
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("height", "16");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.setAttribute("width", "16");
    path.setAttribute("d", infoIconPath);
    icon.append(path);
    button.append(icon);
    return button;
}
function createDivider() {
    const divider = document.createElement("li");
    divider.dataset.togostanzaMenuDivider = "";
    divider.setAttribute("role", "separator");
    return divider;
}
function createMenuStyles() {
    const style = document.createElement("style");
    style.textContent = `
    :host {
      position: absolute;
      display: block;
      box-sizing: border-box;
      width: 24px;
      height: 24px;
      color: #24292f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      z-index: 1;
    }

    :host([data-open]) {
      width: min(14rem, 100%);
    }

    :host([hidden]),
    :host([placement="none"]) {
      display: none;
    }

    :host([placement="top-left"]) {
      top: 0;
      right: auto;
      bottom: auto;
      left: 0;
    }

    :host([placement="top-right"]) {
      top: 0;
      right: 0;
      bottom: auto;
      left: auto;
    }

    :host([placement="bottom-left"]) {
      top: auto;
      right: auto;
      bottom: 0;
      left: 0;
    }

    :host,
    :host([placement="bottom-right"]) {
      top: auto;
      right: 0;
      bottom: 0;
      left: auto;
    }

    button,
    a {
      font: inherit;
    }

    [data-togostanza-menu-button] {
      display: block;
      box-sizing: border-box;
      position: absolute;
      width: 24px;
      height: 24px;
      padding: 4px;
      color: inherit;
      background: rgba(255, 255, 255, 0.8);
      border: 0;
      border-radius: 12px;
      cursor: pointer;
    }

    :host([placement="top-left"]) [data-togostanza-menu-button] {
      top: 0;
      left: 0;
    }

    :host([placement="top-right"]) [data-togostanza-menu-button] {
      top: 0;
      right: 0;
    }

    :host([placement="bottom-left"]) [data-togostanza-menu-button] {
      bottom: 0;
      left: 0;
    }

    :host [data-togostanza-menu-button],
    :host([placement="bottom-right"]) [data-togostanza-menu-button] {
      right: 0;
      bottom: 0;
    }

    [data-togostanza-menu-button] svg {
      display: block;
      transform: translateY(0.5px);
    }

    [data-togostanza-menu-button]:focus-visible {
      outline: 2px solid #0969da;
      outline-offset: 2px;
    }

    [data-togostanza-menu-popup] {
      position: absolute;
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      padding: 0.5rem 0;
      color: #212529;
      background: #fff;
      background-clip: padding-box;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0.25rem;
      box-shadow: none;
      font-size: 12px;
      font-weight: 400;
      list-style: none;
    }

    [data-togostanza-menu-popup][hidden] {
      display: none;
    }

    :host([placement="top-left"]) [data-togostanza-menu-popup] {
      top: 100%;
      left: 0;
    }

    :host([placement="top-right"]) [data-togostanza-menu-popup] {
      top: 100%;
      right: 0;
    }

    :host([placement="bottom-left"]) [data-togostanza-menu-popup] {
      bottom: 100%;
      left: 0;
    }

    :host [data-togostanza-menu-popup],
    :host([placement="bottom-right"]) [data-togostanza-menu-popup] {
      right: 0;
      bottom: 100%;
    }

    [data-togostanza-menu-item],
    [data-togostanza-menu-action] {
      display: block;
      box-sizing: border-box;
      width: 100%;
      padding: 0.25rem 1rem;
      color: inherit;
      text-align: left;
      text-decoration: none;
      white-space: nowrap;
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    [data-togostanza-menu-item]:hover,
    [data-togostanza-menu-item]:focus-visible,
    [data-togostanza-menu-action]:hover,
    [data-togostanza-menu-action]:focus-visible {
      background: #f0f2f4;
      outline: none;
    }

    [data-togostanza-menu-divider] {
      height: 1px;
      margin: 0.3rem 0;
      background: #d8dee4;
    }
  `;
    return style;
}
//# sourceMappingURL=menu.js.map