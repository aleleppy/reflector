import { Source } from "../file.js";
import { splitByUppercase } from "../utils/StringUtils.js";
import { getEndpoint } from "../utils/EndpointUtils.js";
import type { ComponentsObject, PathsObject, OperationObject } from "../types/open-api-spec.interface.js";
import type { ReflectorOperation } from "../types/types.js";
import { Module } from "./Module.js";
import { Method } from "../method.js";

interface Info {
  operations: ReflectorOperation[];
  path: string;
  moduleName: string;
}

export class ModuleBuilder {
  private readonly components: ComponentsObject;
  private readonly paths: PathsObject;

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
      const methods = info.operations.map((op) => new Method({ operation: op, moduleName: info.moduleName }));
      const src = new Source({ path: "" });
      return new Module({ name, path: info.path, moduleName: info.moduleName, methods, src });
    });
  }
}
