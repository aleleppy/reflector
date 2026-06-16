import type { Schema } from "../schema/Schema.js";
import type { TypeImports } from "../../types/types.js";
import type { ReflectorConfig } from "../config/ReflectorConfig.js";

/**
 * Builds the content of a per-module `*.schema.svelte.ts` file containing
 * only the schemas (and their transitive enum / custom-type imports) that
 * the module's generated methods actually use.
 */
export class ModuleSchemaFileBuilder {
  static build(params: { schemas: Schema[]; typeImports: TypeImports; config: ReflectorConfig }): string {
    const { schemas, typeImports, config } = params;

    const enumDeps = new Set<string>();
    const customTypeDeps = new Set<string>();
    for (const s of schemas) {
      for (const e of s.enumDeps) {
        enumDeps.add(e);
      }
      for (const t of s.customTypeDeps) {
        customTypeDeps.add(t);
      }
    }
    // só presença importa (o import é o objeto `sanitizers` inteiro), não os refs
    const usesSanitizers = schemas.some((s) => s.sanitizerDeps.length > 0);

    const treatedSchemas = schemas.map((s) => `${s.interface};\n${s.schema};`);

    // import preciso: response usa bundleStrict, request usa bundleInputs, array-root
    // não usa nenhum. Evita import morto (svelte-check/eslint do consumer reclama).
    const needsStrict = schemas.some((s) => s.bundleHelper === "strict");
    const needsInputs = schemas.some((s) => s.bundleHelper === "inputs");
    const reflectorImports = ["build", "BuildedInput"];
    if (needsStrict) reflectorImports.push("bundleStrict");
    if (needsInputs) reflectorImports.push("bundleInputs");

    const imports: string[] = [
      `import { ${reflectorImports.join(", ")} } from "${config.reflectorAlias}/reflector.svelte";`,
      `import { validateInputs } from "${config.validatorsImport}";`,
    ];

    if (usesSanitizers) {
      imports.push(`import { sanitizers } from "${config.sanitizersImport}";`);
    }

    if (enumDeps.size > 0) {
      imports.push(`import type { ${[...enumDeps].join(", ")} } from "${config.reflectorAlias}/enums"`);
    }

    for (const typeName of customTypeDeps) {
      const importStatement = typeImports.get(typeName);
      if (importStatement) {
        imports.push(importStatement + ";");
      }
    }

    imports.push(`import { ${config.environmentFlag} } from '${config.environmentImport}';`);
    imports.push(`const isEmpty = ${config.environmentFlag} !== 'DEV';`);

    return imports.join("\n") + "\n" + treatedSchemas.join("\n");
  }
}
