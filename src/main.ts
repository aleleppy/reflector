import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter, getEndpoint, isReferenceObject, splitByUppercase } from "./helpers/helpers.js";
import { Schema } from "./schema.js";
import type { ComponentsObject, PathsObject, OpenAPIObject, OperationObject, SchemaObject, ReferenceObject, ResponseObject, ResponsesObject } from "./types/open-api-spec.interface.js";
import type { FieldConfigs, TypeImports, Info, ReflectorOperation } from "./types/types.js";
import { Module } from "./module.js";

import { generatedDir } from "./vars.global.js";
import { ReflectorFile } from "./reflector.js";

export const enumTypes = new Map<string, string>();
export const mockedParams = new Set<string>();

export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;

  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/backup.json`) });
  readonly propertiesNames = new Set<string>();

  readonly src = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/controllers`) });
  readonly typesSrc = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/reflector.svelte.ts`) });
  private readonly schemaMap = new Map<string, Schema>();
  private readonly typeImports: TypeImports;
  readonly fieldsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/fields.ts`) });
  readonly enumFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/enums.ts`) });
  readonly mockedParamsFile = new Source({ path: path.resolve(process.cwd(), `${generatedDir}/mocked-params.svelte.ts`) });

  files: Source[];
  schemas: Schema[];
  modules: Module[];

  readonly apiImport: string;

  constructor(params: {
    components: ComponentsObject;
    paths: PathsObject;
    fieldConfigs: FieldConfigs;
    typeImports: TypeImports;
    apiImport: string;
  }) {
    const { components, paths, fieldConfigs, typeImports, apiImport } = params;
    this.apiImport = apiImport;
    this.typeImports = typeImports;

    // Clear global state between runs
    enumTypes.clear();
    mockedParams.clear();

    this.clearSrc();

    this.components = components;
    this.paths = paths;

    this.extractInlineBodies();
    this.extractInlineResponses();

    this.files = [];
    this.modules = this.getModules();
    const { propertiesNames, schemas } = this.getSchemas({ fieldConfigs });
    this.propertiesNames = propertiesNames;
    this.schemas = schemas;
  }

  /**
   * Promotes inline object request-body schemas to named components.
   * Without this, `MethodBodyAnalyzer` falls back to `schema.type` ("object")
   * because inline bodies aren't referenced by a `$ref`, and the resulting
   * body type name collides with the JS primitive — so the generated module
   * imports a non-existent `{ object }` class and the schema file is never
   * emitted (resolveTransitiveDeps finds nothing in schemaMap).
   */
  private extractInlineBodies() {
    this.components.schemas ??= {};
    const schemas = this.components.schemas;
    const usedNames = new Set(Object.keys(schemas));
    const httpMethods = ["get", "put", "post", "delete", "patch", "options", "head", "trace"] as const;

    for (const [pathStr, pathItem] of Object.entries(this.paths)) {
      if (!pathItem) continue;
      for (const httpMethod of httpMethods) {
        this.promoteInlineBody(pathItem[httpMethod], httpMethod, pathStr, schemas, usedNames);
      }
    }
  }

  private promoteInlineBody(
    operation: OperationObject | undefined,
    httpMethod: string,
    pathStr: string,
    schemas: Record<string, SchemaObject | ReferenceObject>,
    usedNames: Set<string>,
  ) {
    if (!operation?.requestBody || "$ref" in operation.requestBody) return;
    const firstEntry = Object.values(operation.requestBody.content ?? {})[0];
    const schema = firstEntry?.schema;
    if (!schema || "$ref" in schema || !schema.properties) return;

    const base = operation.operationId
      ? capitalizeFirstLetter(operation.operationId)
      : capitalizeFirstLetter(httpMethod) + pathStr.replaceAll(/[^a-zA-Z0-9]/g, "");

    let name = `${base}Body`;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}Body${suffix++}`;
    }
    usedNames.add(name);

    schemas[name] = schema;
    firstEntry.schema = { $ref: `#/components/schemas/${name}` };
  }

  /**
   * Promotes inline response `data` schemas to named components.
   * Responses in this API follow a `{success, data, message}` envelope where
   * `data` is either declared directly or overlaid via `allOf`. When `data` is
   * an inline object/array (no `$ref`), the response analyzer can only
   * extract the raw `schema.type` ("object"/"array"), which isn't a valid
   * class name. Promoting `data` to a named component gives the analyzer a
   * proper `$ref` to resolve.
   */
  private extractInlineResponses() {
    this.components.schemas ??= {};
    const schemas = this.components.schemas;
    const usedNames = new Set(Object.keys(schemas));
    const httpMethods = ["get", "put", "post", "delete", "patch", "options", "head", "trace"] as const;

    for (const [pathStr, pathItem] of Object.entries(this.paths)) {
      if (!pathItem) continue;
      for (const httpMethod of httpMethods) {
        this.promoteInlineResponse(pathItem[httpMethod], httpMethod, pathStr, schemas, usedNames);
      }
    }
  }

  private promoteInlineResponse(
    operation: OperationObject | undefined,
    httpMethod: string,
    pathStr: string,
    schemas: Record<string, SchemaObject | ReferenceObject>,
    usedNames: Set<string>,
  ) {
    if (!operation?.responses) return;

    const successResponse = this.findSuccessResponse(operation.responses);
    if (!successResponse || "$ref" in successResponse || !successResponse.content) return;

    const firstEntry = Object.values(successResponse.content)[0];
    const schema = firstEntry?.schema;
    if (!schema || "$ref" in schema) return;

    const dataHolder = this.findInlineDataHolder(schema);
    if (!dataHolder) return;

    const base = operation.operationId
      ? capitalizeFirstLetter(operation.operationId)
      : capitalizeFirstLetter(httpMethod) + pathStr.replaceAll(/[^a-zA-Z0-9]/g, "");

    let name = `${base}Response`;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}Response${suffix++}`;
    }
    usedNames.add(name);

    schemas[name] = dataHolder.data;
    dataHolder.replace({ $ref: `#/components/schemas/${name}` });
  }

  private findSuccessResponse(responses: ResponsesObject): ResponseObject | ReferenceObject | undefined {
    for (const [code, response] of Object.entries(responses)) {
      if (code.startsWith("2")) return response;
    }
    return undefined;
  }

  /**
   * Locates the inline `data` sub-schema inside a response envelope, whether
   * it lives at `schema.properties.data` or inside an `allOf` entry. Returns
   * a handle that lets the caller swap the inline schema for a `$ref`.
   */
  private findInlineDataHolder(
    schema: SchemaObject,
  ): { data: SchemaObject; replace: (ref: ReferenceObject) => void } | null {
    const holders: { properties?: Record<string, SchemaObject | ReferenceObject> }[] = [];
    if (schema.properties) holders.push(schema as { properties: Record<string, SchemaObject | ReferenceObject> });
    if (schema.allOf) {
      for (const entry of schema.allOf) {
        if (!("$ref" in entry) && entry.properties) {
          holders.push(entry as { properties: Record<string, SchemaObject | ReferenceObject> });
        }
      }
    }

    for (const holder of holders) {
      const data = holder.properties?.["data"];
      if (!data || "$ref" in data) continue;
      if (!this.hasExtractableContent(data)) continue;
      return {
        data,
        replace: (ref) => {
          holder.properties!["data"] = ref;
        },
      };
    }

    return null;
  }

  private hasExtractableContent(schema: SchemaObject): boolean {
    if (schema.properties) return true;
    if (schema.items) return true;
    if (schema.allOf?.length) return true;
    return false;
  }

  private getSchemas(params: { fieldConfigs: FieldConfigs }) {
    const { fieldConfigs } = params;

    const componentSchemas = this.components.schemas;

    const schemas: Schema[] = [];
    const propertiesNames = new Set<string>();

    if (!componentSchemas) return { schemas, propertiesNames };

    for (const [key, object] of Object.entries(componentSchemas)) {
      if (isReferenceObject(object) || !object.properties) continue;

      const properties = object.properties;

      const schema = {
        properties,
        name: key,
        requireds: object.required || [],
      };

      Object.keys(properties).forEach((prop) => {
        propertiesNames.add(prop);
      });

      schemas.push(new Schema({ ...schema, isEmpty: false, fieldConfigs }));
    }

    // Build schema lookup map for per-module splitting
    for (const schema of schemas) {
      this.schemaMap.set(schema.name, schema);
    }

    console.log(`${schemas.length} schemas generated successfully.`);
    return { schemas, propertiesNames };
  }

  private getModules(): Module[] {
    const methodsMap = new Map<string, Info>();

    for (const [path, methods] of Object.entries(this.paths)) {
      const rawMethod = Object.values(methods)[0] as OperationObject;

      const rawName = rawMethod.operationId?.split("_")[0] ?? "";

      const nameParts = splitByUppercase(rawName).filter((x) => x !== "Controller");

      const moduleName = nameParts.join("");
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
        apiImport: this.apiImport,
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

    // Save all files in parallel, awaiting completion
    await Promise.all([
      ...moduleSchemaFiles.map((f) => f.save()),
      this.typesSrc.save(),
      this.fieldsFile.save(),
      this.enumFile.save(),
      this.mockedParamsFile.save(),
      ...this.modules.filter((m) => m.methods.length > 0).map((m) => m.src.save()),
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
      'import { build, BuildedInput } from "$reflector/reflector.svelte";',
      'import { validateInputs } from "$lib/sanitizers/validateFormats";',
    ];

    if (enumDeps.size > 0) {
      imports.push(`import type { ${[...enumDeps].join(", ")} } from "$reflector/enums"`);
    }

    for (const typeName of customTypeDeps) {
      const importStatement = this.typeImports.get(typeName);
      if (importStatement) {
        imports.push(importStatement + ";");
      }
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
