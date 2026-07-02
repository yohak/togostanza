import { describe, expect, it } from "vitest";
import { createStanzaParams } from "./stanza.js";

describe("createStanzaParams", () => {
  it("maps metadata parameters from element attributes", () => {
    const params = createStanzaParams(attributeSource(makeAttributes()), {
      "stanza:parameter": [
        { "stanza:key": "enabled", "stanza:type": "boolean" },
        { "stanza:key": "count", "stanza:type": "number" },
        { "stanza:key": "payload", "stanza:type": "json" },
        { "stanza:key": "published", "stanza:type": "date" },
        { "stanza:key": "updated", "stanza:type": "datetime" },
        { "stanza:key": "mode", "stanza:type": "single-choice" },
        { "stanza:key": "body", "stanza:type": "text" },
        { "stanza:key": "label", "stanza:type": "string" },
        { "stanza:key": "fallback", "stanza:type": "unknown" },
        { "stanza:key": "missing", "stanza:type": "string" },
      ],
    });

    expect(params).toEqual({
      body: "hello",
      count: 42,
      enabled: true,
      fallback: "fallback value",
      label: "plain label",
      missing: null,
      mode: "compact",
      payload: { ok: true },
      published: new Date("2026-06-30"),
      updated: new Date("2026-06-30T10:20:30.000Z"),
    });
  });

  it("sets absent boolean parameters to false", () => {
    expect(
      createStanzaParams(attributeSource(new Map()), {
        "stanza:parameter": [{ "stanza:key": "enabled", "stanza:type": "boolean" }],
      }),
    ).toEqual({
      enabled: false,
    });
  });

  it("throws invalid JSON parameter values like the current runtime", () => {
    expect(() =>
      createStanzaParams(attributeSource(new Map([["payload", "{not-json}"]])), {
        "stanza:parameter": [{ "stanza:key": "payload", "stanza:type": "json" }],
      }),
    ).toThrow(SyntaxError);
  });
});

function makeAttributes(): Map<string, string> {
  return new Map([
    ["body", "hello"],
    ["count", "42"],
    ["enabled", ""],
    ["fallback", "fallback value"],
    ["label", "plain label"],
    ["mode", "compact"],
    ["payload", '{"ok":true}'],
    ["published", "2026-06-30"],
    ["updated", "2026-06-30T10:20:30.000Z"],
  ]);
}

function attributeSource(attributes: Map<string, string>): {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
} {
  return {
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
  };
}
