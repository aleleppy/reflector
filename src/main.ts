import path from "node:path";
import fs from "node:fs";
import { Source } from "./file.js";
import { sanitizeKey, capitalizeFirstLetter } from "./helpers.js";
import { Schema } from "./schema.js";
import { ComponentsObject, PathsObject, OpenAPIObject } from "./types/open-api-spec.interface.js";
import { Info, ReflectorOperation } from "./types/types.js";
import { Module } from "./module.js";

export class Reflector {
  readonly components: ComponentsObject;
  readonly paths: PathsObject;
  readonly dir: string = "src";
  readonly generatedDir: string = `${this.dir}/reflector`;
  readonly localDoc = new Source({ path: path.resolve(process.cwd(), `${this.dir}/backup.json`) });

  readonly src = new Source({ path: path.resolve(process.cwd(), this.generatedDir) });
  readonly schemaFile = new Source({ path: path.resolve(process.cwd(), `${this.dir}/schemas.ts`) });

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

    Object.entries(componentSchemas).forEach(([key, object]) => {
      if ("$ref" in object || !object.properties) return;

      const properties = object.properties;

      schemas.push(
        new Schema({
          properties,
          name: key,
          requireds: object.required || [],
        })
      );
    });

    console.log(`${schemas.length} schemas gerados com sucesso.`);
    return schemas;
  }

  getModules(): Module[] {
    const methodsMap = new Map<string, Info>();
    const modules: Module[] = [];

    for (const [rawEndpoint, object] of Object.entries(this.paths)) {
      const methods = ["get", "patch", "post", "put", "delete"] as const;

      let entity: string | undefined;
      const operations: ReflectorOperation[] = [];

      const splittedEntitys = rawEndpoint.split("/");
      const filteredEntitys = splittedEntitys.filter((item) => item !== "" && !item.includes("{"));
      const moduleName = filteredEntitys.map((x) => sanitizeKey(capitalizeFirstLetter(x))).join("");
      const endpoint = filteredEntitys.join("/");

      for (const method of methods) {
        if (!object[method]) continue;
        operations.push({ ...object[method], apiMethod: method });

        const tags = object[method].tags;

        if (!entity && tags) {
          entity = tags.join("").split("/").join("");
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

    this.modules.forEach((module) => {
      module.src.save();
    });

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
