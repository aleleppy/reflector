import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { getEndpoint, splitByUppercase } from "./helpers/helpers.js";
import { Schema } from "./schema.js";
import type { ComponentsObject, PathsObject, OpenAPIObject, OperationObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators, Info, ReflectorOperation } from "./types/types.js";
import { Module } from "./module.js";

import { baseDir, generatedDir } from "./vars.global.js";
import { ReflectorFile } from "./reflector.js";

export const enumTypes = new Map<string, string>();
export const mockedParams = new Set<string>();

export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;

  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${baseDir}/backup.json`) });
  readonly propertiesNames = new Set<string>();

  readonly src = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/controllers`) });
  readonly typesSrc = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/reflector.svelte.ts`) });
  private readonly schemaMap = new Map<string, Schema>();
  readonly fieldsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/fields.ts`) });
  readonly enumFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/enums.ts`) });
  readonly mockedParamsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/mocked-params.svelte.ts`) });

  files: Source[];
  schemas: Schema[];
  modules: Module[];

  constructor(params: { components: ComponentsObject; paths: PathsObject; validators: FieldValidators }) {
    const { components, paths, validators } = params;

    // Limpa estado global entre execuções
    enumTypes.clear();
    mockedParams.clear();

    this.clearSrc();

    this.components = components;
    this.paths = paths;

    this.files = [];
    this.modules = this.getModules();
    const { propertiesNames, schemas } = this.getSchemas({ validators });
    this.propertiesNames = propertiesNames;
    this.schemas = schemas;
  }

  private getSchemas(params: { validators: FieldValidators }) {
    const { validators } = params;

    const componentSchemas = this.components.schemas;

    const schemas: Schema[] = [];
    const propertiesNames = new Set<string>();

    if (!componentSchemas) return { schemas, propertiesNames };

    for (const [key, object] of Object.entries(componentSchemas)) {
      if ("$ref" in object || !object.properties) continue;

      const properties = object.properties;

      const schema = {
        properties,
        name: key,
        requireds: object.required || [],
      };

      Object.keys(properties).forEach((prop) => {
        propertiesNames.add(prop);
      });

      schemas.push(new Schema({ ...schema, isEmpty: false, validators }));
    }

    // Build schema lookup map for per-module splitting
    for (const schema of schemas) {
      this.schemaMap.set(schema.name, schema);
    }

    console.log(`${schemas.length} schemas gerados com sucesso.`);
    return { schemas, propertiesNames };
  }

  private getModules(): Module[] {
    const methodsMap = new Map<string, Info>();

    for (const [path, methods] of Object.entries(this.paths)) {
      const rawMethod = Object.values(methods)[0] as OperationObject;

      const rawName = rawMethod.operationId?.split("_")[0] ?? "";

      const teste = splitByUppercase(rawName).filter((x) => x !== "Controller");

      const moduleName = teste.join("");
      const baseEndpoint = getEndpoint(path);

      const operations: ReflectorOperation[] = Object.entries(methods).map(([apiMethod, attributes]) => {
        return {
          apiMethod,
          endpoint: path,
          ...attributes,
        };
      });

      const existentModule = methodsMap.get(moduleName);

      if (existentModule) {
        const newPath = existentModule.path.length > path.length ? path : existentModule.path;

        methodsMap.set(moduleName, {
          ...existentModule,
          path: newPath,
          operations: [...existentModule.operations, ...operations],
        });
      } else {
        methodsMap.set(moduleName, { operations, path: baseEndpoint, moduleName });
      }
    }

    const modules: Module[] = Array.from(methodsMap).map(([name, info]) => {
      return new Module({
        name,
        ...info,
      });
    });

    return modules;
  }

  async build() {
    // Generate per-module schema files
    const moduleSchemaFiles: Source[] = [];

    for (const module of this.modules) {
      if (module.methods.length === 0 || module.schemaClassNames.length === 0) continue;

      const neededSchemas = this.resolveTransitiveDeps(module.schemaClassNames);
      if (neededSchemas.length === 0) continue;

      const schemaFileContent = this.buildSchemaFileContent(neededSchemas);
      const schemaFilePath = module.src.path.replace(".module.svelte.ts", ".schema.svelte.ts");
      moduleSchemaFiles.push(new Source({ path: schemaFilePath, data: schemaFileContent }));
    }

    const buildFunctions = new ReflectorFile().fileContent;
    this.typesSrc.changeData(buildFunctions);

    this.fieldsFile.changeData(`
      export const FIELD_NAMES = [
        ${Array.from(this.propertiesNames).map((p) => `'${p}'`)}
      ] as const;
      export type FieldName = (typeof FIELD_NAMES)[number]
    `);

    const enumss = Array.from(enumTypes)
      .map(([types, key]) => {
        return `export const ${key} = [ ${types} ] as const; export type ${key} = typeof ${key}[number] `;
      })
      .join(";");

    this.enumFile.changeData(enumss);

    const mockedParamss = Array.from(mockedParams)
      .map((paramName) => {
        return `${paramName} = $state<string | null>(null)`;
      })
      .join(";");

    const mockedFile = `
      class MockedParams {
        ${mockedParamss}
      }

      const mockedParams = new MockedParams()
      export default mockedParams
    `;

    this.mockedParamsFile.changeData(mockedFile);

    // Salva todos os arquivos em paralelo, aguardando conclusão
    await Promise.all([
      ...moduleSchemaFiles.map((f) => f.save()),
      this.typesSrc.save(),
      this.fieldsFile.save(),
      this.enumFile.save(),
      this.mockedParamsFile.save(),
      ...this.modules
        .filter((m) => m.methods.length > 0)
        .map((m) => m.src.save()),
    ]);

    return {};
  }

  async localSave(data: OpenAPIObject) {
    this.localDoc.data = JSON.stringify(data);
    await this.localDoc.save();
  }

  /** Resolve transitive schema dependencies from a list of schema class names */
  private resolveTransitiveDeps(names: string[]): Schema[] {
    const resolved = new Set<string>();
    const stack = [...names];

    while (stack.length > 0) {
      const name = stack.pop()!;
      if (resolved.has(name)) continue;

      const schema = this.schemaMap.get(name);
      if (!schema) continue;

      resolved.add(name);
      for (const dep of schema.schemaDeps) {
        if (!resolved.has(dep)) {
          stack.push(dep);
        }
      }
    }

    return [...resolved].map((n) => this.schemaMap.get(n)!).filter(Boolean);
  }

  /** Build the content of a per-module schema file containing only the needed schemas */
  private buildSchemaFileContent(schemas: Schema[]): string {
    // Collect enum deps from all schemas in this file
    const enumDeps = new Set<string>();
    for (const s of schemas) {
      for (const e of s.enumDeps) {
        enumDeps.add(e);
      }
    }

    const treatedSchemas = schemas.map((s) => `${s.interface};\n${s.schema};`);

    const imports: string[] = [
      'import { build, BuildedInput } from "$reflector/reflector.svelte";',
      'import { validateInputs } from "$lib/sanitizers/validateFormats";',
    ];

    if (enumDeps.size > 0) {
      imports.push(`import type { ${[...enumDeps].join(", ")} } from "$reflector/enums"`);
    }

    imports.push("import { PUBLIC_ENVIRONMENT } from '$env/static/public';");
    imports.push("const isEmpty = PUBLIC_ENVIRONMENT !== 'DEV';");

    return imports.join("\n") + "\n" + treatedSchemas.join("\n");
  }

  private clearSrc() {
    fs.rmSync(this.src.path, { recursive: true, force: true });
    fs.mkdirSync(this.src.path, { recursive: true });
  }
}
