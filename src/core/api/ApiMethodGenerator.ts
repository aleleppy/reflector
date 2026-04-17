import type { Method } from "../../method.js";
import { MethodEndpointBuilder } from "../method/MethodEndpointBuilder.js";
import type { AttributeProp } from "../../types/types.js";

export class ApiMethodGenerator {
  private readonly endpointBuilder = new MethodEndpointBuilder();

  generate(method: Method): string {
    const description = this.buildDescription(method);
    const endpoint = this.endpointBuilder.build(method.endpoint, method.paths);
    const apiCall = this.buildApiCall(method);
    const props = this.buildProps(method);
    const pathsInfo = this.buildPathsInfo(method);
    const paramsType = this.buildParamsType(method, pathsInfo);

    return `
      ${description}
      async call(params?: ${paramsType}) {

        const behavior = params?.behavior ?? new Behavior();
        const { onError, onSuccess } = behavior;

        this.loading = true;
        ${props}
        const endpoint = ${endpoint}

        ${apiCall.outside}

        try {
          ${apiCall.inside}
          await onSuccess?.(response);

          return ${this.buildMethodReturn(method)};
        } catch (e) {
          let parsedError: ApiErrorResponse;
          try {
            parsedError = JSON.parse((e as Error).message) as ApiErrorResponse;
          } catch {
            parsedError = { error: 'unknown', message: (e as Error).message ?? String(e) };
          }
          return await onError?.(parsedError);
        } finally {
          this.loading = false;
        }
      }
    `;
  }

  private buildProps(method: Method): string {
    const { querys, paths, cookies } = method;
    const lines: string[] = [];

    if (querys.length > 0) {
      lines.push(`const { ${querys.map((x) => x.name).join(", ")} } = this.querys.bundle()`);
    }
    if (paths.length > 0) {
      lines.push(`const { ${paths.map((x) => x.name).join(", ")} } = params?.paths ?? this.paths`);
    }
    if (cookies.length > 0) {
      lines.push(`const cookies = this.cookies`);
    }

    return lines.join("\n");
  }

  private buildPathsInfo(method: Method): string | undefined {
    const { paths } = method;
    if (paths.length === 0) return undefined;

    return `{ ${paths
      .map((p) => {
        const type = p.rawType ?? p.type;
        return `${p.name}: ${type}`;
      })
      .join("; ")} }`;
  }

  private buildApiCall(method: Method): { inside: string; outside: string } {
    const { attributeType, apiType, responseType, bodyType, hasEnumResponse } = method.request;
    const responseTypeStr = hasEnumResponse && responseType ? responseType : method.responseTypeInterface;

    if (attributeType === "list") {
      return this.buildListCall(method, responseTypeStr);
    }

    if (attributeType === "entity") {
      return this.buildEntityCall(method, responseTypeStr);
    }

    if (apiType === "post" || apiType === "put" || apiType === "patch") {
      return this.buildFormCall(method, responseTypeStr, bodyType);
    }

    if (apiType === "delete") {
      return this.buildDeleteCall(responseTypeStr);
    }

    return { inside: "", outside: "" };
  }

  private buildListCall(method: Method, responseType: string): { inside: string; outside: string } {
    const querys = this.joinProps(method.querys);
    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        queryData: { ${querys} }
      })
      this.data = ${method.request.responseType}.from(response.data);
      this.totalPages = response.totalPages;
    `;
    return { inside, outside: "" };
  }

  private buildEntityCall(method: Method, responseType: string): { inside: string; outside: string } {
    const rType = method.request.responseType;
    const isPrimitive = method.request.isPrimitiveResponse;
    const querys = this.buildQuerys(method.querys);

    const buildedThisResponseType = rType && !isPrimitive
      ? `this.data = new ${rType}({ data: response })`
      : "";

    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        ${querys}
      })

      ${buildedThisResponseType}
    `;
    return { inside, outside: "" };
  }

  private buildFormCall(method: Method, responseType: string, bodyType?: string): { inside: string; outside: string } {
    const { apiType } = method.request;
    const hasHeaders = method.headers.length > 0;
    const hasData = !!bodyType;

    const outside: string[] = [];
    if (hasData) {
      outside.push(`const data = this.form.bundle()`);
    }
    if (hasHeaders) {
      outside.push(`const headers = this.headers.bundle()`);
    }

    const inside = `
      const response = await api.${apiType}<${responseType}>({
        endpoint,
        ${hasData ? "data," : ""}
        ${hasHeaders ? "headers," : ""}
      })
    `;

    return { inside, outside: outside.join("\n") };
  }

  private buildDeleteCall(responseType: string): { inside: string; outside: string } {
    const inside = `
      const response = await api.delete<${responseType}, unknown>({
        endpoint,
      })
    `;
    return { inside, outside: "" };
  }

  private buildParamsType(method: Method, paramsPaths?: string): string {
    const responseType = method.responseTypeInterface;

    if (paramsPaths) {
      return `ApiCallParams<${responseType}, ${paramsPaths}>`;
    }

    return `ApiCallParams<${responseType}>`;
  }

  private buildDescription(method: Method): string {
    return `/** ${method.description ?? ""} */`;
  }

  private buildMethodReturn(method: Method): string {
    const { attributeType, responseType, hasEnumResponse, isPrimitiveResponse } = method.request;

    if (attributeType === "list") {
      return "this.data";
    }

    if (!responseType) {
      return "null";
    }

    if (hasEnumResponse) {
      return "response.data";
    }

    if (isPrimitiveResponse) {
      return "response";
    }

    return `new ${responseType}({ data: response })`;
  }

  private joinProps(props: AttributeProp[]): string {
    return props.map((x) => x.name).join(",");
  }

  private buildQuerys(querys: AttributeProp[]): string {
    if (querys.length === 0) return "";
    return `queryData: {${querys.map((q) => q.name).join(",")}}`;
  }
}
