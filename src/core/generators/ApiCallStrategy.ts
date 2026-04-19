import type { CallMethodInput, CallStrategy } from "./CallStrategy.js";

export class ApiCallStrategy implements CallStrategy {
  listStateAccess(_method: CallMethodInput): string {
    return "this.data";
  }

  buildSignature(method: CallMethodInput): string {
    const paramsType = this.buildParamsType(method);
    return `async call(params?: ${paramsType})`;
  }

  entityStateAccess(_method: CallMethodInput): string {
    return "this.data";
  }

  formStateAccess(_method: CallMethodInput): string {
    return "this.form";
  }

  private buildParamsType(method: CallMethodInput): string {
    const responseType = method.responseTypeInterface;
    const pathsBlock = this.buildPathsInfo(method);

    if (pathsBlock) {
      return `ApiCallParams<${responseType}, ${pathsBlock}>`;
    }

    return `ApiCallParams<${responseType}>`;
  }

  private buildPathsInfo(method: CallMethodInput): string | undefined {
    const paths = method.analyzers.props.paths;
    if (paths.length === 0) return undefined;

    return `{ ${paths
      .map((p) => {
        const type = p.rawType ?? p.type;
        return `${p.name}: ${type}`;
      })
      .join("; ")} }`;
  }
}
