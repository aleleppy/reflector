import path from "node:path";
import fs from "node:fs";
import { Source } from "./file.js";
import { getEndpointAndModuleName, splitByUppercase } from "./helpers/helpers.js";
import { Schema } from "./schema.js";
import { ComponentsObject, PathsObject, OpenAPIObject } from "./types/open-api-spec.interface.js";
import { Info, ReflectorOperation } from "./types/types.js";
import { Module } from "./module.js";

const methods = ["get", "patch", "post", "put", "delete"] as const;
export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;
  readonly dir: string = "src";
  readonly generatedDir: string = `${this.dir}/reflector`;
  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${this.dir}/backup.json`) });

  readonly src = new Source({ path: path.resolve(process.cwd(), this.generatedDir) });
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

      schemas.push(
        new Schema({
          properties,
          name: key,
          requireds: object.required || [],
        })
      );
    }

    console.log(`${schemas.length} schemas gerados com sucesso.`);
    return schemas;
  }

  private getModules(): Module[] {
    const methodsMap = new Map<string, Info>();
    const modules: Module[] = [];

    for (const [rawEndpoint, object] of Object.entries(this.paths)) {
      let entity;
      const operations: ReflectorOperation[] = [];
      const { endpoint, moduleName } = getEndpointAndModuleName(rawEndpoint);

      for (const method of methods) {
        if (!object[method]) continue;

        operations.push({ ...object[method], apiMethod: method });

        if (!entity) {
          const teste = object[method].operationId!.split("_")[0];
          const x = splitByUppercase(teste);
          const aaa = x.filter((y) => y !== "Controller");
          entity = aaa.join("");
        }
      }

      if (!entity) continue;
      const existingOps = methodsMap.get(entity);

      if (existingOps) {
        existingOps.operations.push(...operations);
      } else {
        methodsMap.set(entity, { endpoint, operations, moduleName });
      }
    }

    for (const [name, info] of methodsMap) {
      modules.push(
        new Module({
          name,
          ...info,
          dir: this.generatedDir,
        })
      );
    }

    return modules;
  }

  build() {
    this.schemaFile.changeData([`import z from 'zod';`, ...this.schemas.map((s) => `${s.schema} ${s.type}`)].join("\n\n"));
    this.schemaFile.save();

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
