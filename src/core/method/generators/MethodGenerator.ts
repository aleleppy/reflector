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
    // const additionalMethod = this.buildAdditionalMethod(method);
    const pathsInfo = this.propsBuilder.getPaths(method);

    const paramsType = this.buildParamsType(method, pathsInfo);

    return `
      ${description}
      protected async _${method.name}(params?: ${paramsType}) {

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

  private buildParamsType(method: Method, paramsPaths?: string): string {
    const behaviorType = `Behavior<${method.responseTypeInterface}, ApiErrorResponse>`;

    if (paramsPaths) {
      return `{
        behavior?: ${behaviorType};${paramsPaths}
      }`;
    }

    return `{
      behavior?: ${behaviorType};
    }`;
  }

  private buildDescription(method: Method): string {
    return `/** ${method.description ?? ""} */`;
  }

  private buildMethodReturn(method: Method): string {
    const { attributeType, responseType, hasEnumResponse, isPrimitiveResponse } = method.analyzers.request;

    if (attributeType === "list") {
      return "this.list";
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

  // private buildAdditionalMethod(method: Method): string {
  //   const { attributeType } = method.analyzers.request;

  //   if (attributeType !== "form") {
  //     return "";
  //   }

  //   return `
  //     async ${method.name}AndClear(behavior: Behavior = new Behavior()) {
  //       const data = await this.${method.name}({behavior})

  //       if (data) {
  //         this.clearForms()
  //       }

  //       return data
  //     }
  //   `;
  // }
}
