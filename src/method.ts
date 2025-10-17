import { Request } from "./request.js";
import { ZodProperty } from "./property.js";
import type { ReflectorOperation, ReflectorParamType } from "./types/types.js";
import { createDangerMessage } from "./helpers.js";

export class Method {
  name: string;
  zodProperties: ZodProperty[];
  description: string | undefined;

  request: Request;

  constructor(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation } = params;

    this.request = new Request(operation);
    this.description = operation.description;

    this.name = operation.operationId?.split("_")[1] ?? this.request.apiType;

    const { parameters } = this.getParams(params);
    this.zodProperties = parameters;
  }

  private getParams(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation } = params;

    if (!operation.parameters || operation.parameters?.length === 0) {
      return { parameters: [] };
    }

    const parameters: ZodProperty[] = [];

    operation.parameters.forEach((object) => {
      if ("$ref" in object) return;
      if (!object.schema) return;

      const { required, name, description, schema } = object;

      if ("$ref" in schema) return;

      return parameters.push(
        new ZodProperty({
          name,
          example: schema.default,
          schemaObject: schema,
          type: schema.type as ReflectorParamType,
          description,
          required: required || true,
        })
      );
    });

    return { parameters };
  }

  private buildCallMethod() {
    const afterResponse: string[] = [];
    const beforeResponse: string[] = [];

    const props = this.zodProperties.map((x) => x.name).join(",");

    const parameters = `
      const bundle = repo.intercept.bundle(this.parameters)
      const {${props}} = bundle
    `;
    const query = `
      queryData: {${props}}
    `;

    if (this.request.apiType === "get") {
      if (this.zodProperties.length > 0) {
        afterResponse.push(parameters);
        beforeResponse.push(`\n`);
      }

      if (this.request.attributeType === "list") {
        beforeResponse.push(`const {data, ...params} = response`);
        beforeResponse.push("\n\n");
        beforeResponse.push(`this.list = data`);
        beforeResponse.push(`repo.intercept.rebuild(this.parameters, params)`);
      } else if (this.request.attributeType === "entity") {
        beforeResponse.push(`this.entity = response`);
      }

      return `
      ${afterResponse.join(";")}
        const response = await repo.api.get<${this.request.responseType}, unknown>({
          endpoint: this.endpoint, ${query}
        })
        ${beforeResponse.join(";")}

        return response
      `;
    } else if (this.request.apiType === "post" || this.request.apiType === "put") {
      let data = "";
      if (this.request.bodyType) {
        data = `const data = repo.intercept.bundle(this.forms.${this.name})`;
      }
      return `
        ${data}

        const response = await repo.api.post<${this.request.responseType}>({
          endpoint: this.endpoint,
          ${data ? "data" : ""}
        })

        return response
      `;
    } else if (this.request.apiType === "delete") {
      const props = this.zodProperties.map((x) => x.name).join(",");

      return `
        const {${props}} = this.parameters

        const response = await repo.api.delete<${this.request.responseType}, unknown>({
          endpoint: this.endpoint, ${query}
        })

        this.clear()
        return response
      `;
    }

    return "";
  }

  private buildDescription() {
    return `/** ${this.description ?? ""} */`;
  }

  build() {
    const content = this.buildCallMethod();
    if (!content) return;
    if (this.name === "list") this.name = "listAll";
    const hasProprierties = this.zodProperties.length > 0;

    if (!hasProprierties && this.request.apiType === "delete") {
      createDangerMessage(`${this.name} não vai funcionar, pois não aceita parâmetros na requisição.`);
    }

    return `
      ${this.buildDescription()}
      async ${this.name}() {
        ${content}
      }
    `;
  }
}
