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
// import { Module } from "./module.js";

export const enumTypes = new Map<string, string>();
export const mockedParams = new Set<string>();

export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;

  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${baseDir}/backup.json`) });
  readonly propertiesNames = new Set<string>();

  readonly src = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/controllers`) });
  readonly typesSrc = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/reflector.svelte.ts`) });
  readonly schemaFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/schemas.svelte.ts`) });
  readonly fieldsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/fields.ts`) });
  readonly enumFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/enums.ts`) });
  readonly mockedParamsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/mocked-params.svelte.ts`) });

  files: Source[];
  schemas: Schema[];
  modules: Module[];

  constructor(params: { components: ComponentsObject; paths: PathsObject; validators: FieldValidators }) {
    const { components, paths, validators } = params;
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

  build() {
    const treatedSchemas = this.schemas.map((s) => {
      return `
        ${s.interface};

        ${s.schema};
      `;
    });

    this.schemaFile.changeData(
      [
        'import { build, BuildedInput } from "$reflector/reflector.svelte";',
        'import { validateInputs } from "$lib/sanitizers/validateFormats";',
        `import type {${Array.from(enumTypes.values())}} from "$reflector/enums"`,
        ...treatedSchemas,
      ].join("\n\n"),
    );
    this.schemaFile.save();

    const buildFunctions = new ReflectorFile().fileContent;

    this.typesSrc.changeData(buildFunctions);
    this.typesSrc.save();

    this.fieldsFile.changeData(`
      export const FIELD_NAMES = [
        ${Array.from(this.propertiesNames).map((p) => `'${p}'`)}
      ] as const;
      export type FieldName = (typeof FIELD_NAMES)[number]
    `);

    this.fieldsFile.save();

    for (const module of this.modules) {
      if (module.methods.length === 0) continue;
      module.src.save();
    }

    const enumss = Array.from(enumTypes)
      .map(([types, key]) => {
        return `export const ${key} = [ ${types} ] as const; export type ${key} = typeof ${key}[number] `;
      })
      .join(";");

    this.enumFile.changeData(enumss);
    this.enumFile.save();

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
    this.mockedParamsFile.save();

    return {};
  }

  localSave(data: OpenAPIObject) {
    this.localDoc.data = JSON.stringify(data);
    this.localDoc.save();
  }

  private clearSrc() {
    fs.rmSync(this.src.path, { recursive: true, force: true });
    fs.mkdirSync(this.src.path, { recursive: true });
  }
}
