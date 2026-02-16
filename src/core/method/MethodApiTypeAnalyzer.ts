import type { ReflectorOperation, ApiType } from "../../types/types.js";
import type { ReflectorRequestType } from "../../request.js";

export class MethodApiTypeAnalyzer {
  analyze(operation: ReflectorOperation): { apiType: ApiType; attributeType: ReflectorRequestType } {
    const apiType = operation.apiMethod;
    const attributeType = this.inferAttributeType(operation);
    return { apiType, attributeType };
  }

  private inferAttributeType(operation: ReflectorOperation): ReflectorRequestType {
    const method = operation.apiMethod;

    if (method === "post" || method === "put" || method === "patch") {
      return "form";
    }

    if (method === "get") {
      const params = operation.parameters ?? [];
      const hasPage = params.some((p) => !("$ref" in p) && p.name === "page");
      return hasPage ? "list" : "entity";
    }

    return "other";
  }
}
