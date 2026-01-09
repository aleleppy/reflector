import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { getEndpoint, splitByUppercase, testeEndpoint } from "./helpers/helpers.js";
import { Schema } from "./schema.js";
import type { ComponentsObject, PathsObject, OpenAPIObject, OperationObject } from "./types/open-api-spec.interface.js";
import type { Info, ReflectorOperation } from "./types/types.js";
import { Module } from "./module.js";

export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;
  readonly dir: string = "src";
  readonly generatedDir: string = `${this.dir}/reflector`;
  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${this.dir}/backup.json`) });

  readonly src = new Source({ path: path.resolve(process.cwd(), `${this.generatedDir}/controllers`) });
  readonly typesSrc = new Source({ path: path.resolve(process.cwd(), `${this.generatedDir}/reflector.types.ts`) });
  readonly schemaFile = new Source({ path: path.resolve(process.cwd(), `${this.generatedDir}/schemas.ts`) });

  files: Source[];
  schemas: Schema[];
  modules: Module[];

  constructor(params: { components: ComponentsObject; paths: PathsObject }) {
    const { components, paths } = params;
    this.clearSrc();

    this.components = components;
    this.paths = paths;

    this.files = [];
    this.modules = this.getModules();
    this.schemas = this.getSchemas();
  }

  private getSchemas() {
    const componentSchemas = this.components.schemas;
    if (!componentSchemas) return [];

    const schemas: Schema[] = [];

    for (const [key, object] of Object.entries(componentSchemas)) {
      if ("$ref" in object || !object.properties) continue;

      const properties = object.properties;

      const schema = {
        properties,
        name: key,
        requireds: object.required || [],
      };

      schemas.push(
        new Schema({
          ...schema,
          isEmpty: false,
        }),
        new Schema({
          ...schema,
          isEmpty: true,
        })
      );
    }

    console.log(`${schemas.length} schemas gerados com sucesso.`);
    return schemas;
  }

  private getModules(): Module[] {
    const methodsMap = new Map<string, Info>();

    for (const [path, methods] of Object.entries(this.paths)) {
      const rawName = Object.values(methods)[0] as OperationObject;

      const a = rawName.operationId?.split("_")[0] ?? "";

      const teste = splitByUppercase(a).filter((x) => x !== "Controller");

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
        methodsMap.set(moduleName, {
          ...existentModule,
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
        dir: `${this.generatedDir}/controllers`,
      });
    });

    return modules;
  }

  build() {
    this.schemaFile.changeData([`import z from 'zod';`, ...this.schemas.map((s) => `${s.schema} ${s.type}`)].join("\n\n"));
    this.schemaFile.save();

    this.typesSrc.changeData("export class Behavior { onError?: (e) => void; onSuccess?: () => void }");
    this.typesSrc.save();

    for (const module of this.modules) {
      if (module.methods.length === 0) continue;
      module.src.save();
    }

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
