import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

import { Reflector } from "../src/core/Reflector.js";
import type { OpenAPIObject } from "../src/types/open-api-spec.interface.js";
import type { ReflectorConfig } from "../src/core/config/ReflectorConfig.js";

const here = path.dirname(fileURLToPath(import.meta.url));

interface Output {
  rel: string;
  content: string;
}

async function runFixture(
  name: string,
  opts: { experimentalFeatures?: boolean; config?: Partial<ReflectorConfig> } = {},
): Promise<Output[]> {
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
      experimentalFeatures: opts.experimentalFeatures,
      config: opts.config,
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

describe("codegen — query-array-and-bad-enum fixture", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/query-array-and-bad-enum");

  beforeAll(async () => {
    outputs = await runFixture("query-array-and-bad-enum");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("string[] query declares EnumQueryBuilder<string>, not QueryBuilder", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    expect(moduleFile).toBeDefined();
    expect(moduleFile.content).toMatch(
      /readonly categoriesIds\s*=\s*new EnumQueryBuilder<string>\(/,
    );
    expect(moduleFile.content).toMatch(
      /categoriesIds:\s*this\.categoriesIds\?\.values/,
    );
  });

  it("number[] query uses number generic, not string", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    expect(moduleFile.content).toMatch(
      /readonly pageNumbers\s*=\s*new EnumQueryBuilder<number>\(/,
    );
  });

  it("never imports TS primitives (string/number/boolean) as enums from $reflector/enums", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    const enumImport = moduleFile.content.match(
      /import\s*\{([^}]+)\}\s*from\s*["']\$reflector\/enums["']/,
    );
    if (enumImport) {
      const names = enumImport[1]!.split(",").map((s) => s.trim());
      for (const n of names) {
        expect(n).not.toMatch(/^(string|number|integer|boolean)$/);
      }
    }
  });

  it("primitive-enum field falls back to plain QueryBuilder (no fake enum)", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    expect(moduleFile.content).toMatch(/readonly badField\s*=\s*new QueryBuilder\(/);

    const enumsFile = outputs.find((o) => o.rel === "enums.ts")!;
    // O valor 'string' não pode aparecer como literal de enum gerado
    expect(enumsFile.content).not.toMatch(/=\s*\[\s*['"]string['"]\s*\]\s*as const/);
  });

  it("enum array (statuses) still works — uses ENUM_* generic", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    expect(moduleFile.content).toMatch(
      /readonly statuses\s*=\s*new EnumQueryBuilder<ENUM_\w+>\(/,
    );
    expect(moduleFile.content).toMatch(/statuses:\s*this\.statuses\?\.values/);
  });
});

describe("codegen — nested-objects fixture (inline objects & arrays-of-object)", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/nested-objects");

  beforeAll(async () => {
    outputs = await runFixture("nested-objects");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("types an inline array-of-object as a generated child class, not string[]", () => {
    const schemaFile = outputs.find((o) => o.rel.endsWith(".schema.svelte.ts"))!;
    expect(schemaFile).toBeDefined();
    const content = schemaFile.content;

    // The bug: inline array-of-object degraded to string[].
    expect(content).not.toMatch(/calendario\??\s*=\s*\$state<string\[\]/);
    // Fixed: typed as a child class array.
    expect(content).toMatch(/calendario\??\s*=\s*\$state<CalendarController_getResponseCalendario\[\]/);
    // Child class exists with the object's own fields.
    expect(content).toMatch(/class CalendarController_getResponseCalendario\b/);
    expect(content).toMatch(/\bdataIso\b/);
  });

  it("keeps an inline nested object as an ObjectProp instead of dropping it", () => {
    const schemaFile = outputs.find((o) => o.rel.endsWith(".schema.svelte.ts"))!;
    const content = schemaFile.content;

    // The bug: inline object field silently dropped.
    expect(content).toMatch(/empresa\??\s*=\s*\$state<CalendarController_getResponseEmpresa/);
    expect(content).toMatch(/class CalendarController_getResponseEmpresa\b/);
    expect(content).toMatch(/\bcnpj\b/);
  });

  it("does not regress arrays of $ref or primitive arrays", () => {
    const schemaFile = outputs.find((o) => o.rel.endsWith(".schema.svelte.ts"))!;
    const content = schemaFile.content;

    // Array of $ref still resolves to the referenced class.
    expect(content).toMatch(/refItems\??\s*=\s*\$state<RefItem\[\]/);
    // Primitive array stays string[].
    expect(content).toMatch(/tags\??\s*=\s*\$state<string\[\]/);
  });
});

describe("codegen — array-response fixture (array-root response, non-ref item kinds)", () => {
  let outputs: Output[] = [];
  const snapshotDir = path.join(here, "snapshots/array-response");

  beforeAll(async () => {
    outputs = await runFixture("array-response");
  });

  it("generates the expected set of files", () => {
    expect(outputs.map((o) => o.rel).sort()).toMatchSnapshot();
  });

  it("matches content snapshots for every generated file", async () => {
    for (const { rel, content } of outputs) {
      await expect(content).toMatchFileSnapshot(path.join(snapshotDir, rel));
    }
  });

  it("emits the array-root response schema the module imports (no dangling import)", () => {
    const moduleFile = outputs.find((o) => o.rel.endsWith(".module.svelte.ts"))!;
    const schemaFile = outputs.find((o) => o.rel.endsWith(".schema.svelte.ts"));
    expect(schemaFile, "the per-module schema file must be emitted").toBeDefined();

    // Every XResponse the module imports must be defined in the schema file.
    const imported = [...moduleFile.content.matchAll(/\b(ArrayController_\w+Response)\b/g)].map((m) => m[1]!);
    expect(imported.length).toBeGreaterThan(0);
    for (const name of new Set(imported)) {
      expect(schemaFile!.content).toMatch(new RegExp(`class ${name}\\b`));
    }
  });

  it("types each item kind correctly: primitive string[], enum ENUM_*[], inline child class[], generic Record[]", () => {
    const schemaFile = outputs.find((o) => o.rel.endsWith(".schema.svelte.ts"))!;
    const content = schemaFile.content;

    // primitive: raw string[]
    expect(content).toMatch(/class ArrayController_primitivesResponse\b[\s\S]*?data = \$state<string\[\]>/);
    // enum: ENUM_*[] (not string[])
    expect(content).toMatch(/class ArrayController_enumsResponse\b[\s\S]*?data = \$state<ENUM_\w+\[\]>/);
    // inline object: promoted to a typed child class, hydrated
    expect(content).toMatch(/class ArrayController_inlineResponse\b[\s\S]*?new ArrayController_inlineResponseItem\(/);
    expect(content).toMatch(/class ArrayController_inlineResponseItem\b/);
    expect(content).toMatch(/\blabel\b/);
    // generic empty object: Record<string, unknown>[] (NOT degraded to string[])
    expect(content).toMatch(/class ArrayController_genericResponse\b[\s\S]*?data = \$state<Record<string, unknown>\[\]>/);
  });
});

describe("codegen — config.toastImport overrides the runtime template's toast path", () => {
  it("rewrites the toast import in reflector.svelte.ts when overridden", async () => {
    const outputs = await runFixture("minimal", {
      config: { toastImport: "$lib/components/notifications/toast.svelte" },
    });
    const runtime = outputs.find((o) => o.rel === "reflector.svelte.ts");
    expect(runtime).toBeDefined();
    expect(runtime!.content).toContain(`from "$lib/components/notifications/toast.svelte"`);
    expect(runtime!.content).not.toContain(`from "$lib/utils/toast.svelte"`);
  });

  it("leaves the default toast import untouched when no override is given", async () => {
    const outputs = await runFixture("minimal");
    const runtime = outputs.find((o) => o.rel === "reflector.svelte.ts");
    expect(runtime!.content).toContain(`from "$lib/utils/toast.svelte"`);
  });
});

describe("codegen — experimental Api class (queryOverride generic)", () => {
  let outputs: Output[] = [];

  beforeAll(async () => {
    outputs = await runFixture("minimal", { experimentalFeatures: true });
  });

  it("emits a *.api.svelte.ts file when experimentalFeatures is enabled", () => {
    const apiFile = outputs.find((o) => o.rel.endsWith("user.api.svelte.ts"));
    expect(apiFile, "user.api.svelte.ts should be generated").toBeDefined();
  });

  it("declares queryOverride as the third generic of ApiCallParams for endpoints with query params", () => {
    const apiFile = outputs.find((o) => o.rel.endsWith("user.api.svelte.ts"));
    const content = apiFile!.content;

    // _listAll has `limit` query (default: 10 in fixture). The Api class
    // call() must declare a third generic so `params?.queryOverride` in the
    // shared body is type-safe. Match across whitespace (prettier may wrap).
    expect(content).toMatch(
      /ApiCallParams<\s*UserController_listResponseInterface\s*,\s*void\s*,\s*\{\s*limit\?:\s*string\s*\|\s*null;?\s*\}\s*>/,
    );
  });

  it("does NOT add a third generic for endpoints without query params", () => {
    const apiFile = outputs.find((o) => o.rel.endsWith("user.api.svelte.ts"));
    const content = apiFile!.content;

    // _create (POST, body only) — `ApiCallParams<UserInterface>` with no
    // extra generics.
    expect(content).toMatch(/ApiCallParams<\s*UserInterface\s*>/);

    // _entity (GET path-only, no query) — paths only, no third generic.
    expect(content).toMatch(/ApiCallParams<\s*UserInterface\s*,\s*\{\s*id:\s*string\s*\}\s*>/);
  });

  it("body of call() reads from params?.queryOverride for query-bearing endpoints", () => {
    const apiFile = outputs.find((o) => o.rel.endsWith("user.api.svelte.ts"));
    const content = apiFile!.content;

    // Without the third generic on the type, this access would fail
    // typecheck on the consumer side.
    expect(content).toMatch(/params\?\.queryOverride\s*\?\?\s*this\.querys\.bundle\(\)/);
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
