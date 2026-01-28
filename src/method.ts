import { Request } from "./request.js";

import type { ReflectorOperation, ReflectorParamType } from "./types/types.js";
import { createDangerMessage, getFullEndpoint, treatByUppercase } from "./helpers/helpers.js";
import { PrimitiveProp } from "./primitive-property.js";

export class Method {
  name: string;
  // zodProperties: Property[];
  description: string | undefined;
  endpoint: string;

  request: Request;

  paths: PrimitiveProp[] = [];
  headers: PrimitiveProp[] = [];
  querys: PrimitiveProp[] = [];
  cookies: PrimitiveProp[] = [];

  constructor(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation } = params;

    this.request = new Request(operation);

    this.description = operation.description ?? operation.summary;
    this.endpoint = operation.endpoint;

    this.name = operation.operationId?.split("_")[1] ?? this.request.apiType;

    this.buildProps(params);
  }

  private buildProps(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation } = params;

    if (!operation.parameters || operation.parameters?.length === 0) return;

    for (const object of operation.parameters) {
      if ("$ref" in object) continue;
      if (!object.schema) continue;

      const { required, name, description, schema, in: inParam } = object;

      if ("$ref" in schema) continue;

      const properties = { name, required: !!required, schemaObject: schema, validator: undefined };

      if (inParam === "query") {
        this.querys.push(new PrimitiveProp(properties));
      } else if (inParam === "header") {
        this.headers.push(new PrimitiveProp(properties));
      } else if (inParam === "path") {
        this.paths.push(new PrimitiveProp(properties));
      } else if (inParam === "cookie") {
        this.paths.push(new PrimitiveProp(properties));
      }
    }
  }

  private readonly gee = (props: PrimitiveProp[]) => {
    return props.map((x) => x.name).join(",");
  };

  private getProps() {
    const headers = this.gee(this.headers);
    const querys = this.gee(this.querys);
    const paths = this.gee(this.paths);
    const cookies = this.gee(this.cookies);

    return `
      ${querys.length > 0 ? `const {${querys}} = this.querys.bundle()` : ""};
      ${paths.length > 0 ? `const {${paths}} = this.paths.bundle()` : ""};
      ${cookies.length > 0 ? `const {${cookies}} = this.cookies.bundle()` : ""};
    `;
  }

  private buildCallMethod(): { inside: string; outside: string } {
    const beforeResponse: string[] = [];

    // const props = this.getProps();

    if (this.request.apiType === "get") {
      if (this.request.attributeType === "list") {
        beforeResponse.push(`const {data: { data }} = response`, "\n\n", `this.list = data`);

        const inside = `
          const response = await repo.api.get<{data: ${this.request.responseType}Interface}, unknown>({
            endpoint,
            queryData: { ${this.gee(this.querys)} }
          })
          ${beforeResponse.join(";")}
        `;

        return { inside, outside: "" };
      } else if (this.request.attributeType === "entity") {
        const entityName = treatByUppercase(this.request.responseType);

        beforeResponse.push(`this.${entityName} = new ${this.request.responseType}(response)`);

        const inside = `
          const response = await repo.api.get<${this.request.responseType}Interface, unknown>({
            endpoint,
          })
          ${beforeResponse.join(";")}
        `;

        return { inside, outside: "" };
      }
    } else if (this.request.apiType === "post" || this.request.apiType === "put" || this.request.apiType === "patch") {
      let data;
      let headers;

      if (this.request.bodyType) {
        data = `const data = this.forms.${this.name}.bundle()`;
      }

      const hasHeaders = this.request.parameters.some((p) => p.in === "header");
      const hasData = this.request.bodyType;

      if (hasHeaders) {
        headers = `const headers = this.headers.bundle()`;
      }

      const outside = ["this.loading = true", data, headers].join("\n");

      const inside = `
        const response = await repo.api.${this.request.apiType}<${this.request.responseType}Interface>({
          endpoint,
          ${hasData ? "data," : ""}
          ${hasHeaders ? "headers," : ""}
        })
      `;

      return { outside, inside };
    } else if (this.request.apiType === "delete") {
      const diamond = this.request.responseType ? `${this.request.responseType}Interface` : "null";

      const inside = `
        const response = await repo.api.delete<${diamond}, unknown>({
          endpoint,
        })
      `;

      const outside = "";

      return { inside, outside };
    }

    return { inside: "", outside: "" };
  }

  build() {
    const { inside, outside } = this.buildCallMethod();

    if (this.name === "list") this.name = "listAll";

    const hasProprierties = this.querys.length > 0;

    if (!hasProprierties && this.request.apiType === "delete") {
      createDangerMessage(`${this.name} não vai funcionar, pois não aceita parâmetros na requisição.`);
    }

    const description = this.buildDescription();

    const a = "`";

    return `
      ${description}
      async ${this.name}(behavior: Behavior = new Behavior()) {
        const {onError, onSuccess} = behavior
        ${this.getProps()}
        const endpoint = ${a}${getFullEndpoint(this.endpoint)}${a}

        ${outside}

        try{
          ${inside}
          onSuccess?.()

          return new ${this.request.responseType}(response)
        } catch(e) {
          onError?.(e)
        } finally {
          this.loading = false
        }
      }
    `;
  }

  private buildDescription() {
    return `/** ${this.description ?? ""} */`;
  }
}
