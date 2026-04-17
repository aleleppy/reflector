import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

import { Reflector } from "../src/core/Reflector.js";
import type { OpenAPIObject } from "../src/types/open-api-spec.interface.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(here, "fixtures/minimal");
const SNAPSHOT_DIR = path.join(here, "snapshots/minimal");

interface Output {
  rel: string;
  content: string;
}

describe("codegen — minimal fixture", () => {
  let outputs: Output[] = [];

  beforeAll(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "reflector-"));
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const doc = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, "openapi.json"), "utf8")) as OpenAPIObject;

      const r = new Reflector({
        components: doc.components!,
        paths: doc.paths,
        fieldConfigs: new Map(),
        typeImports: new Map(),
        apiImport: "$lib/api",
      });
      await r.build();

      const generatedRoot = path.join(tempDir, "src/reflector");
      outputs = collect(generatedRoot, generatedRoot);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(SNAPSHOT_DIR, rel));
    }
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
