import type { Method } from "../Method.js";
import { treatByUppercase } from "../../../helpers/helpers.js";
import type { AttributeProp } from "../../../types/types.js";

export class MethodApiCallBuilder {
  build(method: Method): { inside: string; outside: string } {
    const { attributeType, apiType, responseType, bodyType, hasEnumResponse } = method.analyzers.request;
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
    const querys = this.joinProps(method.analyzers.props.querys);
    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        queryData: { ${querys} }
      })
      this.list = ${method.analyzers.request.responseType}.from(response.data)
    `;
    return { inside, outside: "" };
  }

  private buildEntityCall(method: Method, responseType: string): { inside: string; outside: string } {
    const querys = this.buildQuerys(method.analyzers.props.querys);
    const entityName = treatByUppercase(method.analyzers.request.responseType ?? "");

    const inside = `
      const response = await api.get<${responseType}, unknown>({
        endpoint,
        ${querys}
      })
      this.${entityName} = new ${method.analyzers.request.responseType}({ data: response })
    `;
    return { inside, outside: "" };
  }

  private buildFormCall(method: Method, responseType: string, bodyType?: string): { inside: string; outside: string } {
    const { apiType } = method.analyzers.request;
    const hasHeaders = method.analyzers.props.headers.length > 0;
    const hasData = !!bodyType;

    const outside: string[] = [];
    if (hasData) {
      outside.push(`const data = this.forms.${method.name}.bundle()`);
      outside.push(`if (!isFormValid(this.forms.${method.name})) return`);
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

  private joinProps(props: AttributeProp[]): string {
    return props.map((x) => x.name).join(",");
  }

  private buildQuerys(querys: AttributeProp[]): string {
    if (querys.length === 0) return "";
    return `queryData: {${querys.map((q) => q.name).join(",")}}`;
  }
}
