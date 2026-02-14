import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "../file.js";
import { splitByUppercase } from "../utils/StringUtils.js";
import { getEndpoint } from "../utils/EndpointUtils.js";
import type { ComponentsObject, PathsObject, OperationObject } from "../types/open-api-spec.interface.js";
import type { FieldValidators, ReflectorOperation } from "../types/types.js";
import { Module } from "./Module.js";
import { MethodBuilder } from "./MethodBuilder.js";

interface Info {
  operations: ReflectorOperation[];
  path: string;
  moduleName: string;
}

export class ModuleBuilder {
  private components: ComponentsObject;
  private paths: PathsObject;

  constructor(params: { components: ComponentsObject; paths: PathsObject }) {
    this.components = params.components;
    this.paths = params.paths;
  }

  build(): Module[] {
    const methodsMap = new Map<string, Info>();

    for (const [path, methods] of Object.entries(this.paths)) {
      const rawMethod = Object.values(methods)[0] as OperationObject;
      const rawName = rawMethod.operationId?.split("_")[0] ?? "";
      const teste = splitByUppercase(rawName).filter((x) => x !== "Controller");
      const moduleName = teste.join("");
      const baseEndpoint = getEndpoint(path);

      const operations: ReflectorOperation[] = Object.entries(methods).map(([apiMethod, attributes]) => ({
        apiMethod,
        endpoint: path,
        ...attributes,
      }));

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

    return Array.from(methodsMap).map(([name, info]) => {
      const methodBuilder = new MethodBuilder();
      const methods = info.operations.map((op) => methodBuilder.build(op, info.moduleName));
      const src = new Source();
      return new Module({ name, path: info.path, moduleName: info.moduleName, methods, src });
    });
  }
}
