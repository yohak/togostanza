import { describe, expect, it } from "vitest";
import { defineTogoStanzaConfig } from "./config.js";

describe("TogoStanza config helper", () => {
  it("returns the config object unchanged", () => {
    const config = {
      vite: {
        define: {
          __TOGOSTANZA_CONFIG_PROBE__: JSON.stringify("ok"),
        },
      },
    };

    expect(defineTogoStanzaConfig(config)).toBe(config);
  });
});
