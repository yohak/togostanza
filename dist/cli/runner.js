import { spawnSync } from "node:child_process";
export const runCommand = (command, args, options) => {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        encoding: "utf8",
        stdio: ["ignore", "ignore", "pipe"],
    });
    if (result.error) {
        return {
            exitCode: 1,
            stderr: result.error.message,
        };
    }
    const exitCode = result.status ?? 1;
    if (result.stderr) {
        return {
            exitCode,
            stderr: result.stderr,
        };
    }
    return {
        exitCode,
    };
};
//# sourceMappingURL=runner.js.map