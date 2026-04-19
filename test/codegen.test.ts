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
