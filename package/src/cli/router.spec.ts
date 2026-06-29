import { describe, expect, it } from "vitest";
import { routeCli } from "./router.js";

describe("CLI router", () => {
  const recognizedCommandExamples: readonly (readonly string[])[] = [
    ["init"],
    ["init", "--bad"],
    ["generate", "stanza"],
    ["g", "stanza"],
    ["build"],
    ["b"],
    ["serve"],
    ["s"],
  ];

  it("prints version to stdout", () => {
    expect(routeCli(["--version"])).toEqual({
      exitCode: 0,
      stdout: "togostanza@0.0.0",
    });
  });

  it("treats -v as a version alias", () => {
    expect(routeCli(["-v"])).toEqual({
      exitCode: 0,
      stdout: "togostanza@0.0.0",
    });
  });

  it("prints help to stdout", () => {
    const result = routeCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBeUndefined();
    expect(result.stdout).toContain("Usage: togostanza [command]");
  });

  for (const args of recognizedCommandExamples) {
    it(`recognizes ${args.join(" ")} as an unimplemented command`, () => {
      const result = routeCli(args);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBeUndefined();
      expect(result.stderr).toContain("Command is not implemented yet:");
    });
  }

  it("rejects an unknown global option before command routing", () => {
    expect(routeCli(["--bad"])).toEqual({
      exitCode: 1,
      stderr: "Unknown option: --bad",
    });
  });

  it("rejects an unknown command", () => {
    expect(routeCli(["upgrade"])).toEqual({
      exitCode: 1,
      stderr: "Unknown command: upgrade",
    });
  });
});
