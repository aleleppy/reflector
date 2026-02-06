import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter, createDangerMessage, treatByUppercase } from "./helpers/helpers.js";
import { Method } from "./method.js";
import type { ReflectorOperation } from "./types/types.js";
import { generatedDir } from "./vars.global.js";
import type { PrimitiveProp } from "./primitive-property.js";

interface Form {
  name: string;
  type: string;
}

export class Module {
  readonly name: string;
  readonly path: string;
  readonly moduleName: string;

  readonly src: Source;

  imports: Set<string>;
  methods: Method[];

  moduleConstructor: string;

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; path: string }) {
    const { name, operations, moduleName, path } = params;
    this.moduleName = moduleName;

    this.imports = new Set([
      "// AUTO GERADO. QUEM ALTERAR GOSTA DE RAPAZES!\n",
      'import repo from "$repository/main"',
      'import { Behavior, build, BuildedInput } from "$reflector/reflector.svelte";',
    ]);

    this.name = capitalizeFirstLetter(name);
    this.path = path;

    this.methods = operations.map((operation) => {
      return new Method({
        operation,
        moduleName: this.name,
      });
    });

    const { cookies, headers, paths, querys } = this.getParameters();

    const allBuilded = this.creator({
      cookies,
      headers,
      paths,
      querys,
    });

    this.moduleConstructor = this.buildConstructor(allBuilded.form);

    //sempre por último
    this.src = new Source({
      path: this.getPath(),
      data: this.buildFile(allBuilded),
    });
  }

  private buildClassProps(params: { props: PrimitiveProp[]; name: string }) {
    const { name, props } = params;

    const bundle: string[] = [];
    const attributes: string[] = [];
    const constructorThis: string[] = [];
    const interfaceBuild: string[] = [];

    props.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      bundle.push(prop.bundleBuild());
      attributes.push(prop.classBuild());
      interfaceBuild.push(prop.interfaceBuild());
    });

    const buildedInterface = `
      interface ${name}Interface {
        ${interfaceBuild.join(";")}
      }
    `;

    const buildedClass = `
      class ${name} {
        ${attributes.join(";")}

        constructor(params?: ${name}Interface){
          ${constructorThis.join(";")}
        }

        bundle(){
          return { ${bundle.join(",")} }
        }
      }

    `;

    return [buildedInterface, buildedClass].join(";");
  }

  private buildMethod(params: { hasForm: boolean; hasEntity: boolean; method: Method }): string {
    const { hasEntity, hasForm, method } = params;

    const canAddClearMethod = hasForm && hasEntity;
    let additionalMethod = this.getAdditionalMethod({ canAddClearMethod, method });

    return [method.build(), additionalMethod].join("\n");
  }

  private creator(params: {
    querys: PrimitiveProp[];
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    cookies: PrimitiveProp[];
  }): {
    moduleAttributes: string[];
    moduleTypes: string[];
    moduleInit: string[];
    moduleClear: string[];
    form: Form[];
    classImports: string;
    buildedMethods: string[];
  } {
    const { cookies, headers, paths, querys } = params;

    const buildedModuleTypes: string[] = [];

    const moduleAttributes = new Set<string>().add("loading = $state<boolean>(false)");
    const moduleInit = new Set<string>([]);
    const moduleClear = new Set<string>([]);

    const getParams = (params: { name: string; props: PrimitiveProp[] }) => {
      const { name, props } = params;
      const capitalizedName = capitalizeFirstLetter(name);

      buildedModuleTypes.push(this.buildClassProps({ props, name: capitalizedName }));
      moduleAttributes.add(`${name} = $state(new ${capitalizedName}())`);
      moduleInit.add(`this.clear${capitalizeFirstLetter(capitalizedName)}()`);
      moduleClear.add(`clear${capitalizedName}() { this.${name} = new ${capitalizedName}() }`);
    };

    const argEntries = [
      { name: "querys", props: querys },
      { name: "headers", props: headers },
      { name: "paths", props: paths },
      { name: "cookies", props: cookies },
    ];

    for (const { name, props } of argEntries) {
      if (!props.length) continue;
      getParams({ name, props });
    }

    const hasForm = this.methods.some((m) => m.request.attributeType === "form");
    const hasEntity = this.methods.some((m) => m.request.attributeType === "entity");

    const form: Form[] = [];
    const formSet = new Set();
    const entries = new Set();
    const methods: string[] = [];

    for (const method of this.methods) {
      const { bodyType, responseType, attributeType } = method.request;

      if (method.request.bodyType === "string") {
        createDangerMessage(`Metodo ${method.name} foi ignorado por possuir um body inválido.`);
        continue;
      }

      if (attributeType === "form" && bodyType) {
        const name = method.name;
        const type = bodyType;

        form.push({ name, type });
        formSet.add(`${name}: new ${type}()`);
      }

      methods.push(this.buildMethod({ hasEntity, hasForm, method }));

      if (attributeType === "entity") {
        const entityName = treatByUppercase(method.request.responseType ?? "");
        moduleAttributes.add(`${entityName} = $state<${responseType} | undefined>()`);
        moduleInit.add(`this.clear${capitalizeFirstLetter(entityName)}()`);
        moduleClear.add(`clear${capitalizeFirstLetter(entityName)}() { this.${entityName} = undefined }`);
      } else if (attributeType === "list") {
        moduleAttributes.add(`list = $state<${responseType}['data']>([])`);
        moduleInit.add("this.clearList()");
        moduleClear.add(`clearList() { this.list = [] }`);
      }

      if (bodyType) {
        entries.add(`${bodyType}`);
      }

      if (responseType) {
        entries.add(`type ${responseType}Interface`);
        entries.add(`${responseType}`);
      }
    }

    const cleanEntries = Array.from(entries).filter((x) => x != "type any");
    const classImports = `import { ${cleanEntries} } from '$reflector/schemas.svelte';`;

    if (formSet.size > 0) {
      moduleAttributes.add(`
        forms = $state({
          ${Array.from(formSet)}
        })
      `);

      moduleInit.add(`
        this.clearForms()
      `);

      moduleClear.add(`
        clearForms() { this.forms = this.buildForms(true) };
      `);
    }

    return {
      moduleAttributes: Array.from(moduleAttributes),
      moduleTypes: buildedModuleTypes,
      moduleInit: Array.from(moduleInit),
      moduleClear: Array.from(moduleClear),
      form,
      classImports,
      buildedMethods: methods,
    };
  }

  private getPath() {
    const fileName = this.path.split("/").slice(-2).join("-");
    const inPath = path.join(generatedDir, this.path);

    const outPath = path.join(inPath, `${fileName.toLowerCase()}.module.svelte.ts`);
    fs.mkdirSync(inPath, { recursive: true });

    return outPath;
  }

  private getAdditionalMethod(params: { method: Method; canAddClearMethod: boolean }) {
    const { method, canAddClearMethod } = params;
    let additionalMethod = "";

    if (canAddClearMethod && method.request.attributeType === "form") {
      additionalMethod = `
        /** Limpa o form depois do back retornar uma resposta de sucesso */
        async ${method.name}AndClear(behavior: Behavior = new Behavior()) {
          const data = await this.${method.name}(behavior)

          if (data) {
            this.clearForms()
          }

          return data
        }
      `;
    }
    return additionalMethod;
  }

  // private buildMethods() {

  // }

  private getParameters() {
    const queryMap = new Map<string, PrimitiveProp>();
    const headerMap = new Map<string, PrimitiveProp>();
    const pathMap = new Map<string, PrimitiveProp>();
    const cookieMap = new Map<string, PrimitiveProp>();

    for (const method of this.methods) {
      const { headers, cookies, paths, querys } = method;

      headers.forEach((h) => headerMap.set(h.name, h));
      cookies.forEach((c) => cookieMap.set(c.name, c));
      paths.forEach((p) => pathMap.set(p.name, p));
      querys.forEach((q) => queryMap.set(q.name, q));
    }

    return {
      headers: Array.from(headerMap.values()),
      cookies: Array.from(cookieMap.values()),
      paths: Array.from(pathMap.values()),
      querys: Array.from(queryMap.values()),
    };
  }

  // private buildImportsAndProps() {}

  // private buildImports() {

  // }

  private buildClass(params: {
    moduleAttributes: string[];
    moduleInit: string[];
    moduleClear: string[];
    buildedMethods: string[];
  }) {
    const { moduleInit, moduleAttributes, moduleClear, buildedMethods } = params;

    const reset =
      moduleAttributes.length > 1
        ? `reset() {
          ${moduleInit.join(";")}
        }`
        : "";

    return `
      export class ${this.moduleName}Module {
        ${moduleAttributes.join(";")}

        ${this.moduleConstructor}

        ${buildedMethods.join("\n")}

        ${moduleClear.join("\n\n")}

        ${reset}
      }
    `;
  }

  private buildConstructor(form: Form[]) {
    if (form.length === 0) return "";

    const teste = `
      constructor(params?: { empty: boolean }) {
        const isEmpty = params?.empty || PUBLIC_ENVIRONMENT != 'DEV'

        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(isEmpty) return this.forms

        return {
          ${form.map((f) => `${f.name}: new ${f.type}()`)}
        }
      }
    `;

    return teste;
  }

  buildFile(params: {
    moduleAttributes: string[];
    moduleTypes: string[];
    moduleInit: string[];
    moduleClear: string[];
    classImports: string;
    buildedMethods: string[];
  }) {
    const { moduleInit, moduleTypes, moduleAttributes, moduleClear, classImports, buildedMethods } = params;

    return `
      ${Array.from(this.imports).join(";")}
      ${classImports}

      const PUBLIC_ENVIRONMENT = import.meta.env.PUBLIC_ENVIRONMENT;

      ${moduleTypes.join(";")}

      ${this.buildClass({ moduleAttributes, moduleInit, moduleClear, buildedMethods })}
    `;
  }
}
