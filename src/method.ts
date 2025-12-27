import { Request } from "./request.js";
import { ZodProperty } from "./property.js";
import type { ReflectorOperation, ReflectorParamType } from "./types/types.js";
import { createDangerMessage, getEndpoint } from "./helpers/helpers.js";

export class Method {
  name: string;
  zodProperties: ZodProperty[];
  description: string | undefined;
  endpoint: string;

  request: Request;

  constructor(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation } = params;

    this.request = new Request(operation);
    this.description = operation.description ?? operation.summary;
    this.endpoint = operation.endpoint;

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

    for (const object of operation.parameters) {
      if ("$ref" in object) continue;
      if (!object.schema) continue;

      const { required, name, description, schema } = object;

      if ("$ref" in schema) continue;

      parameters.push(
        new ZodProperty({
          name,
          example: schema.default,
          schemaObject: schema,
          type: schema.type as ReflectorParamType,
          description: description ?? "",
          required: required || true,
        })
      );
    }

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
        beforeResponse.push(
          `const {data: { data }, ...params} = response`,
          "\n\n",
          `this.list = data`,
          `repo.intercept.rebuild(this.parameters, params)`
        );

        return `
          ${afterResponse.join(";")}
          const response = await repo.api.get<{data: ${this.request.responseType}}, unknown>({
            endpoint, 
            ${query}
          })
          ${beforeResponse.join(";")}
        `;
      } else if (this.request.attributeType === "entity") {
        beforeResponse.push(`this.entity = response`);

        return `
        ${afterResponse.join(";")}
          const response = await repo.api.get<${this.request.responseType}, unknown>({
            endpoint, 
            ${query}
          })
          ${beforeResponse.join(";")}
        `;
      }
    } else if (this.request.apiType === "post" || this.request.apiType === "put" || this.request.apiType === "patch") {
      let data = "";

      if (this.request.bodyType) {
        data = `const data = repo.intercept.bundle(this.forms.${this.name})`;
      }

      return `
        ${data}

        const response = await repo.api.post<${this.request.responseType}>({
          endpoint,
          ${data ? "data" : ""}
        })
      `;
    } else if (this.request.apiType === "delete") {
      const props = this.zodProperties.map((x) => x.name).join(",");
      const propsString = props.length > 0 ? `const {${props}} = this.parameters` : "";

      return `
        ${propsString}

        const response = await repo.api.delete<${this.request.responseType ?? "null"}, unknown>({
          endpoint, 
          ${query}
        })

        this.clearEntity()
      `;
    }

    return "";
  }

  private buildDescription() {
    return `/** ${this.description ?? ""} */`;
  }

  build() {
    const content = this.buildCallMethod();

    if (!content) {
      createDangerMessage(`Método ${this.name} (${this.request.apiType}) não foi gerado: buildCallMethod vazio`);
      return;
    }

    if (this.name === "list") this.name = "listAll";

    const hasProprierties = this.zodProperties.length > 0;

    if (!hasProprierties && this.request.apiType === "delete") {
      createDangerMessage(`${this.name} não vai funcionar, pois não aceita parâmetros na requisição.`);
    }

    const description = this.buildDescription();

    return `
      ${description}
      async ${this.name}(behavior: Behavior = new Behavior()) {
        const {onError, onSuccess} = behavior
        const endpoint = "${getEndpoint(this.endpoint)}"

        try{
          ${content}
          onSuccess?.()

          return response
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch(e) {
          onError?.()
        }
      }
    `;
  }
}
