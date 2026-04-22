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

    const treatedSchemas = schemas.map((s) => `${s.interface};\n${s.schema};`);

    const imports: string[] = [
      `import { build, BuildedInput, bundleStrict } from "${config.reflectorAlias}/reflector.svelte";`,
      `import { validateInputs } from "${config.validatorsImport}";`,
    ];

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
