export function formatPackageScriptCommand(packageManager, scriptName) {
    return packageManager === "pnpm" ? `pnpm ${scriptName}` : `npm run ${scriptName}`;
}
export function formatPackageExecCommand(packageManager, commandName) {
    return packageManager === "pnpm"
        ? `pnpm exec togostanza ${commandName}`
        : `npm exec togostanza ${commandName}`;
}
export function formatTogoStanzaCommand(input) {
    const scriptName = findTogoStanzaScript(input.commandName, input.scripts);
    if (scriptName) {
        return formatPackageScriptCommand(input.packageManager, scriptName);
    }
    return formatPackageExecCommand(input.packageManager, input.commandName);
}
function findTogoStanzaScript(commandName, scripts) {
    const candidates = commandName === "build"
        ? ["build", "stanza:build"]
        : ["serve", "stanza:serve", "stanza:server"];
    return candidates.find((candidate) => Object.hasOwn(scripts, candidate));
}
//# sourceMappingURL=package-command.js.map