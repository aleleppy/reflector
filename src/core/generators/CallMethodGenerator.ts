import { MethodEndpointBuilder } from "../method/MethodEndpointBuilder.js";
import type { AttributeProp } from "../../types/types.js";
import type { CallMethodInput, CallStrategy } from "./CallStrategy.js";

export class CallMethodGenerator {
  private readonly endpointBuilder = new MethodEndpointBuilder();

  generate(method: CallMethodInput, strategy: CallStrategy): string {
    const description = `/** ${method.description ?? ""} */`;
    const endpoint = this.endpointBuilder.build(method.endpoint, method.analyzers.props.paths);
    const props = this.buildProps(method);
    const { inside, outside } = this.buildApiCall(method, strategy);
    const methodReturn = this.buildMethodReturn(method, strategy);
    const signature = strategy.buildSignature(method);

    return `
      ${description}
      ${signature} {

        const behavior = params?.behavior ?? new Behavior();
        const { onError, onSuccess } = behavior;

        this.loading = true;
        ${props}
        const endpoint = ${endpoint}

        ${outside}

        try {
          ${inside}
          await onSuccess?.(response);

          return ${methodReturn};
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

  private buildProps(method: CallMethodInput): string {
    const { querys, paths, cookies } = method.analyzers.props;
    const lines: string[] = [];

    if (querys.length > 0) {
      lines.push(`const { ${this.joinNames(querys)} } = params?.queryOverride ?? this.querys.bundle()`);
    }
    if (paths.length > 0) {
      lines.push(`const { ${this.joinNames(paths)} } = params?.paths ?? this.paths`);
    }
    if (cookies.length > 0) {
      lines.push(`const cookies = this.cookies`);
    }

    return lines.join("\n");
  }

  private buildApiCall(method: CallMethodInput, strategy: CallStrategy): { inside: string; outside: string } {
    const { attributeType, apiType, responseType, bodyType, hasEnumResponse } = method.analyzers.request;
    const responseTypeStr = hasEnumResponse && responseType ? responseType : method.responseTypeInterface;

    if (attributeType === "list") {
      return this.buildListCall(method, responseTypeStr, strategy);
    }
    if (attributeType === "entity") {
      return this.buildEntityCall(method, responseTypeStr, strategy);
    }
    if (apiType === "post" || apiType === "put" || apiType === "patch") {
      return this.buildFormCall(method, responseTypeStr, bodyType, strategy);
    }
    if (apiType === "delete") {
      return this.buildDeleteCall(method, responseTypeStr, bodyType, strategy);
    }
    return { inside: "", outside: "" };
  }

  private buildListCall(method: CallMethodInput, responseType: string, strategy: CallStrategy): { inside: string; outside: string } {
    const querys = this.joinNames(method.analyzers.props.querys);
    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        queryData: { ${querys} }
      })
      ${strategy.listStateAccess(method)} = ${method.analyzers.request.responseType}.from(response.data);
      this.totalPages = response.totalPages;
    `;
    return { inside, outside: "" };
  }

  private buildEntityCall(method: CallMethodInput, responseType: string, strategy: CallStrategy): { inside: string; outside: string } {
    const rType = method.analyzers.request.responseType;
    const isPrimitive = method.analyzers.request.isPrimitiveResponse;
    const querys = this.buildQuerys(method.analyzers.props.querys);

    const assignment = rType && !isPrimitive
      ? `${strategy.entityStateAccess(method)} = new ${rType}({ data: response })`
      : "";

    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        ${querys}
      })

      ${assignment}
    `;
    return { inside, outside: "" };
  }

  private buildFormCall(
    method: CallMethodInput,
    responseType: string,
    bodyType: string | undefined,
    strategy: CallStrategy,
  ): { inside: string; outside: string } {
    const { apiType } = method.analyzers.request;
    const hasHeaders = method.analyzers.props.headers.length > 0;
    const hasData = !!bodyType;

    const outside: string[] = [];
    if (hasData) {
      outside.push(`const data = ${strategy.formStateAccess(method)}.bundle()`);
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

  private buildDeleteCall(
    method: CallMethodInput,
    responseType: string,
    bodyType: string | undefined,
    strategy: CallStrategy,
  ): { inside: string; outside: string } {
    const hasData = !!bodyType;
    const outside = hasData ? `const data = ${strategy.formStateAccess(method)}.bundle()` : "";

    const inside = `
      const response = await api.delete<${responseType}, unknown>({
        endpoint,
        ${hasData ? "data," : ""}
      })
    `;
    return { inside, outside };
  }

  private buildMethodReturn(method: CallMethodInput, strategy: CallStrategy): string {
    const { attributeType, responseType, hasEnumResponse, isPrimitiveResponse } = method.analyzers.request;

    if (attributeType === "list") return strategy.listStateAccess(method);
    if (!responseType) return "null";
    if (hasEnumResponse) return "response.data";
    if (isPrimitiveResponse) return "response";
    return `new ${responseType}({ data: response })`;
  }

  private joinNames(props: AttributeProp[]): string {
    return props.map((x) => x.name).join(", ");
  }

  private buildQuerys(querys: AttributeProp[]): string {
    if (querys.length === 0) return "";
    return `queryData: {${querys.map((q) => q.name).join(",")}}`;
  }
}
