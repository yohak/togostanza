import { type MenuEntry } from "./menu.js";
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
    scriptUrl: URL;
    StanzaClass: StanzaConstructor;
    tagName: string;
    templates: Record<string, TemplateRenderer>;
};
declare const initializeRuntime: unique symbol;
export default class Stanza {
    #private;
    element: HTMLElement;
    metadata: Record<string, unknown>;
    params: Record<string, unknown>;
    root: ShadowRoot;
    constructor();
    [initializeRuntime](context: StanzaRuntimeContext): void;
    render(): unknown;
    handleAttributeChange(_name: string, _oldValue: string | null, _newValue: string | null): void;
    handleEvent(_event: Event): void;
    importWebFontCSS(cssUrl: string): void;
    menu(): MenuEntry[];
    query(input: QueryInput): Promise<unknown>;
    renderTemplate(input: RenderTemplateInput): void;
    protected renderTemplateString(template: string, parameters?: Record<string, unknown>): string;
}
export declare function registerStanza(registration: StanzaRegistration): void;
export declare function createStanzaParams(element: AttributeSource, metadata: Record<string, unknown>): Record<string, unknown>;
export {};
//# sourceMappingURL=stanza.d.ts.map