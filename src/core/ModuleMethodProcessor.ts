import type { Method } from "../method.js";
import type { AttributeProp } from "../types/types.js";
import { capitalizeFirstLetter, createDangerMessage, treatByUppercase } from "../helpers/helpers.js";
import type { PrimitiveProp } from "../props/primitive.property.js";
import type { ModuleImports } from "./ModuleImports.js";
import type { Form } from "./ModuleConstructorBuilder.js";

export { type Form };

export interface ProcessedMethods {
  buildedMethods: string[];
  entries: Set<string>;
  form: Form[];
  formSet: Set<string>;
  methodsAttributes: string[];
  methodsClear: string[];
  methodsInit: string[];
  headers: PrimitiveProp[];
  cookies: PrimitiveProp[];
  paths: PrimitiveProp[];
  querys: AttributeProp[];
}

export class ModuleMethodProcessor {
  private readonly imports: ModuleImports;

  constructor(params: { imports: ModuleImports }) {
    this.imports = params.imports;
  }

  process(params: { methods: Method[] }): ProcessedMethods {
    const { methods } = params;

    const methodsAttributes = new Set<string>();
    const methodsInit = new Set<string>([]);
    const methodsClear = new Set<string>([]);

    const form: Form[] = [];
    const formSet = new Set<string>();
    const entries = new Set<string>();
    const buildedMethods: string[] = [];

    const queryMap = new Map<string, AttributeProp>();
    const headerMap = new Map<string, PrimitiveProp>();
    const pathMap = new Map<string, PrimitiveProp>();
    const cookieMap = new Map<string, PrimitiveProp>();

    for (const method of methods) {
      const { request, headers, cookies, paths, querys } = method;
      const { bodyType, responseType, attributeType } = request;

      headers.forEach((h) => headerMap.set(h.name, h));
      cookies.forEach((c) => cookieMap.set(c.name, c));
      paths.forEach((p) => pathMap.set(p.name, p));
      querys.forEach((q) => queryMap.set(q.name, q));

      if (method.request.bodyType === "string") {
        createDangerMessage(`Metodo ${method.name} foi ignorado por possuir um body inválido.`);
        continue;
      }

      if (attributeType === "form" && bodyType) {
        const name = method.name;
        const type = bodyType;

        form.push({ name, type });
        formSet.add(`${name}: new ${type}()`);
        this.imports.addReflectorImport("isFormValid");
      }

      buildedMethods.push(method.build());

      if (attributeType === "entity") {
        const entityName = treatByUppercase(method.request.responseType ?? "");
        methodsAttributes.add(`${entityName} = $state<${responseType} | undefined>()`);
        methodsInit.add(`this.clear${capitalizeFirstLetter(entityName)}()`);
        methodsClear.add(`clear${capitalizeFirstLetter(entityName)}() { this.${entityName} = undefined }`);
      } else if (attributeType === "list") {
        methodsAttributes.add(`list = $state<${responseType}['data']>([])`);
        this.imports.addReflectorImport("genericArrayBundler");
        methodsAttributes.add(`bundledList = $derived(genericArrayBundler(this.list))`);
        methodsInit.add("this.clearList()");
        methodsClear.add(`clearList() { this.list = [] }`);
      }

      if (bodyType) {
        entries.add(bodyType);
      }

      if (responseType) {
        entries.add(`type ${responseType}Interface`);
        entries.add(responseType);
      }
    }

    return {
      form,
      formSet,
      entries,
      buildedMethods,
      methodsAttributes: Array.from(methodsAttributes),
      methodsInit: Array.from(methodsInit),
      methodsClear: Array.from(methodsClear),
      headers: Array.from(headerMap.values()),
      cookies: Array.from(cookieMap.values()),
      paths: Array.from(pathMap.values()),
      querys: Array.from(queryMap.values()),
    };
  }
}
