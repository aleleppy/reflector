import type { ModuleImports } from "./ModuleImports.js";

export interface FileBuildParams {
  moduleAttributes: string[];
  moduleTypes: string[];
  moduleInit: string[];
  moduleClear: string[];
  classImports: string;
  buildedMethods: string[];
  moduleConstructor: string;
  moduleName: string;
}

export class ModuleFileBuilder {
  private readonly imports: ModuleImports;

  constructor(params: { imports: ModuleImports }) {
    this.imports = params.imports;
  }

  build(params: FileBuildParams): string {
    const {
      moduleInit,
      moduleTypes,
      moduleAttributes,
      moduleClear,
      classImports,
      buildedMethods,
      moduleConstructor,
      moduleName,
    } = params;

    const reflectorImports = this.imports.buildReflectorImportsLine();
    const enumImports = this.imports.buildEnumImportsLine();
    const mockedImports = this.imports.buildMockedImportsLine();

    return `
      ${this.imports.getImportsArray().join(";")}
      ${reflectorImports}
      ${mockedImports}
      ${enumImports}
      ${classImports}

      ${moduleTypes.join(";")}

      ${this.buildClass({
        moduleAttributes,
        moduleInit,
        moduleClear,
        buildedMethods,
        moduleConstructor,
        moduleName,
      })}
    `;
  }

  private buildClass(params: {
    moduleAttributes: string[];
    moduleInit: string[];
    moduleClear: string[];
    buildedMethods: string[];
    moduleConstructor: string;
    moduleName: string;
  }): string {
    const { moduleInit, moduleAttributes, moduleClear, buildedMethods, moduleConstructor, moduleName } = params;

    const reset =
      moduleAttributes.length > 1
        ? `reset() {
          ${moduleInit.join(";")}
        }`
        : "";

    return `
      export class ${moduleName}Module {
        ${moduleAttributes.join(";")}

        ${moduleConstructor}

        ${buildedMethods.join("\n")}

        ${moduleClear.join("\n\n")}

        ${reset}
      }
    `;
  }
}
