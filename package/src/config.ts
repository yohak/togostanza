import type { InlineConfig } from "vite";

export type TogoStanzaConfig = {
  vite?: InlineConfig;
};

export function defineTogoStanzaConfig(config: TogoStanzaConfig): TogoStanzaConfig {
  return config;
}
