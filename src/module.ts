import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter, createDangerMessage, treatByUppercase } from "./helpers/helpers.js";
import { Method } from "./method.js";
import type { AttributeProp, ParamType, ReflectorOperation } from "./types/types.js";
import { generatedDir } from "./vars.global.js";
import type { PrimitiveProp } from "./props/primitive.property.js";
import { ArrayProp } from "./props/array.property.js";

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

  reflectorImports: Set<string>;
  enumImports: Set<string>;
  moduleConstructor: string;

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; path: string }) {
    const { name, operations, moduleName, path } = params;
    this.moduleName = moduleName;

    this.imports = new Set([
      "// AUTO GERADO. QUEM ALTERAR GOSTA DE RAPAZES!\n",
      'import api from "$repository/api"',
      `import { PUBLIC_ENVIRONMENT } from '$env/static/public'`,
    ]);

    this.reflectorImports = new Set<string>(["Behavior"]);
    this.enumImports = new Set<string>();

    this.name = capitalizeFirstLetter(name);
    this.path = path;

    this.methods = operations.map((operation) => {
      return new Method({
        operation,
        moduleName: this.name,
      });
    });

    const allBuilded = this.masterBuilder({
      methods: this.methods,
    });

    this.moduleConstructor = this.buildConstructor(allBuilded.form);

    //sempre por último
    this.src = new Source({
      path: this.getPath(),
      data: this.buildFile(allBuilded),
    });
  }

  private buildClassProps(params: { props: AttributeProp[]; name: ParamType }) {
    const { name, props } = params;

    const bundle: string[] = [];
    const attributes: string[] = [];

    if (name === "Paths") {
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.patchBuild());
        }
      });

      this.imports.add(`import { page } from "$app/state"`);

      return `
      class ${name} {
        ${attributes.join(";")}
      }
      `;
    } else if (name === "Querys") {
      props.forEach((prop) => {
        if ("rawType" in prop) {
          attributes.push(prop.queryBuild());

          // Check if it's an enum array and add necessary imports
          if ("isEnum" in prop && prop.isEnum) {
            this.reflectorImports.add("EnumQueryBuilder");
            this.enumImports.add(String(prop.type));
          }

          bundle.push(prop.bundleBuild());
        }
      });
    } else {
      props.forEach((prop) => {
        if ("isEnum" in prop || "enumName" in prop) {
          this.enumImports.add(prop.type);
        }
        attributes.push(prop.classBuild());
      });
    }

    const bundleBuild =
      bundle.length > 0
        ? `
      bundle() {
        return {
          ${bundle.join(",")}
        }
      }
    `
        : "";

    const buildedClass = `
      class ${name} {
        ${attributes.join(";")}

        ${bundleBuild}
      }
    `;

    return [buildedClass].join(";");
  }

  private masterBuilder(params: { methods: Method[] }): {
    moduleAttributes: string[];
    moduleTypes: string[];
    moduleInit: string[];
    moduleClear: string[];
    form: Form[];
    classImports: string;
    buildedMethods: string[];
  } {
    const { methods } = params;

    const moduleAttributes = new Set<string>().add("loading = $state<boolean>(false)");
    const moduleInit = new Set<string>([]);
    const moduleClear = new Set<string>([]);

    const { buildedMethods, entries, form, formSet, methodsAttributes, methodsClear, methodsInit, ...rawParams } =
      this.processMethods({
        methods,
      });

    const { buildedParamsTypes, paramAttributes, paramClear, paramInit } = this.processParams(rawParams);

    methodsAttributes.forEach((attr) => moduleAttributes.add(attr));
    methodsClear.forEach((clear) => moduleClear.add(clear));
    methodsInit.forEach((init) => moduleInit.add(init));
    paramAttributes.forEach((attr) => moduleAttributes.add(attr));
    paramClear.forEach((clear) => moduleClear.add(clear));
    paramInit.forEach((init) => moduleInit.add(init));

    const cleanEntries = Array.from(entries).filter((x) => x != "type any");
    const classImports = cleanEntries.length > 0 ? `import { ${cleanEntries} } from '$reflector/schemas.svelte';` : "";

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
      moduleTypes: buildedParamsTypes,
      moduleInit: Array.from(moduleInit),
      moduleClear: Array.from(moduleClear),
      form,
      classImports,
      buildedMethods,
    };
  }

  private processMethods(params: { methods: Method[] }) {
    const { methods } = params;

    const methodsAttributes = new Set<string>();
    const methodsInit = new Set<string>([]);
    const methodsClear = new Set<string>([]);

    const form: Form[] = [];
    const formSet = new Set();
    const entries = new Set();
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
        this.reflectorImports.add("isFormValid");
      }

      buildedMethods.push(method.build());

      if (attributeType === "entity") {
        const entityName = treatByUppercase(method.request.responseType ?? "");
        methodsAttributes.add(`${entityName} = $state<${responseType} | undefined>()`);
        methodsInit.add(`this.clear${capitalizeFirstLetter(entityName)}()`);
        methodsClear.add(`clear${capitalizeFirstLetter(entityName)}() { this.${entityName} = undefined }`);
      } else if (attributeType === "list") {
        methodsAttributes.add(`list = $state<${responseType}['data']>([])`);

        this.reflectorImports.add("genericArrayBundler");
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
      methodsAttributes,
      methodsInit,
      methodsClear,
      headers: Array.from(headerMap.values()),
      cookies: Array.from(cookieMap.values()),
      paths: Array.from(pathMap.values()),
      querys: Array.from(queryMap.values()),
    };
  }

  private processParams(params: {
    querys: AttributeProp[];
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    cookies: PrimitiveProp[];
  }) {
    const { cookies, headers, paths, querys } = params;

    const buildedParamsTypes: string[] = [];
    const paramAttributes = new Set<string>();
    const paramInit = new Set<string>([]);
    const paramClear = new Set<string>([]);

    const getParams = (params: { name: string; props: AttributeProp[] }) => {
      const { name, props } = params;
      const capitalizedName = capitalizeFirstLetter(name) as ParamType;

      buildedParamsTypes.push(this.buildClassProps({ props, name: capitalizedName }));
      paramAttributes.add(`${name} = new ${capitalizedName}()`);
      paramInit.add(`this.clear${capitalizeFirstLetter(capitalizedName)}()`);
      paramClear.add(`clear${capitalizedName}() { this.${name} = new ${capitalizedName}() }`);
    };

    const argEntries = [
      { name: "querys", props: querys },
      { name: "headers", props: headers },
      { name: "paths", props: paths },
      { name: "cookies", props: cookies },
    ];

    for (const { name, props } of argEntries) {
      if (!props.length) continue;

      this.reflectorImports.add("QueryBuilder");

      getParams({ name, props });
    }

    // if (buildedParamsTypes.length > 0) {
    //   this.imports.add('import { validateInputs } from "$lib/sanitizers/validateFormats"');
    // }

    return { buildedParamsTypes, paramAttributes, paramInit, paramClear };
  }

  private getPath() {
    const fileName = this.path.split("/").slice(-2).join("-");
    const inPath = path.join(generatedDir, this.path);

    const outPath = path.join(inPath, `${fileName.toLowerCase()}.module.svelte.ts`);
    fs.mkdirSync(inPath, { recursive: true });

    return outPath;
  }

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
        const isEmpty = PUBLIC_ENVIRONMENT !== 'DEV' || !!params?.empty;
        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(!isEmpty) return this.forms

        return {
          ${form.map((f) => `${f.name}: new ${f.type}({ empty: true })`)}
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

    const reflectorImports = `import { ${Array.from(this.reflectorImports)}, type ApiErrorResponse } from "$reflector/reflector.svelte";`;
    const enumImports = this.enumImports.size > 0 ? `import {${Array.from(this.enumImports)} } from "$reflector/enums"` : "";

    return `
      ${Array.from(this.imports).join(";")}
      ${reflectorImports}
      ${enumImports}
      ${classImports}

      ${moduleTypes.join(";")}

      ${this.buildClass({ moduleAttributes, moduleInit, moduleClear, buildedMethods })}
    `;
  }
}
