import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import prettier from "prettier";

import { reflector } from "../src/generate-doc.js";
import { readFixture, snapshotTree, useTempProject } from "./helpers/temp-project.js";

// Wraps renameSync so a test can make the swap fail midway; passthrough otherwise.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});

// prettier's default export is frozen; wrap format so a test can fail one file.
vi.mock("prettier", async (importOriginal) => {
  const actual = (await importOriginal<{ default: typeof import("prettier") }>()).default;
  return { default: { ...actual, format: vi.fn(actual.format) } };
});

const OUT = "src/reflector";
let project: ReturnType<typeof useTempProject>;
let realRename: typeof fs.renameSync;
let realFormat: typeof prettier.format;

beforeEach(async () => {
  realRename = (await vi.importActual<typeof import("node:fs")>("node:fs")).renameSync;
  realFormat = (await vi.importActual<{ default: typeof import("prettier") }>("prettier")).default.format;
  vi.mocked(fs.renameSync).mockImplementation(realRename);
  vi.mocked(prettier.format).mockImplementation(realFormat);
  project = useTempProject();
  project.write("contract/openapi.json", readFixture("minimal"));
  project.write("reflector.json", JSON.stringify({ source: { file: "contract/openapi.json" } }));
});

afterEach(() => {
  project.restore();
});

/** First run populates the output; the next one uses a different contract so a leaked write would show. */
async function seedPreviousOutput() {
  await reflector(true);
  project.write(`${OUT}/backup.json`, '{"legacy":true}');
  const before = snapshotTree(project.file(OUT));
  expect(Object.keys(before).some((f) => f.startsWith("controllers/"))).toBe(true);
  project.write("contract/openapi.json", readFixture("nested-objects"));
  return before;
}

const leftovers = () => fs.readdirSync(project.file(OUT)).filter((name) => name.startsWith(".reflector-"));

describe("atomic build", () => {
  it("a prettier failure midway keeps the previous output intact", async () => {
    const before = await seedPreviousOutput();
    const formatted: string[] = [];
    vi.mocked(prettier.format).mockImplementation(async (source, options) => {
      const file = String(options?.filepath);
      if (file.endsWith("enums.ts")) throw new Error("prettier boom");
      formatted.push(file);
      return realFormat(source, options);
    });

    await expect(reflector(true)).rejects.toThrow("prettier boom");

    expect(formatted.length).toBeGreaterThan(0);
    expect(snapshotTree(project.file(OUT))).toEqual(before);
    expect(leftovers()).toEqual([]);
  });

  it("a filesystem failure during the swap rolls back to the previous output", async () => {
    const before = await seedPreviousOutput();
    let installs = 0;
    vi.mocked(fs.renameSync).mockImplementation((from, to) => {
      if (String(from).includes(".reflector-staging-") && ++installs === 3) throw new Error("EBUSY simulated");
      return realRename(from, to);
    });

    await expect(reflector(true)).rejects.toThrow("EBUSY simulated");

    expect(installs).toBe(3);
    expect(snapshotTree(project.file(OUT))).toEqual(before);
    expect(leftovers()).toEqual([]);
  });

  it("a failed rollback keeps the previous output on disk and says where", async () => {
    await seedPreviousOutput();
    let installs = 0;
    vi.mocked(fs.renameSync).mockImplementation((from, to) => {
      if (String(from).includes(".reflector-staging-") && ++installs === 3) throw new Error("EBUSY simulated");
      if (String(from).includes(".reflector-previous-")) throw new Error("EPERM on restore");
      return realRename(from, to);
    });

    await expect(reflector(true)).rejects.toThrow(/rollback também falhou.*preservada em .*\.reflector-previous-/);

    const kept = leftovers();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatch(/^\.reflector-previous-/);
    expect(fs.readdirSync(project.file(`${OUT}/${kept[0]}`)).length).toBeGreaterThan(0);
  });

  it("a successful run drops stale controllers and keeps unrelated siblings", async () => {
    await reflector(true);
    project.write(`${OUT}/controllers/ghost/ghost.module.svelte.ts`, "export {}");
    project.write(`${OUT}/backup.json`, '{"legacy":true}');

    await reflector(true);

    expect(project.exists(`${OUT}/controllers/ghost`)).toBe(false);
    expect(project.exists(`${OUT}/controllers/user/user.module.svelte.ts`)).toBe(true);
    expect(fs.readFileSync(project.file(`${OUT}/backup.json`), "utf8")).toBe('{"legacy":true}');
    expect(leftovers()).toEqual([]);
  });
});
