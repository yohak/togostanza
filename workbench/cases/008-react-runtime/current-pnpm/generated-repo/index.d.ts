declare module 'togostanza/stanza' {
  export default class Stanza {
    element: HTMLElement;
    params: Record<string, unknown>;
    root: ShadowRoot;
    handleAttributeChange(name: string, oldValue: string | null, newValue: string | null): void;
    importWebFontCSS(url: string): void;
  }
}

