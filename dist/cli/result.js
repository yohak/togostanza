export function success(stdout) {
    return {
        exitCode: 0,
        stdout,
    };
}
export function failure(stderr) {
    return {
        exitCode: 1,
        stderr,
    };
}
//# sourceMappingURL=result.js.map