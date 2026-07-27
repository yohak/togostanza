export type MenuDivider = {
    type: "divider";
};
export type MenuItem = {
    handler?: () => void;
    label: string;
    type: "item";
};
export type MenuEntry = MenuDivider | MenuItem;
type MenuStanzaInstance = {
    element: HTMLElement;
};
export type TogoStanzaMenuElement = HTMLElement & {
    href: string;
    menuDefinition: () => MenuEntry[];
    placement: string;
    refresh: () => void;
    scriptUrl: string;
    stanzaInstance?: MenuStanzaInstance;
};
export declare function registerTogoStanzaMenuElement(): void;
export {};
//# sourceMappingURL=menu.d.ts.map