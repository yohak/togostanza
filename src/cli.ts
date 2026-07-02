import { pathToFileURL } from "node:url";
import { runCli } from "./cli/entrypoint.js";

export { runCli } from "./cli/entrypoint.js";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
