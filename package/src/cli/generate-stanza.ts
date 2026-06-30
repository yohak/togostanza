import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStringOption, parseOptions } from "./options.js";
import { failure, success, type CliResult } from "./result.js";

export type GenerateStanzaOptions = {
  cwd?: string;
  currentDate?: Date;
};

export function handleGenerateStanza(
  args: readonly string[],
  options: GenerateStanzaOptions = {},
): CliResult {
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
  const date = formatDate(options.currentDate ?? new Date());
  const label = getStringOption(parsed, "--label") ?? titleCase(id);
  const definition = getStringOption(parsed, "--definition") ?? `${label} stanza.`;
  const license = getStringOption(parsed, "--license") ?? "MIT";
  const author = getStringOption(parsed, "--author") ?? "";
  const timestamp = getStringOption(parsed, "--timestamp") ?? date;
  const destination = join(cwd, "stanzas", id);

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
  } catch (error) {
    if (isFileExistsError(error)) {
      return failure(`Stanza already exists: ${destination}`);
    }

    throw error;
  }

  return success(`Created stanza: ${id}`);
}

export function normalizeStanzaId(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function createStanzaSource(input: {
  author: string;
  definition: string;
  destination: string;
  id: string;
  label: string;
  license: string;
  timestamp: string;
}): void {
  mkdirSync(join(input.destination, ".."), { recursive: true });
  mkdirSync(input.destination, { recursive: false });
  mkdirSync(join(input.destination, "assets"));
  mkdirSync(join(input.destination, "templates"));

  writeFileSync(
    join(input.destination, "metadata.json"),
    formatJson(createMetadata(input)),
    "utf8",
  );
  writeFileSync(
    join(input.destination, "README.md"),
    `# ${input.label}\n\n${input.definition}\n`,
    "utf8",
  );
  writeFileSync(join(input.destination, "index.js"), formatIndexJs(input), "utf8");
  writeFileSync(
    join(input.destination, "style.scss"),
    ".greeting {\n  color: var(--greeting-color);\n}\n",
    "utf8",
  );
  writeFileSync(join(input.destination, "assets", ".keep"), "", "utf8");
  writeFileSync(
    join(input.destination, "templates", "stanza.html.hbs"),
    '<p class="greeting">{{greeting}}</p>\n',
    "utf8",
  );
}

function createMetadata(input: {
  author: string;
  definition: string;
  id: string;
  label: string;
  license: string;
  timestamp: string;
}): Record<string, unknown> {
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

function formatIndexJs(input: { id: string }): string {
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

function titleCase(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function toClassName(id: string): string {
  const name = titleCase(id).replace(/[^a-zA-Z0-9]/g, "");

  if (/^[A-Z]/.test(name)) {
    return name;
  }

  return `Stanza${name}`;
}

function isValidStanzaId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
