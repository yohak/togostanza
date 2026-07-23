import { formatPackageIdentity } from "../index.js";
import { handleBuild } from "./build.js";
import { findCommand, listCommandUsages } from "./commands.js";
import { handleGenerateStanza } from "./generate-stanza.js";
import { handleInit } from "./init.js";
import { failure, success } from "./result.js";
import { handleServe } from "./serve.js";
export function routeCli(args, options = {}) {
    const [firstArg] = args;
    if (!firstArg || firstArg === "--help") {
        return success(formatHelpText());
    }
    if (firstArg === "--version" || firstArg === "-v") {
        return success(formatPackageIdentity());
    }
    if (firstArg.startsWith("-")) {
        return failure(`Unknown option: ${firstArg}`);
    }
    const match = findCommand(args);
    if (!match) {
        return failure(`Unknown command: ${args.join(" ")}`);
    }
    const commandArgs = args.slice(match.matchedLength);
    return routeCommand(match.command, commandArgs, options);
}
function routeCommand(command, args, options) {
    if (command.canonicalName === "init") {
        return handleInit(args, options);
    }
    if (command.canonicalName === "generate stanza") {
        return handleGenerateStanza(args, options);
    }
    if (command.canonicalName === "build") {
        return handleBuild(args, options);
    }
    if (command.canonicalName === "serve") {
        return handleServe(args, withServeOptions(options));
    }
    return failure(`Command is not implemented yet: ${command.canonicalName}`);
}
function withServeOptions(options) {
    return {
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(options.onServeSession ? { onServeSession: options.onServeSession } : {}),
        ...(typeof options.serveWatch === "boolean" ? { watch: options.serveWatch } : {}),
    };
}
function formatHelpText() {
    const commandLines = listCommandUsages().map((usage) => `  ${usage}`);
    return [
        "Usage: togostanza [command]",
        "",
        "Commands:",
        ...commandLines,
        "",
        "Global options:",
        "  --help",
        "  --version",
        "  -v",
    ].join("\n");
}
//# sourceMappingURL=router.js.map