import type { PackageManager } from "./package-manager.js";

export type PackageScripts = Readonly<Record<string, string>>;

export function formatPackageScriptCommand(
  packageManager: PackageManager,
  scriptName: string,
): string {
  return packageManager === "pnpm" ? `pnpm ${scriptName}` : `npm run ${scriptName}`;
}

export function formatPackageExecCommand(
  packageManager: PackageManager,
  commandName: string,
): string {
  return packageManager === "pnpm"
    ? `pnpm exec togostanza ${commandName}`
    : `npm exec togostanza ${commandName}`;
}

export function formatTogoStanzaCommand(input: {
  commandName: "build" | "serve";
  packageManager: PackageManager;
  scripts: PackageScripts;
}): string {
  const scriptName = findTogoStanzaScript(input.commandName, input.scripts);

  if (scriptName) {
    return formatPackageScriptCommand(input.packageManager, scriptName);
  }

  return formatPackageExecCommand(input.packageManager, input.commandName);
}

function findTogoStanzaScript(
  commandName: "build" | "serve",
  scripts: PackageScripts,
): string | undefined {
  const candidates =
    commandName === "build"
      ? ["build", "stanza:build"]
      : ["serve", "stanza:serve", "stanza:server"];

  return candidates.find((candidate) => Object.hasOwn(scripts, candidate));
}
