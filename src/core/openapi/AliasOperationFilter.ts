import { HTTP_METHODS } from "./http-methods.js";

import type { OperationObject, PathsObject } from "../../types/open-api-spec.interface.js";

const ALIAS_SUFFIX = /\[\d+\]$/;

export class AliasOperationFilter {
  static apply(paths: PathsObject): void {
    const canonicalIds = new Set(
      AliasOperationFilter.operations(paths)
        .map(({ operation }) => operation.operationId)
        .filter((id): id is string => id !== undefined && !ALIAS_SUFFIX.test(id)),
    );

    for (const { path, method, operation } of AliasOperationFilter.operations(paths)) {
      const id = operation.operationId;
      if (!id || !ALIAS_SUFFIX.test(id)) continue;

      const canonicalId = id.replace(ALIAS_SUFFIX, "");
      if (canonicalIds.has(canonicalId)) {
        delete paths[path]![method];
        continue;
      }

      operation.operationId = canonicalId;
      canonicalIds.add(canonicalId);
    }

    for (const [path, item] of Object.entries(paths)) {
      if (item && !HTTP_METHODS.some((method) => item[method])) delete paths[path];
    }
  }

  private static operations(paths: PathsObject) {
    return Object.entries(paths).flatMap(([path, item]) =>
      HTTP_METHODS.flatMap((method) => {
        const operation: OperationObject | undefined = item?.[method];
        return operation ? [{ path, method, operation }] : [];
      }),
    );
  }
}
