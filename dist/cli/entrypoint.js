import { routeCli } from "./router.js";
const consoleOutput = {
    stderr: console.error,
    stdout: console.log,
};
export function runCli(args = process.argv.slice(2), output = consoleOutput, options = {}) {
    return Promise.resolve(routeCli(args, options)).then((result) => {
        if (result.stdout) {
            output.stdout(result.stdout);
        }
        if (result.stderr) {
            output.stderr(result.stderr);
        }
        return result.exitCode;
    });
}
//# sourceMappingURL=entrypoint.js.map