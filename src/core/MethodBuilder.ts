import type { ReflectorOperation } from "../types/types.js";
import { Method, type MethodAnalyzers } from "./Method.js";
import { MethodRequestAnalyzer } from "./MethodRequestAnalyzer.js";
import { MethodResponseAnalyzer } from "./MethodResponseAnalyzer.js";
import { MethodApiTypeAnalyzer } from "./MethodApiTypeAnalyzer.js";
import { MethodBodyAnalyzer } from "./MethodBodyAnalyzer.js";

export class MethodBuilder {
  private requestAnalyzer = new MethodRequestAnalyzer();
  private responseAnalyzer = new MethodResponseAnalyzer();
  private apiTypeAnalyzer = new MethodApiTypeAnalyzer();
  private bodyAnalyzer = new MethodBodyAnalyzer();

  build(operation: ReflectorOperation, moduleName: string): Method {
    const name = this.extractName(operation);
    const description = operation.description ?? operation.summary;
    const { apiType, attributeType } = this.apiTypeAnalyzer.analyze(operation);

    this.requestAnalyzer.analyze(operation, moduleName);
    this.responseAnalyzer.analyze(operation.responses);
    const bodyType = this.bodyAnalyzer.analyze(operation);

    const props = this.requestAnalyzer.getProps();
    const analyzers: MethodAnalyzers = {
      request: {
        bodyType,
        responseType: this.responseAnalyzer.responseType,
        attributeType,
        apiType,
        parameters: this.requestAnalyzer.paths,
        hasEnumResponse: this.responseAnalyzer.hasEnumResponse
      },
      props
    };

    const responseTypeInterface = this.buildResponseTypeInterface(analyzers.request.responseType);

    return new Method({
      name,
      endpoint: operation.endpoint,
      apiType,
      attributeType,
      description,
      analyzers,
      responseTypeInterface
    });
  }

  private extractName(operation: ReflectorOperation): string {
    const extracted = operation.operationId?.split("_")[1];
    if (extracted === "list") return "listAll";
    return extracted ?? this.apiTypeAnalyzer.analyze(operation).apiType;
  }

  private buildResponseTypeInterface(responseType: string | null): string {
    return responseType ? `${responseType}Interface` : "null";
  }
}
