import { treatByUppercase } from "../../helpers/helpers.js";
import type { AttributeProp } from "../../types/types.js";
import type { CallMethodInput, CallStrategy } from "./CallStrategy.js";

export class ModuleCallStrategy implements CallStrategy {
  listStateAccess(method: CallMethodInput): string {
    return `this.list${method.stateSuffix}`;
  }

  buildSignature(method: CallMethodInput): string {
    const paramsType = this.buildParamsType(method);
    return `protected async _${method.name}(params?: ${paramsType})`;
  }

  entityStateAccess(method: CallMethodInput): string {
    const rType = method.analyzers.request.responseType ?? "";
    return `this.${treatByUppercase(rType)}`;
  }

  formStateAccess(method: CallMethodInput): string {
    return `this.forms.${method.name}`;
  }

  private buildParamsType(method: CallMethodInput): string {
    const behaviorType = `Behavior<${method.responseTypeInterface}, ApiErrorResponse>`;
    const pathsBlock = this.buildPathsBlock(method);
    const queryBlock = this.buildQueryOverrideBlock(method);

    const blocks = [`behavior?: ${behaviorType};`, pathsBlock, queryBlock]
      .filter((b): b is string => !!b)
      .join("\n");

    return `{
      ${blocks}
    }`;
  }

  private buildPathsBlock(method: CallMethodInput): string | undefined {
    const paths = method.analyzers.props.paths;
    if (paths.length === 0) return undefined;

    return `paths?: {
      ${paths
        .map((p) => {
          const type = p.rawType ?? p.type;
          return `${p.name}: ${type}`;
        })
        .join("\n")}
    };`;
  }

  private buildQueryOverrideBlock(method: CallMethodInput): string | undefined {
    const querys = method.analyzers.props.querys;
    if (querys.length === 0) return undefined;

    const fields = querys
      .map((q) => `${q.name}?: ${this.queryOverrideType(q)}`)
      .join("\n");

    return `queryOverride?: {
      ${fields}
    };`;
  }

  private queryOverrideType(q: AttributeProp): string {
    if ("isEnum" in q && q.isEnum) return `${q.type}[]`;
    if (!("rawType" in q) && !("enumName" in q)) return "string[]";
    return "string | null";
  }
}
