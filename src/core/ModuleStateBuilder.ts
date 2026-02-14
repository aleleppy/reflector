export class ModuleStateBuilder {
  buildClass(params: {
    moduleName: string;
    moduleAttributes: string[];
    moduleInit: string[];
    moduleClear: string[];
    buildedMethods: string[];
    moduleConstructor: string;
  }): string {
    const { moduleName, moduleInit, moduleAttributes, moduleClear, buildedMethods, moduleConstructor } = params;

    const reset = moduleAttributes.length > 1
      ? `reset() { ${moduleInit.join(";")} }`
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
