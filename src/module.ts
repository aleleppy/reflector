import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter, createDangerMessage } from "./helpers/helpers.js";
import { Method } from "./method.js";
import type { ReflectorOperation } from "./types/types.js";

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
  parameters: string[];
  methods: Method[];

  moduleConstructor: string;

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; path: string; dir: string }) {
    const { name, operations, path, dir, moduleName } = params;
    this.moduleName = moduleName;

    this.imports = new Set([
      "// AUTO GERADO. QUEM ALTERAR GOSTA DE RAPAZES!\n",
      'import repo from "$repository/main"',
      'import { Behavior } from "$reflector/reflector.types";',
      'import { PUBLIC_ENVIRONMENT } from "$env/static/public";',
    ]);

    this.name = capitalizeFirstLetter(name);
    this.path = path;

    const methods = operations.map((operation) => {
      return new Method({
        operation,
        moduleName: this.name,
      });
    });

    // não vão entrar metodos que não tiverem uma resposta tipada
    this.methods = methods.filter((op) => {
      const responseTypeOk = op.request.responseType;
      const propertiesOk = op.zodProperties.length > 0;

      if (op.request.apiType === "delete") return true;

      if (!responseTypeOk) {
        createDangerMessage(`Método [ ${op.name} ] do módulo [ ${this.moduleName} ] sem tipagem na resposta.`);
      }

      return responseTypeOk;
    });

    this.parameters = this.getParameters();

    const { moduleAttributes, moduleTypes, moduleInit, moduleClear, form } = this.creator();

    this.moduleConstructor = this.buildConstructor(form);

    //sempre por último
    this.src = new Source({
      path: this.getPath(dir),
      data: this.buildFile({ moduleAttributes, moduleTypes, moduleInit, moduleClear }),
    });
  }

  private creator(): {
    moduleAttributes: string[];
    moduleTypes: string[];
    moduleInit: string[];
    moduleClear: string[];
    form: Form[];
  } {
    const buildedModuleTypes: string[] = [];

    const moduleAttributes = new Set<string>().add("loading = $state<boolean>(false)");
    const moduleInit = new Set<string>([]);
    const moduleClear = new Set<string>([]);

    if (this.parameters.length > 0) {
      buildedModuleTypes.push(`const ParametersSchema = z.object({${this.parameters}})`);
      moduleAttributes.add(`parameters = $state(repo.newForm(ParametersSchema))`);
      moduleInit.add(`this.clearParameters()`);
      moduleClear.add(`clearParameters() { this.parameters = repo.newForm(ParametersSchema) }`);
    }

    const form: Form[] = [];

    for (const method of this.methods) {
      const { bodyType, responseType, attributeType } = method.request;

      if (attributeType === "form" && bodyType) {
        form.push({
          name: method.name,
          type: bodyType,
        });
      }

      if (attributeType === "entity") {
        moduleAttributes.add(`entity = $state<${responseType} | undefined>()`);
        moduleInit.add("this.clearEntity()");
        moduleClear.add(`clearEntity() { this.entity = undefined }`);
      } else if (attributeType === "list") {
        moduleAttributes.add(`list = $state<${responseType}['data']>([])`);
        moduleInit.add("this.clearList()");
        moduleClear.add(`clearList() { this.list = [] }`);
      }

      if (attributeType === "list" || this.parameters.length > 0) {
        this.imports.add(`import z from "zod";`);
      }
    }

    const formSet = new Set();

    for (const f of form) {
      formSet.add(`${f.name}: repo.newForm(Empty${f.type}Schema)`);
    }

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
    };
  }

  private getPath(dir: string) {
    const fileName = this.path.split("/").slice(-2).join("-");
    const inPath = path.join(dir, this.path);

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

  private buildMethods() {
    const hasForm = this.methods.some((m) => m.request.attributeType === "form");
    const hasEntity = this.methods.some((m) => m.request.attributeType === "entity");

    const canAddClearMethod = hasForm && hasEntity;

    return this.methods.map((method) => {
      let additionalMethod = this.getAdditionalMethod({ canAddClearMethod, method });

      return [method.build(), additionalMethod].join("\n");
    });
  }

  private getParameters() {
    const set = new Set<string>();

    for (const method of this.methods) {
      for (const param of method.zodProperties) {
        set.add(param.buildedProp);
      }
    }

    return Array.from(set);
  }

  private buildImports() {
    const entries = new Set();

    for (const method of this.methods) {
      const { bodyType, responseType, apiType } = method.request;

      if (bodyType) {
        entries.add(`${bodyType}Schema`);
        entries.add(`Empty${bodyType}Schema`);
      }

      if (responseType) {
        if (apiType === "delete") {
          entries.add(`${responseType}Schema`);
        }
        entries.add(`type ${responseType}`);
      }
    }

    const cleanEntries = Array.from(entries).filter((x) => x != "type any");
    if (cleanEntries.length === 0) return "";

    return `import { ${cleanEntries} } from '$reflector/schemas';`;
  }

  private buildClass(params: { moduleAttributes: string[]; moduleInit: string[]; moduleClear: string[] }) {
    const { moduleInit, moduleAttributes, moduleClear } = params;

    return `
      export class ${this.moduleName}Module {
        ${moduleAttributes.join(";")}

        ${this.moduleConstructor}

        ${this.buildMethods().join("\n")}

        ${moduleClear.join("\n\n")}
        
        reset() {
          ${moduleInit.join(";")}
        }
      }
    `;
  }

  private buildConstructor(form: Form[]) {
    const teste = `        
      constructor(params?: { empty: boolean }) {
        const isEmpty = params?.empty || PUBLIC_ENVIRONMENT != 'DEV'

        this.forms = this.buildForms(isEmpty);
      }

      private buildForms(isEmpty: boolean) {
        if(isEmpty) return this.forms

        return {
          ${form.map((f) => `${f.name}: repo.newForm(${f.type}Schema)`)}
        }
      }
    `;

    return teste;
  }

  buildFile(params: { moduleAttributes: string[]; moduleTypes: string[]; moduleInit: string[]; moduleClear: string[] }) {
    const { moduleInit, moduleTypes, moduleAttributes, moduleClear } = params;
    return `
      ${Array.from(this.imports).join(";")}
      ${this.buildImports()}

      ${moduleTypes.join(";")}

      ${this.buildClass({ moduleAttributes, moduleInit, moduleClear })}
    `;
  }
}
