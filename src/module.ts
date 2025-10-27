import path from "node:path";
import fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter, createDangerMessage, stripState } from "./helpers/helpers.js";
import { Method } from "./method.js";
import { ReflectorOperation } from "./types/types.js";

export class Module {
  readonly name: string;
  readonly endpoint: string;
  readonly moduleName: string;

  readonly src: Source;

  imports: Set<string>;
  parameters: string[];
  methods: Method[];

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; endpoint: string; dir: string }) {
    const { name, operations, endpoint, dir, moduleName } = params;
    this.moduleName = moduleName;

    this.imports = new Set(["// AUTO GERADO. QUEM ALTERAR GOSTA DE RAPAZES!\n", 'import repo from "$repository/main"']);

    this.name = capitalizeFirstLetter(name);
    this.endpoint = endpoint;

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

      if (!responseTypeOk) {
        createDangerMessage(`Método [ ${op.name} ] do módulo [ ${this.moduleName} ] sem tipagem na resposta.`);
      }

      // else if (!propertiesOk) {
      //   createDangerMessage(`Método [ ${op.name} ] do módulo [ ${this.moduleName} ] com tipagem incorreta.`);
      // }

      return responseTypeOk;
    });

    this.parameters = this.getParameters();

    const { moduleAtributes, moduleTypes } = this.creator();

    //sempre por último
    this.src = new Source({
      path: this.getPath(dir),
      data: this.buildFile(moduleAtributes, moduleTypes),
    });
  }

  private creator(): {
    moduleAtributes: string[];
    moduleTypes: string[];
  } {
    const buildedModuleTypes: string[] = [];

    const moduleAtributes = new Set([`endpoint = '${this.endpoint}'`]);

    if (this.parameters.length > 0) {
      buildedModuleTypes.push(`const ParametersSchema = z.object({${this.parameters}})`);
      moduleAtributes.add(`parameters = $state(repo.newForm(ParametersSchema))`);
    }

    const form: {
      name: string;
      type: string;
    }[] = [];

    for (const method of this.methods) {
      const { bodyType, responseType, attributeType } = method.request;

      if (attributeType === "form" && bodyType) {
        form.push({
          name: method.name,
          type: bodyType,
        });
      }

      if (attributeType === "entity") {
        moduleAtributes.add(`entity = $state<${responseType} | undefined>()`);
      } else if (attributeType === "list") {
        moduleAtributes.add(`list = $state<${responseType}[]>([])`);
      }

      if (attributeType === "list" || this.parameters.length > 0) {
        this.imports.add(`import z from "zod";`);
      }
    }
    const formSet = new Set();

    for (const f of form) {
      formSet.add(`${f.name}: repo.newForm(${f.type}Schema)`);
    }

    if (formSet.size > 0) {
      moduleAtributes.add(`
      forms = $state({
        ${Array.from(formSet)}
      })
    `);
    }

    return {
      moduleAtributes: Array.from(moduleAtributes),
      moduleTypes: buildedModuleTypes,
    };
  }

  private getPath(dir: string) {
    const fileName = this.endpoint.split("/").slice(-2).join("-");
    const inPath = path.join(dir, this.endpoint);

    const outPath = path.join(inPath, `${fileName.toLowerCase()}.module.svelte.ts`);
    fs.mkdirSync(inPath, { recursive: true });

    return outPath;
  }

  private buildMethods() {
    return this.methods.map((method) => {
      return method.build();
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

      if (bodyType) entries.add(`${bodyType}Schema`);

      if (responseType) {
        if (apiType === "delete") entries.add(`${responseType}Schema`);
        entries.add(`type ${responseType}`);
      }
    }

    const cleanEntries = Array.from(entries).filter((x) => x != "type any");
    if (cleanEntries.length === 0) return "";

    return `import { ${cleanEntries} } from '$reflector/schemas';`;
  }

  private buildClass(modulesAttributes: string[]) {
    const initAssignments = modulesAttributes.map((attr) => `this.${stripState(attr)}`).join(";");

    return `
      export class ${this.moduleName}Module {
        ${modulesAttributes.join(";")}

        ${this.buildMethods().join("\n")}

        private init() {
          ${initAssignments}
        }

        clear() {
          this.init()
        }
      }
    `;
  }

  buildFile(modulesAttributes: string[], moduleTypes: string[]) {
    return `
      ${Array.from(this.imports).join(";")}
      ${this.buildImports()}

      ${moduleTypes.join(";")}

      ${this.buildClass(modulesAttributes)}
    `;
  }
}
