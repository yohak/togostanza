import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineTogoStanzaConfig } from "togostanza/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const packageNodeModules = resolve(root, "../../../../../package/node_modules");

export default defineTogoStanzaConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^d3$/,
          replacement: resolve(packageNodeModules, "d3/src/index.js"),
        },
        {
          find: /^date-fns$/,
          replacement: resolve(packageNodeModules, "date-fns/esm/index.js"),
        },
        {
          find: /^csv-stringify\/browser\/esm\/sync$/,
          replacement: resolve(packageNodeModules, "csv-stringify/dist/esm/sync.js"),
        },
      ],
    },
  },
});
