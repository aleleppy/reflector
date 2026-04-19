import * as path from "node:path";
import { Source } from "../../file.js";
import { capitalizeFirstLetter, toKebabCase } from "../../helpers/helpers.js";
import { Method } from "../method/Method.js";
import { MethodNameDisambiguator } from "../method/MethodNameDisambiguator.js";
import type { ReflectorOperation } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";
import type { ReflectorConfig } from "../config/ReflectorConfig.js";
import { generatedDir } from "../../vars.global.js";
import {
  ModuleImports,
  ModuleMethodProcessor,
  ModuleParamProcessor,
  ModuleClassBuilder,
  ModuleConstructorBuilder,
  ModuleFileBuilder,
  ApiFileBuilder,
  ApiClassBuilder,
  type ProcessedMethods,
  type ProcessedParams,
  type ApiEndpointBlock,
} from "../index.js";

export class Module {
  readonly name: string;
  readonly path: string;
  readonly moduleName: string;
  readonly src: Source;
  readonly apiSrc: Source | null;
  readonly methods: Method[];

  /** Schema class names directly used by this module (for per-module schema generation) */
  readonly schemaClassNames: string[];

  private readonly imports: ModuleImports;
  private readonly methodProcessor: ModuleMethodProcessor;
  private readonly classBuilder: ModuleClassBuilder;
  private readonly paramProcessor: ModuleParamProcessor;
  private readonly constructorBuilder: ModuleConstructorBuilder;
  private readonly fileBuilder: ModuleFileBuilder;
  private readonly context: CodegenContext;

  private readonly config: ReflectorConfig;

  constructor(params: { name: string; moduleName: string; operations: ReflectorOperation[]; path: string; apiImport: string; experimentalFeatures?: boolean; context: CodegenContext; config: ReflectorConfig }) {
    const { name, operations, moduleName, path: modulePath, apiImport, experimentalFeatures, context, config } = params;

    this.moduleName = moduleName;
    this.name = capitalizeFirstLetter(name);
    this.path = modulePath;
    this.context = context;
    this.config = config;

    // Inicializa os gerenciadores
    this.imports = new ModuleImports(apiImport, config);
    this.classBuilder = new ModuleClassBuilder({ imports: this.imports, context });
    this.paramProcessor = new ModuleParamProcessor({
      imports: this.imports,
      classBuilder: this.classBuilder,
    });
    this.methodProcessor = new ModuleMethodProcessor({
      imports: this.imports,
    });
    this.constructorBuilder = new ModuleConstructorBuilder(config);
    this.fileBuilder = new ModuleFileBuilder({ imports: this.imports });

    // Processa os métodos
    this.methods = operations.map((operation) => Method.fromOperation(operation, this.name, context));
    MethodNameDisambiguator.apply(this.methods);
    const processedMethods = this.methodProcessor.process({ methods: this.methods });

    // Processa os parâmetros
    const processedParams = this.paramProcessor.process({
      querys: processedMethods.querys,
      paths: processedMethods.paths,
      headers: processedMethods.headers,
      cookies: processedMethods.cookies,
    });

    // Extract schema class names for per-module schema generation
    this.schemaClassNames = Array.from(processedMethods.entries)
      .filter((e) => e !== "type any" && !e.startsWith("type "));

    // Monta o resultado final
    const allBuilded = this.buildModuleData(processedMethods, processedParams);
    const moduleConstructor = this.constructorBuilder.build(allBuilded.form);

    // Cria o arquivo fonte
    this.src = new Source({
      path: this.getOutputPath("module"),
      data: this.fileBuilder.build({
        ...allBuilded,
        moduleConstructor,
        moduleName: this.name,
      }),
    });

    // Cria o arquivo Api (apenas com experimentalFeatures)
    this.apiSrc = experimentalFeatures ? this.buildApiFile(apiImport) : null;
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
    const kebabName = toKebabCase(this.name);
    const classImports = cleanEntries.length > 0 ? `import { ${cleanEntries.join(", ")} } from './${kebabName}.schema.svelte';` : "";

    // Adiciona suporte a forms
    if (formSet.size > 0) {
      moduleAttributes.add(`
        forms = $state({
          ${Array.from(formSet).join(",\n          ")}
        })
      `);
      moduleInit.add("this.clearForms()");
      moduleClear.add(`
        protected clearForms() { this.forms = this.buildForms(true) }
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

  private buildApiFile(apiImport: string): Source {
    const apiImports = new ModuleImports(apiImport, this.config);
    apiImports.addReflectorImport("ApiCallParams");
    const apiClassBuilderDep = new ModuleClassBuilder({ imports: apiImports, context: this.context });
    const apiClassBuilder = new ApiClassBuilder({ imports: apiImports, classBuilder: apiClassBuilderDep });
    const apiFileBuilder = new ApiFileBuilder({ imports: apiImports });

    const endpointBlocks: ApiEndpointBlock[] = [];
    const apiSchemaEntries = new Set<string>();

    for (const method of this.methods) {
      const block = apiClassBuilder.build({ method });
      if (!block) continue;

      endpointBlocks.push(block);
      block.schemaEntries.forEach((e) => apiSchemaEntries.add(e));
    }

    const cleanEntries = Array.from(apiSchemaEntries).filter((x) => x !== "type any");
    const kebabName = toKebabCase(this.name);
    const classImports = cleanEntries.length > 0
      ? `import { ${cleanEntries.join(", ")} } from './${kebabName}.schema.svelte';`
      : "";

    return new Source({
      path: this.getOutputPath("api"),
      data: apiFileBuilder.build({ endpointBlocks, classImports }),
    });
  }

  private getOutputPath(suffix: "module" | "api"): string {
    const kebabName = toKebabCase(this.name);
    return path.join(generatedDir, "controllers", kebabName, `${kebabName}.${suffix}.svelte.ts`);
  }
}
