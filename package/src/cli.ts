import { pathToFileURL } from "node:url";
import { formatPackageIdentity } from "./index.js";

export function runCli(
  args = process.argv.slice(2),
  output: (message: string) => void = console.log,
): number {
  if (args.includes("--version") || args.includes("-v")) {
    output(formatPackageIdentity());
    return 0;
  }

  output("togostanza remake CLI scaffold");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
