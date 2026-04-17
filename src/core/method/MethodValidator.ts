import type { Method } from "./Method.js";
import { createDangerMessage } from "../../helpers/helpers.js";

export class MethodValidator {
  /** Returns true if the method should be skipped during code generation, logging the reason. */
  static isSkippable(method: Method): boolean {
    const { bodyType, responseType, attributeType } = method.request;

    if (bodyType === "string") {
      createDangerMessage(`Method ${method.name} was skipped because it has an invalid body.`);
      return true;
    }

    const isNullResponse = !responseType || responseType === "null";
    if ((attributeType === "entity" || attributeType === "list") && isNullResponse) {
      createDangerMessage(`Method ${method.name} was skipped because it has a null response.`);
      return true;
    }

    const endpointParams = [...method.endpoint.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).filter(Boolean);
    if (endpointParams.length > 0) {
      const declaredPaths = new Set(method.paths.map((p) => p.name));
      const undeclared = endpointParams.filter((p) => !declaredPaths.has(p));

      if (undeclared.length > 0) {
        createDangerMessage(
          `Method ${method.name} was skipped because it has undeclared path params: ${undeclared.join(", ")}`,
        );
        return true;
      }
    }

    return false;
  }
}
