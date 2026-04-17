import type { Method } from "../../method.js";
import { capitalizeFirstLetter, createDangerMessage, treatByUppercase } from "../../helpers/helpers.js";
import type { ModuleImports } from "../module/ModuleImports.js";
import type { ModuleClassBuilder } from "../module/ModuleClassBuilder.js";
import { ApiMethodGenerator } from "./ApiMethodGenerator.js";
import { ApiParamProcessor } from "./ApiParamProcessor.js";

export interface ApiEndpointBlock {
  paramCode: string;
  classCode: string;
  schemaEntries: Set<string>;
}

export class ApiClassBuilder {
  private readonly imports: ModuleImports;
  private readonly methodGenerator = new ApiMethodGenerator();
  private readonly paramProcessor: ApiParamProcessor;

  constructor(params: { imports: ModuleImports; classBuilder: ModuleClassBuilder }) {
    this.imports = params.imports;
    this.paramProcessor = new ApiParamProcessor({
      imports: params.imports,
      classBuilder: params.classBuilder,
    });
  }

  build(params: { method: Method }): ApiEndpointBlock | null {
    const { method } = params;

    if (this.shouldSkipMethod(method)) return null;

    const { request, headers, cookies, paths, querys } = method;
    const { bodyType, responseType, attributeType, isPrimitiveResponse } = request;

    // Process per-endpoint params
    const processedParams = this.paramProcessor.process({
      methodName: capitalizeFirstLetter(method.name),
      querys,
      paths,
      headers,
      cookies,
    });

    // Build state properties
    const stateProps = this.buildStateProperties(method);

    // Build the call method
    const callMethod = this.methodGenerator.generate(method);

    // Build reset method
    const resetLines = this.buildResetLines(method, processedParams.paramReset);

    // Collect schema entries
    const schemaEntries = new Set<string>();
    if (bodyType) {
      schemaEntries.add(bodyType);
    }
    if (responseType && responseType !== "response" && !isPrimitiveResponse) {
      schemaEntries.add(`type ${responseType}Interface`);
      schemaEntries.add(responseType);
    }

    // Handle form imports
    if (attributeType === "form" && bodyType) {
      this.imports.addReflectorImport("isFormValid");
    }

    // Handle list imports
    if (attributeType === "list") {
      this.imports.addReflectorImport("genericArrayBundler");
    }

    const className = capitalizeFirstLetter(method.name);

    const classCode = `
      export class ${className} {
        ${stateProps.join(";")}
        ${processedParams.paramAttributes.map((a) => `${a};`).join("\n        ")}

        ${callMethod}

        reset() {
          ${resetLines.join(";")}
        }
      }
    `;

    const paramCode = processedParams.paramClasses.join("\n");

    return { paramCode, classCode, schemaEntries };
  }

  private buildStateProperties(method: Method): string[] {
    const { attributeType, responseType, bodyType, isPrimitiveResponse } = method.request;
    const props: string[] = ["loading = $state<boolean>(false)"];

    if (attributeType === "form" && bodyType) {
      // For form endpoints, the form IS the data
      props.push(`form = new ${bodyType}()`);
    } else if (attributeType === "list") {
      props.push(`data = $state<${responseType}['data']>([])`);
      props.push("totalPages = $state<number>(1)");
    } else if (attributeType === "entity" && responseType && !isPrimitiveResponse) {
      props.push(`data = $state<${responseType} | undefined>()`);
    } else {
      props.push("data = $state<unknown>(undefined)");
    }

    return props;
  }

  private buildResetLines(method: Method, paramReset: string[]): string[] {
    const { attributeType, bodyType } = method.request;
    const lines: string[] = [];

    if (attributeType === "form" && bodyType) {
      lines.push(`this.form = new ${bodyType}()`);
    } else if (attributeType === "list") {
      lines.push("this.data = []");
      lines.push("this.totalPages = 1");
    } else {
      lines.push("this.data = undefined");
    }

    lines.push(...paramReset);

    return lines;
  }

  private shouldSkipMethod(method: Method): boolean {
    const { bodyType, responseType, attributeType } = method.request;

    if (bodyType === "string") {
      createDangerMessage(`Method ${method.name} was skipped because it has an invalid body.`);
      return true;
    }

    const isNullResponse = !responseType || responseType === "null";
    if ((attributeType === "entity" || attributeType === "list") && isNullResponse) {
      createDangerMessage(`Method ${method.name} was skipped because it has a null response.`);
      return true;
    }

    const endpointParams = [...method.endpoint.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).filter(Boolean);
    if (endpointParams.length > 0) {
      const declaredPaths = new Set(method.paths.map((p) => p.name));
      const undeclared = endpointParams.filter((p) => !declaredPaths.has(p));

      if (undeclared.length > 0) {
        createDangerMessage(
          `Method ${method.name} was skipped because it has undeclared path params: ${undeclared.join(", ")}`,
        );
        return true;
      }
    }

    return false;
  }
}
