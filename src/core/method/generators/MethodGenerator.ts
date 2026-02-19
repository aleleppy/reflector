import type { Method } from "../Method.js";
import { MethodEndpointBuilder } from "../MethodEndpointBuilder.js";
import { MethodApiCallBuilder } from "./MethodApiCallBuilder.js";
import { MethodPropsBuilder } from "./MethodPropsBuilder.js";

export class MethodGenerator {
  private readonly endpointBuilder = new MethodEndpointBuilder();
  private readonly apiCallBuilder = new MethodApiCallBuilder();
  private readonly propsBuilder = new MethodPropsBuilder();

  generate(method: Method): string {
    const description = this.buildDescription(method);
    const endpoint = this.endpointBuilder.build(method.endpoint, method.analyzers.props.paths);
    const { inside, outside } = this.apiCallBuilder.build(method);
    const props = this.propsBuilder.build(method);
    const methodReturn = this.buildMethodReturn(method);
    const additionalMethod = this.buildAdditionalMethod(method);

    return `
      ${description}
      async ${method.name}(behavior: Behavior<${method.responseTypeInterface}, ApiErrorResponse> = new Behavior()) {
        const {onError, onSuccess} = behavior

        this.loading = true
        ${props}
        const endpoint = ${endpoint}

        ${outside}

        try {
          ${inside}
          await onSuccess?.(response)

          return ${methodReturn}
        } catch(e) {
          const parsedError = JSON.parse((e as Error).message) as ApiErrorResponse;
          return await onError?.(parsedError);
        } finally {
          this.loading = false
        }
      }

      ${additionalMethod}
    `.trim();
  }

  private buildDescription(method: Method): string {
    return `/** ${method.description ?? ""} */`;
  }

  private buildMethodReturn(method: Method): string {
    const { attributeType, responseType, hasEnumResponse } = method.analyzers.request;

    if (attributeType === "list") {
      return "this.list";
    }

    if (!responseType) {
      return "null";
    }

    if (hasEnumResponse) {
      return "response.data";
    }

    return `new ${responseType}({ data: response })`;
  }

  private buildAdditionalMethod(method: Method): string {
    const { attributeType } = method.analyzers.request;

    if (attributeType !== "form") {
      return "";
    }

    return `
      async ${method.name}AndClear(behavior: Behavior = new Behavior()) {
        const data = await this.${method.name}(behavior)

        if (data) {
          this.clearForms()
        }

        return data
      }
    `;
  }
}
