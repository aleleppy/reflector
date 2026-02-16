import * as path from "node:path";
import * as fs from "node:fs";
import { Source } from "./file.js";
import { capitalizeFirstLetter } from "./helpers/helpers.js";
import { Method } from "./method.js";
import type { ReflectorOperation } from "./types/types.js";
import { generatedDir } from "./vars.global.js";
import {
  ModuleImports,
  ModuleMethodProcessor,
  ModuleParamProcessor,
  ModuleClassBuilder,
  ModuleConstructorBuilder,
  ModuleFileBuilder,
  type ProcessedMethods,
  type ProcessedParams,
} from "./core/index.js";

export class Module {
  readonly name: string;
  readonly path: string;
  readonly moduleName: string;
  readonly src: Source;
  readonly methods: Method[];

  private readonly imports: ModuleImports;
  private readonly methodProcessor: ModuleMethodProcessor;
  private readonly classBuilder: ModuleClassBuilder;
  private readonly paramProcessor: ModuleParamProcessor;
  private readonly constructorBuilder: ModuleConstructorBuilder;
  private readonly fileBuilder: ModuleFileBuilder;

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; path: string }) {
    const { name, operations, moduleName, path: modulePath } = params;

    this.moduleName = moduleName;
    this.name = capitalizeFirstLetter(name);
    this.path = modulePath;

    // Inicializa os gerenciadores
    this.imports = new ModuleImports();
    this.classBuilder = new ModuleClassBuilder({ imports: this.imports });
    this.paramProcessor = new ModuleParamProcessor({
      imports: this.imports,
      classBuilder: this.classBuilder,
    });
    this.methodProcessor = new ModuleMethodProcessor({
      imports: this.imports,
    });
    this.constructorBuilder = new ModuleConstructorBuilder();
    this.fileBuilder = new ModuleFileBuilder({ imports: this.imports });

    // Processa os métodos
    this.methods = operations.map((operation) => new Method({ operation, moduleName: this.name }));
    const processedMethods = this.methodProcessor.process({ methods: this.methods });

    // Processa os parâmetros
    const processedParams = this.paramProcessor.process({
      querys: processedMethods.querys,
      paths: processedMethods.paths,
      headers: processedMethods.headers,
      cookies: processedMethods.cookies,
    });

    // Monta o resultado final
    const allBuilded = this.buildModuleData(processedMethods, processedParams);
    const moduleConstructor = this.constructorBuilder.build(allBuilded.form);

    // Cria o arquivo fonte
    this.src = new Source({
      path: this.getPath(),
      data: this.fileBuilder.build({
        ...allBuilded,
        moduleConstructor,
        moduleName: this.moduleName,
      }),
    });
  }

  private buildModuleData(processedMethods: ProcessedMethods, processedParams: ProcessedParams) {
    const moduleAttributes = new Set<string>().add("loading = $state<boolean>(false)");
    const moduleInit = new Set<string>([]);
    const moduleClear = new Set<string>([]);

    const { buildedMethods, entries, form, formSet, methodsAttributes, methodsClear, methodsInit } = processedMethods;
    const { buildedParamsTypes, paramAttributes, paramClear, paramInit } = processedParams;

    // Adiciona atributos dos métodos
    methodsAttributes.forEach((attr: string) => moduleAttributes.add(attr));
    methodsClear.forEach((clear: string) => moduleClear.add(clear));
    methodsInit.forEach((init: string) => moduleInit.add(init));

    // Adiciona atributos dos parâmetros
    paramAttributes.forEach((attr: string) => moduleAttributes.add(attr));
    paramClear.forEach((clear: string) => moduleClear.add(clear));
    paramInit.forEach((init: string) => moduleInit.add(init));

    // Monta os imports de classes
    const cleanEntries = Array.from(entries).filter((x) => x != "type any");
    const classImports = cleanEntries.length > 0 ? `import { ${cleanEntries.join(", ")} } from '$reflector/schemas.svelte';` : "";

    // Adiciona suporte a forms
    if (formSet.size > 0) {
      moduleAttributes.add(`
        forms = $state({
          ${Array.from(formSet).join(",\n          ")}
        })
      `);
      moduleInit.add("this.clearForms()");
      moduleClear.add(`
        clearForms() { this.forms = this.buildForms(true) }
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

  private getPath(): string {
    const fileName = this.path.split("/").slice(-2).join("-");
    const inPath = path.join(generatedDir, this.path);
    const outPath = path.join(inPath, `${fileName.toLowerCase()}.module.svelte.ts`);
    fs.mkdirSync(inPath, { recursive: true });
    return outPath;
  }
}
