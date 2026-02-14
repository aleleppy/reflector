import type { Method } from "../method.js";

interface Form {
  name: string;
  type: string;
}

interface MethodProcessorResult {
  form: Form[];
  formSet: Set<string>;
  entries: Set<string>;
  buildedMethods: string[];
  methodsAttributes: Set<string>;
  methodsInit: Set<string>;
  methodsClear: Set<string>;
  headers: Array<{ name: string }>;
  cookies: Array<{ name: string }>;
  paths: Array<{ name: string }>;
  querys: Array<{ name: string }>;
  reflectorImports: Set<string>;
}

export class ModuleMethodProcessor {
  process(methods: Method[], moduleName: string): MethodProcessorResult {
    const methodsAttributes = new Set<string>();
    const methodsInit = new Set<string>();
    const methodsClear = new Set<string>();
    const form: Form[] = [];
    const formSet = new Set<string>();
    const entries = new Set<string>();
    const buildedMethods: string[] = [];
    const queryMap = new Map<string, { name: string }>();
    const headerMap = new Map<string, { name: string }>();
    const pathMap = new Map<string, { name: string }>();
    const cookieMap = new Map<string, { name: string }>();
    const reflectorImports = new Set<string>();

    for (const method of methods) {
      const { request, headers, cookies, paths, querys } = method;
      const { bodyType, responseType, attributeType } = request;

      headers.forEach((h) => headerMap.set(h.name, h));
      cookies.forEach((c) => cookieMap.set(c.name, c));
      paths.forEach((p) => pathMap.set(p.name, p));
      querys.forEach((q) => queryMap.set(q.name, q));

      if (method.request.bodyType === "string") continue;

      if (attributeType === "form" && bodyType) {
        form.push({ name: method.name, type: bodyType });
        formSet.add(`${method.name}: new ${bodyType}()`);
        reflectorImports.add("isFormValid");
      }

      buildedMethods.push(method.build());

      if (attributeType === "entity") {
        const entityName = this.treatByUppercase(method.request.responseType ?? "");
        methodsAttributes.add(`${entityName} = $state<${responseType} | undefined>()`);
        methodsInit.add(`this.clear${this.capitalizeFirstLetter(entityName)}()`);
        methodsClear.add(`clear${this.capitalizeFirstLetter(entityName)}() { this.${entityName} = undefined }`);
      } else if (attributeType === "list") {
        methodsAttributes.add(`list = $state<${responseType}['data']>([])`);
        reflectorImports.add("genericArrayBundler");
        methodsAttributes.add(`bundledList = $derived(genericArrayBundler(this.list))`);
        methodsInit.add("this.clearList()");
        methodsClear.add(`clearList() { this.list = [] }`);
      }

      if (bodyType) entries.add(bodyType);
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
      methodsAttributes,
      methodsInit,
      methodsClear,
      headers: Array.from(headerMap.values()),
      cookies: Array.from(cookieMap.values()),
      paths: Array.from(pathMap.values()),
      querys: Array.from(queryMap.values()),
      reflectorImports,
    };
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private treatByUppercase(str: string): string {
    return str.replace(/([A-Z])/g, "$1").trim();
  }
}
