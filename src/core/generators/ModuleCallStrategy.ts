import { treatByUppercase } from "../../helpers/helpers.js";
import type { CallMethodInput, CallStrategy } from "./CallStrategy.js";

export class ModuleCallStrategy implements CallStrategy {
  readonly listStateAccess = "this.list";

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

    if (pathsBlock) {
      return `{
        behavior?: ${behaviorType};${pathsBlock}
      }`;
    }

    return `{
      behavior?: ${behaviorType};
    }`;
  }

  private buildPathsBlock(method: CallMethodInput): string | undefined {
    const paths = method.analyzers.props.paths;
    if (paths.length === 0) return undefined;

    return `
    paths?: {
      ${paths
        .map((p) => {
          const type = p.rawType ?? p.type;
          return `${p.name}: ${type}`;
        })
        .join("\n")}
    }`;
  }
}
