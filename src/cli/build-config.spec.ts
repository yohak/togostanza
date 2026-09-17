import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadTogoStanzaBuildConfig } from "./build-config.js";

const roots: string[] = [];
function root(): string {
  const directory = mkdtempSync(join(tmpdir(), "togostanza-config-"));
  roots.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of roots.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("build config discovery", () => {
  it("uses defaults without config or tsconfig", async () => {
    expect(await loadTogoStanzaBuildConfig(root())).toEqual({ config: {}, warnings: [] });
  });

  it.each([
    ["js", "mjs"],
    ["js", "ts"],
    ["mjs", "ts"],
    ["js", "mjs", "ts"],
  ])("rejects multiple configs before executing any (%j)", async (...extensions) => {
    const directory = root();
    const marker = join(directory, "executed");
    for (const extension of extensions) {
      writeFileSync(
        join(directory, `togostanza.config.${extension}`),
        `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "yes"); export default {};`,
      );
    }
    const result = await loadTogoStanzaBuildConfig(directory);
    expect(result).toHaveProperty("error", expect.stringContaining("multiple config files"));
    for (const extension of extensions)
      expect((result as { error: string }).error).toContain(`togostanza.config.${extension}`);
    expect(existsSync(marker)).toBe(false);
  });

  it.each(["js", "mjs", "ts"])(
    "reports syntax errors in .%s without falling back to defaults",
    async (extension) => {
      const directory = root();
      const configPath = join(directory, `togostanza.config.${extension}`);
      writeFileSync(configPath, "export default { invalid: ;");
      expect(await loadTogoStanzaBuildConfig(directory)).toHaveProperty(
        "error",
        expect.stringContaining(configPath),
      );
    },
  );

  it.each([undefined, "module"])(
    "loads JS config with package type %s and fresh local imports",
    async (type) => {
      const directory = root();
      writeFileSync(join(directory, "package.json"), JSON.stringify({ type }));
      writeFileSync(join(directory, "helper.js"), 'export const value = "first";');
      writeFileSync(
        join(directory, "togostanza.config.js"),
        'import { value } from "./helper.js"; export default { vite: { define: { VALUE: value, ROOT: import.meta.dirname } } };',
      );
      expect(await loadTogoStanzaBuildConfig(directory)).toMatchObject({
        config: { vite: { define: { VALUE: "first", ROOT: realpathSync(directory) } } },
      });
      writeFileSync(join(directory, "helper.js"), 'export const value = "second";');
      expect(await loadTogoStanzaBuildConfig(directory)).toMatchObject({
        config: { vite: { define: { VALUE: "second" } } },
      });
    },
  );
});
