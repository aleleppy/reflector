import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

import { Reflector } from "../src/core/Reflector.js";
import type { OpenAPIObject } from "../src/types/open-api-spec.interface.js";

const here = path.dirname(fileURLToPath(import.meta.url));

interface Output {
  rel: string;
  content: string;
}

async function runFixture(name: string): Promise<Output[]> {
  const fixtureDir = path.join(here, "fixtures", name);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `reflector-${name}-`));
  const originalCwd = process.cwd();
  process.chdir(tempDir);

  try {
    const doc = JSON.parse(fs.readFileSync(path.join(fixtureDir, "openapi.json"), "utf8")) as OpenAPIObject;

    const r = new Reflector({
      components: doc.components!,
      paths: doc.paths,
      fieldConfigs: new Map(),
      typeImports: new Map(),
      apiImport: "$lib/api",
    });
    await r.build();

    const generatedRoot = path.join(tempDir, "src/reflector");
    return collect(generatedRoot, generatedRoot);
  } finally {
    process.chdir(originalCwd);
  }
}

describe("codegen — minimal fixture", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/minimal");

  beforeAll(async () => {
    outputs = await runFixture("minimal");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });
});

describe("codegen — colliding-routes fixture", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/colliding-routes");

  beforeAll(async () => {
    outputs = await runFixture("colliding-routes");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("produces unique identifiers for colliding HTTP verbs", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith("package-tenant.module.svelte.ts"));
    expect(moduleFile).toBeDefined();
    const content = moduleFile!.content;

    // Method names for the two `list` operations must be disambiguated
    expect(content).toMatch(/_listAllPackages\s*\(/);
    expect(content).toMatch(/_listAllControllers\s*\(/);

    // State fields for the two lists must be unique
    expect(content).toMatch(/\blistPackages\s*=\s*\$state/);
    expect(content).toMatch(/\blistControllers\s*=\s*\$state/);

    // _findOne must also be disambiguated between package and controller
    expect(content).toMatch(/_findOnePackage\s*\(/);
    expect(content).toMatch(/_findOneController\s*\(/);

    // And there should be no remaining plain `_listAll(` / `_findOne(` definitions
    expect(content).not.toMatch(/_listAll\s*\(/);
    expect(content).not.toMatch(/_findOne\s*\(/);
  });

  it("declares exactly one loading and paths field in the abstract class", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith("package-tenant.module.svelte.ts"));
    expect(moduleFile).toBeDefined();
    const content = moduleFile!.content;

    const classBody = content.split("export abstract class")[1] ?? "";
    const loadingDecls = classBody.match(/\bloading\s*=\s*\$state/g) ?? [];
    expect(loadingDecls.length).toBe(1);
  });
});

describe("codegen — sibling-lists fixture (two list-typed methods, different names)", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/sibling-lists");

  beforeAll(async () => {
    outputs = await runFixture("sibling-lists");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("disambiguates list state fields even when method names differ", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith("ai-chat-tenant.module.svelte.ts"));
    expect(moduleFile).toBeDefined();
    const content = moduleFile!.content;
    const classBody = content.split("export abstract class")[1] ?? "";

    // Two distinct list state fields, both within the class body.
    const listDecls = [...classBody.matchAll(/\blist\w*\s*=\s*\$state</g)].map((m) => m[0]);
    expect(listDecls.length).toBe(2);
    // No two list declarations should have the same identifier.
    const listIdents = listDecls.map((d) => d.match(/\blist\w*/)![0]);
    expect(new Set(listIdents).size).toBe(2);

    // The method names are already unique, so they MUST NOT be renamed.
    expect(content).toMatch(/_listAll\s*\(/);
    expect(content).toMatch(/_getMessages\s*\(/);

    // Two bundled* and two clear* methods must also be unique.
    const bundledDecls = [...classBody.matchAll(/\bbundled\w+\s*=\s*\$derived/g)].map((m) => m[0]);
    expect(bundledDecls.length).toBe(2);
    expect(new Set(bundledDecls.map((d) => d.match(/\bbundled\w+/)![0])).size).toBe(2);

    const clearDecls = [...classBody.matchAll(/protected\s+clearList\w*\s*\(/g)].map((m) => m[0]);
    expect(clearDecls.length).toBe(2);
    expect(new Set(clearDecls.map((d) => d.match(/clearList\w*/)![0])).size).toBe(2);
  });
});

describe("codegen — optional-array-bundle fixture (optional/nullable arrays of refs)", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/optional-array-bundle");

  beforeAll(async () => {
    outputs = await runFixture("optional-array-bundle");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("emits null/undefined-safe bundle() for optional and nullable array fields", () => {
    const schemaFile = outputs.find((o) => o.rel.endsWith("package.schema.svelte.ts"));
    expect(schemaFile).toBeDefined();
    const content = schemaFile!.content;

    // required, non-nullable: plain .map (no guard needed)
    expect(content).toMatch(/requiredItems:\s*this\.requiredItems\.map\(\(obj\) => obj\.bundle\(\)\)/);

    // optional, non-nullable: ?.map (undefined-safe)
    expect(content).toMatch(/optionalItems:\s*this\.optionalItems\?\.map\(\(obj\) => obj\.bundle\(\)\)/);

    // required, nullable: == null guard preserves null (prettier may wrap across lines)
    expect(content).toMatch(
      /nullableItems:\s*this\.nullableItems\s*==\s*null\s*\?\s*this\.nullableItems\s*:\s*this\.nullableItems\.map\(\(obj\) => obj\.bundle\(\)\)/,
    );

    // optional + nullable: == null guard catches both null and undefined
    expect(content).toMatch(
      /optionalNullableItems:\s*this\.optionalNullableItems\s*==\s*null\s*\?\s*this\.optionalNullableItems\s*:\s*this\.optionalNullableItems\.map\(\(obj\) => obj\.bundle\(\)\)/,
    );

    // primitive arrays unchanged: no .map call in bundle
    expect(content).toMatch(/tags:\s*this\.tags[,}\s]/);
    expect(content).not.toMatch(/tags:\s*this\.tags\?\.map/);
  });
});

function collect(root: string, dir: string, out: Output[] = []): Output[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(root, p, out);
    } else {
      out.push({
        rel: path.relative(root, p).split(path.sep).join("/"),
        content: fs.readFileSync(p, "utf8"),
      });
    }
  }
  return out;
}
