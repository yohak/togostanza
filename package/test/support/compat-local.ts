import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export const expectedMetastanzaStanzas = [
  "barchart",
  "hash-table",
  "linechart",
  "pagination-table",
  "piechart",
  "scatterplot",
  "scorecard",
  "scroll-table",
  "text",
  "tree",
];

export const expectedTogoMediumStanzas = [
  "gmdb-component-detail",
  "gmdb-find-media-by-components",
  "gmdb-find-media-by-organism-phenotype",
  "gmdb-find-media-by-taxonomic-tree",
  "gmdb-gms-by-tid",
  "gmdb-media-alignment-table-by-components",
  "gmdb-media-alignment-table-by-strains",
  "gmdb-medium-builder",
  "gmdb-medium-detail",
  "gmdb-meta-list",
  "gmdb-roundtree",
  "gmdb-similar-media-node",
  "gmdb-stats-culturable-species",
  "gmdb-strain-detail",
  "gmdb-taxon-detail",
];

type CompatibilityProject = "metastanza" | "togomedium";

type ReferenceRequirement = {
  path: string;
  reason: string;
};

type StanzaListMismatch = {
  actual: string[];
  expected: string[];
  name: string;
  path: string;
};

export function compatFixturePath(
  project: CompatibilityProject,
  stanzaId: string,
  ...segments: string[]
): string {
  return ["fixtures", project, stanzaId, ...segments].join("/");
}

export function assertCompatLocalReferencesReady(repositoryRoot: string): void {
  const missing = listMissingCompatLocalReferenceRequirements(repositoryRoot);

  if (missing.length > 0) {
    throw new Error(
      [
        "Missing local compatibility reference inputs:",
        ...missing.map((requirement) => `- ${requirement.path} (${requirement.reason})`),
        "Prepare references/ before running test:compat:local.",
      ].join("\n"),
    );
  }
}

export function assertExpectedCompatLocalStanzaDirectories(repositoryRoot: string): void {
  const mismatches = listCompatLocalStanzaDirectoryMismatches(repositoryRoot);

  if (mismatches.length > 0) {
    throw new Error(
      [
        "Local compatibility Stanza list does not match the Phase 11 baseline:",
        ...mismatches.map(
          (mismatch) =>
            `- ${mismatch.name} at ${mismatch.path}: expected ${formatList(mismatch.expected)}, found ${formatList(mismatch.actual)}`,
        ),
      ].join("\n"),
    );
  }
}

export function listStanzaDirectories(stanzasDirectory: string): string[] {
  return readdirSync(stanzasDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
}

function listMissingCompatLocalReferenceRequirements(
  repositoryRoot: string,
): ReferenceRequirement[] {
  return listCompatLocalReferenceRequirements(repositoryRoot).flatMap((requirement) =>
    existsSync(requirement.path)
      ? []
      : [
          {
            path: relative(repositoryRoot, requirement.path),
            reason: requirement.reason,
          },
        ],
  );
}

function listCompatLocalReferenceRequirements(repositoryRoot: string): ReferenceRequirement[] {
  const metastanzaRoot = join(repositoryRoot, "references", "metastanza");
  const togoMediumRoot = join(repositoryRoot, "references", "togomedium-web");
  const togoMediumStanzaRoot = join(togoMediumRoot, "@packages", "stanza");
  const utilsRoot = join(repositoryRoot, "references", "togostanza-utils");

  return [
    { path: join(metastanzaRoot, "package.json"), reason: "metastanza package metadata" },
    { path: join(metastanzaRoot, "stanzas"), reason: "metastanza Stanza sources" },
    { path: join(metastanzaRoot, "common.scss"), reason: "metastanza shared stylesheet" },
    { path: join(metastanzaRoot, "node_modules"), reason: "metastanza local dependencies" },
    {
      path: join(togoMediumStanzaRoot, "package.json"),
      reason: "TogoMedium Stanza package metadata",
    },
    {
      path: join(togoMediumStanzaRoot, "stanzas"),
      reason: "TogoMedium Stanza sources",
    },
    {
      path: join(togoMediumStanzaRoot, "components"),
      reason: "TogoMedium shared React components",
    },
    {
      path: join(togoMediumStanzaRoot, "styles"),
      reason: "TogoMedium shared styles",
    },
    {
      path: join(togoMediumStanzaRoot, "utils"),
      reason: "TogoMedium shared utilities",
    },
    {
      path: join(togoMediumStanzaRoot, "tsconfig.json"),
      reason: "TogoMedium Stanza TypeScript configuration",
    },
    {
      path: join(togoMediumRoot, "node_modules"),
      reason: "TogoMedium local dependencies",
    },
    {
      path: join(utilsRoot, "package.json"),
      reason: "togostanza-utils package metadata",
    },
  ];
}

function listCompatLocalStanzaDirectoryMismatches(repositoryRoot: string): StanzaListMismatch[] {
  const metastanzaStanzasPath = join(repositoryRoot, "references", "metastanza", "stanzas");
  const togoMediumStanzasPath = join(
    repositoryRoot,
    "references",
    "togomedium-web",
    "@packages",
    "stanza",
    "stanzas",
  );
  const checks = [
    {
      actual: listStanzaDirectories(metastanzaStanzasPath),
      expected: expectedMetastanzaStanzas,
      name: "metastanza",
      path: relative(repositoryRoot, metastanzaStanzasPath),
    },
    {
      actual: listStanzaDirectories(togoMediumStanzasPath),
      expected: expectedTogoMediumStanzas,
      name: "TogoMedium Stanza",
      path: relative(repositoryRoot, togoMediumStanzasPath),
    },
  ];

  return checks.flatMap((check) => (listsAreEqual(check.actual, check.expected) ? [] : [check]));
}

function listsAreEqual(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function formatList(values: readonly string[]): string {
  return `[${values.join(", ")}]`;
}
