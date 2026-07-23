import { failure } from "./result.js";
export function parseOptions(args, specs) {
    const parsed = {
        options: new Map(),
        positional: [],
    };
    const specsByName = new Map(specs.map((spec) => [spec.name, spec]));
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (!arg) {
            continue;
        }
        if (!arg.startsWith("--")) {
            parsed.positional.push(arg);
            continue;
        }
        const spec = specsByName.get(arg);
        if (!spec) {
            return {
                error: failure(`Unknown option: ${arg}`),
            };
        }
        if (spec.kind === "boolean") {
            parsed.options.set(spec.name, true);
            continue;
        }
        const value = args[index + 1];
        if (!value || value.startsWith("--")) {
            return {
                error: failure(`Missing value for option: ${arg}`),
            };
        }
        parsed.options.set(spec.name, value);
        index += 1;
    }
    return { parsed };
}
export function getStringOption(parsed, name) {
    const value = parsed.options.get(name);
    return typeof value === "string" ? value : undefined;
}
export function getBooleanOption(parsed, name) {
    return parsed.options.get(name) === true;
}
//# sourceMappingURL=options.js.map