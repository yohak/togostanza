import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStringOption, parseOptions } from "./options.js";
import { formatTogoStanzaCommand } from "./package-command.js";
import { resolveStanzaRepoContext } from "./repo-context.js";
import { failure, success } from "./result.js";
import { isValidStanzaId, normalizeStanzaId, titleCaseStanzaId } from "./stanza-id.js";
export function handleGenerateStanza(args, options = {}) {
    const parsedResult = parseOptions(args, [
        { kind: "value", name: "--label" },
        { kind: "value", name: "--definition" },
        { kind: "value", name: "--license" },
        { kind: "value", name: "--author" },
        { kind: "value", name: "--timestamp" },
    ]);
    if ("error" in parsedResult) {
        return parsedResult.error;
    }
    const { parsed } = parsedResult;
    if (parsed.positional.length === 0) {
        return failure("Missing required argument: id");
    }
    const rawId = parsed.positional[0];
    if (!rawId) {
        return failure("Missing required argument: id");
    }
    if (parsed.positional.length > 1) {
        return failure(`Unexpected argument: ${parsed.positional[1]}`);
    }
    const id = normalizeStanzaId(rawId);
    if (!isValidStanzaId(id)) {
        return failure(`Invalid stanza id: ${rawId}`);
    }
    const cwd = options.cwd ?? process.cwd();
    const repoContextResult = resolveStanzaRepoContext(cwd);
    if ("error" in repoContextResult) {
        return failure(repoContextResult.error);
    }
    const date = formatDate(options.currentDate ?? new Date());
    const label = getStringOption(parsed, "--label") ?? titleCaseStanzaId(id);
    const definition = getStringOption(parsed, "--definition") ?? `${label} stanza.`;
    const license = getStringOption(parsed, "--license") ?? "MIT";
    const author = getStringOption(parsed, "--author") ?? "";
    const timestamp = getStringOption(parsed, "--timestamp") ?? date;
    const destination = join(repoContextResult.context.rootDirectory, "stanzas", id);
    try {
        createStanzaSource({
            author,
            definition,
            destination,
            id,
            label,
            license,
            timestamp,
        });
    }
    catch (error) {
        if (isFileExistsError(error)) {
            return failure(`Stanza already exists: ${destination}`);
        }
        throw error;
    }
    return success([
        `Created stanza: ${id}`,
        "",
        "Next steps:",
        `  ${formatTogoStanzaCommand({
            commandName: "build",
            packageManager: repoContextResult.context.packageManager,
            scripts: repoContextResult.context.scripts,
        })}`,
        `  ${formatTogoStanzaCommand({
            commandName: "serve",
            packageManager: repoContextResult.context.packageManager,
            scripts: repoContextResult.context.scripts,
        })}`,
    ].join("\n"));
}
function createStanzaSource(input) {
    mkdirSync(join(input.destination, ".."), { recursive: true });
    mkdirSync(input.destination, { recursive: false });
    mkdirSync(join(input.destination, "assets"));
    mkdirSync(join(input.destination, "templates"));
    writeFileSync(join(input.destination, "metadata.json"), formatJson(createMetadata(input)), "utf8");
    writeFileSync(join(input.destination, "README.md"), `# ${input.label}\n\n${input.definition}\n`, "utf8");
    writeFileSync(join(input.destination, "index.js"), formatIndexJs(input), "utf8");
    writeFileSync(join(input.destination, "style.scss"), ".greeting {\n  color: var(--greeting-color);\n}\n", "utf8");
    writeFileSync(join(input.destination, "assets", ".keep"), "", "utf8");
    writeFileSync(join(input.destination, "templates", "stanza.html.hbs"), '<p class="greeting">{{greeting}}</p>\n', "utf8");
}
function createMetadata(input) {
    return {
        "@context": {
            stanza: "http://togostanza.org/resource/stanza#",
        },
        "@id": input.id,
        "stanza:label": input.label,
        "stanza:definition": input.definition,
        "stanza:license": input.license,
        "stanza:author": input.author,
        "stanza:contributor": [],
        "stanza:created": input.timestamp,
        "stanza:updated": input.timestamp,
        "stanza:parameter": [
            {
                "stanza:key": "say-to",
                "stanza:type": "string",
                "stanza:example": "world",
                "stanza:description": "who to say hello to",
                "stanza:required": false,
            },
        ],
        "stanza:menu-placement": "bottom-right",
        "stanza:style": [
            {
                "stanza:key": "--greeting-color",
                "stanza:type": "color",
                "stanza:default": "#eb7900",
                "stanza:description": "text color of greeting",
            },
        ],
        "stanza:incomingEvent": [],
        "stanza:outgoingEvent": [],
    };
}
function formatIndexJs(input) {
    const className = toClassName(input.id);
    return [
        'import Stanza from "togostanza/stanza";',
        "",
        `export default class ${className} extends Stanza {`,
        "  async render() {",
        "    this.renderTemplate({",
        '      template: "stanza.html.hbs",',
        "      parameters: {",
        '        greeting: `Hello, ${this.params["say-to"]}!`,',
        "      },",
        "    });",
        "  }",
        "}",
        "",
    ].join("\n");
}
function toClassName(id) {
    const name = titleCaseStanzaId(id).replace(/[^a-zA-Z0-9]/g, "");
    if (/^[A-Z]/.test(name)) {
        return name;
    }
    return `Stanza${name}`;
}
function formatDate(date) {
    return date.toISOString().slice(0, 10);
}
function formatJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function isFileExistsError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
//# sourceMappingURL=generate-stanza.js.map