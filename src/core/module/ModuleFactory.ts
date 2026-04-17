import { Module } from "./Module.js";
import { getEndpoint, splitByUppercase } from "../../helpers/helpers.js";

import type { OperationObject, PathsObject } from "../../types/open-api-spec.interface.js";
import type { Info, ReflectorOperation } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";
import type { ReflectorConfig } from "../config/ReflectorConfig.js";

export class ModuleFactory {
  static build(params: {
    paths: PathsObject;
    apiImport: string;
    experimentalFeatures: boolean;
    context: CodegenContext;
    config: ReflectorConfig;
  }): Module[] {
    const { paths, apiImport, experimentalFeatures, context, config } = params;
    const methodsMap = new Map<string, Info>();

    for (const [path, methods] of Object.entries(paths)) {
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

    return Array.from(methodsMap).map(([name, info]) => {
      return new Module({
        name,
        ...info,
        apiImport,
        experimentalFeatures,
        context,
        config,
      });
    });
  }
}
