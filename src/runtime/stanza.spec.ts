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
      missing: undefined,
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

  it.each(["string", "text", "single-choice", "unknown", "number", "json", "date", "datetime"])(
    "retains an own key with undefined for a missing %s parameter",
    (type) => {
      const params = createStanzaParams(attributeSource(new Map([["undeclared", "ignored"]])), {
        "stanza:parameter": [{ "stanza:key": "value", "stanza:type": type }],
      });
      expect(Object.keys(params)).toEqual(["value"]);
      expect(params.value).toBeUndefined();
      const { value = "default" } = params;
      expect(value).toBe("default");
    },
  );

  it.each(["number", "json", "date", "datetime"])("maps empty %s to undefined", (type) => {
    expect(
      createStanzaParams(attributeSource(new Map([["value", ""]])), {
        "stanza:parameter": [{ "stanza:key": "value", "stanza:type": type }],
      }),
    ).toEqual({ value: undefined });
  });

  it.each(["string", "text", "single-choice", "unknown"])("preserves empty %s", (type) => {
    expect(
      createStanzaParams(attributeSource(new Map([["value", ""]])), {
        "stanza:parameter": [{ "stanza:key": "value", "stanza:type": type }],
      }),
    ).toEqual({ value: "" });
  });

  it("does not normalize whitespace or nonempty invalid input", () => {
    const read = (type: string, value: string) =>
      createStanzaParams(attributeSource(new Map([["value", value]])), {
        "stanza:parameter": [{ "stanza:key": "value", "stanza:type": type }],
      }).value;
    expect(read("number", " ")).toBe(0);
    expect(read("string", " ")).toBe(" ");
    expect(read("number", "invalid")).toBeNaN();
    for (const type of ["date", "datetime"]) {
      expect((read(type, "invalid") as Date).getTime()).toBeNaN();
      expect((read(type, " ") as Date).getTime()).toBeNaN();
    }
    expect(() => read("json", " ")).toThrow(SyntaxError);
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
