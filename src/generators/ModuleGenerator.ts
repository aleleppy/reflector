import { capitalizeFirstLetter } from "../utils/StringUtils.js";
import type { Module } from "../core/Module.js";
import { ModuleFormBuilder } from "../core/ModuleFormBuilder.js";
import { ModuleStateBuilder } from "../core/ModuleStateBuilder.js";
import { ModuleMethodProcessor } from "../core/ModuleMethodProcessor.js";
import { ModuleParameterProcessor } from "../core/ModuleParameterProcessor.js";
import type { Method } from "../method.js";

export class ModuleGenerator {
  private module: Module;
  private formBuilder: ModuleFormBuilder;
  private stateBuilder: ModuleStateBuilder;
  private methodProcessor: ModuleMethodProcessor;
  private paramProcessor: ModuleParameterProcessor;

  constructor(module: Module) {
    this.module = module;
    this.formBuilder = new ModuleFormBuilder();
    this.stateBuilder = new ModuleStateBuilder();
    this.methodProcessor = new ModuleMethodProcessor();
    this.paramProcessor = new ModuleParameterProcessor();
  }

  generate(): string {
    const imports = this.buildImports();
    const reflectorImports = this.buildReflectorImports();
    const classImports = this.buildClassImports();
    const moduleTypes = this.buildModuleTypes();
    const moduleClass = this.buildModuleClass();

    return `
${imports}
${reflectorImports}
${classImports}

${moduleTypes.join(";")}

${moduleClass}
    `;
  }

  private buildImports(): string {
    return [
      'import api from "$repository/api"',
      `import { PUBLIC_ENVIRONMENT } from '$env/static/public'`,
    ].join(";");
  }

  private buildReflectorImports(): string {
    const imports = new Set<string>(["Behavior"]);
    
    if (this.module.methods.some(m => m.request.bodyType)) {
      imports.add("isFormValid");
    }

    return `import { ${Array.from(imports)}, type ApiErrorResponse } from "$reflector/reflector.svelte";`;
  }

  private buildClassImports(): string {
    const entries = new Set<string>();
    
    for (const method of this.module.methods) {
      const request = method.request;
      if (request.bodyType) {
        entries.add(request.bodyType);
      }
      if (request.responseType) {
        entries.add(`type ${request.responseType}Interface`);
        entries.add(request.responseType);
      }
    }

    const cleanEntries = Array.from(entries).filter((x) => x !== "type any");
    return cleanEntries.length > 0 
      ? `import { ${cleanEntries.join(", ")} } from '$reflector/schemas.svelte';`
      : "";
  }

  private buildModuleTypes(): string[] {
    const types: string[] = [];
    
    // Aggregate all params from all methods
    const querys: any[] = [];
    const headers: any[] = [];
    const paths: any[] = [];
    const cookies: any[] = [];
    
    for (const method of this.module.methods) {
      querys.push(...method.querys);
      headers.push(...method.headers);
      paths.push(...method.paths);
      cookies.push(...method.cookies);
    }
    
    const result = this.paramProcessor.process({ querys, headers, paths, cookies });

    if (querys.length > 0) types.push(this.buildClassProps({ props: querys, name: "Querys" }));
    if (headers.length > 0) types.push(this.buildClassProps({ props: headers, name: "Headers" }));
    if (paths.length > 0) types.push(this.buildClassProps({ props: paths, name: "Paths" }));
    if (cookies.length > 0) types.push(this.buildClassProps({ props: cookies, name: "Cookies" }));

    return types;
  }

  private buildClassProps(params: { props: any[]; name: string }): string {
    const { name, props } = params;
    const interfaceBuild = props.map((p) => p.interfaceBuild?.() || `${p.name}: ${p.type || 'string'}`);

    return `
      interface ${name} {
        ${interfaceBuild.join(";")}
      }
    `;
  }

  private buildModuleClass(): string {
    const moduleName = capitalizeFirstLetter(this.module.name);
    const moduleAttributes = new Set<string>().add("loading = $state<boolean>(false)");
    const moduleInit = new Set<string>();
    const moduleClear = new Set<string>();

    const { buildedMethods, form, formSet } = this.methodProcessor.process(this.module.methods, this.module.name);
    
    // Aggregate all params from all methods
    const querys: any[] = [];
    const headers: any[] = [];
    const paths: any[] = [];
    const cookies: any[] = [];
    
    for (const method of this.module.methods) {
      querys.push(...method.querys);
      headers.push(...method.headers);
      paths.push(...method.paths);
      cookies.push(...method.cookies);
    }
    
    const { paramAttributes, paramInit, paramClear } = this.paramProcessor.process({ querys, headers, paths, cookies });

    paramAttributes.forEach((attr) => moduleAttributes.add(attr));
    paramInit.forEach((init) => moduleInit.add(init));
    paramClear.forEach((clear) => moduleClear.add(clear));

    const { attributes: formAttrs, init: formInit, clear: formClear } = this.formBuilder.buildFormsState(formSet);
    formAttrs.forEach((attr) => moduleAttributes.add(attr));
    formInit.forEach((init) => moduleInit.add(init));
    formClear.forEach((clear) => moduleClear.add(clear));

    const moduleConstructor = this.formBuilder.buildConstructor(form);

    return this.stateBuilder.buildClass({
      moduleName,
      moduleAttributes: Array.from(moduleAttributes),
      moduleInit: Array.from(moduleInit),
      moduleClear: Array.from(moduleClear),
      buildedMethods,
      moduleConstructor,
    });
  }
}
