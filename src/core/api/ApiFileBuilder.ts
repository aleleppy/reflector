import type { ModuleImports } from "../module/ModuleImports.js";
import type { ApiEndpointBlock } from "./ApiClassBuilder.js";

export class ApiFileBuilder {
  private readonly imports: ModuleImports;

  constructor(params: { imports: ModuleImports }) {
    this.imports = params.imports;
  }

  build(params: { endpointBlocks: ApiEndpointBlock[]; classImports: string }): string {
    const { endpointBlocks, classImports } = params;

    const reflectorImports = this.imports.buildReflectorImportsLine();
    const enumImports = this.imports.buildEnumImportsLine();
    const mockedImports = this.imports.buildMockedImportsLine();

    const sections = endpointBlocks.map((block) => {
      return `${block.paramCode}\n${block.classCode}`;
    });

    return `
      ${this.imports.getImportsArray().join(";")}
      ${reflectorImports}
      ${mockedImports}
      ${enumImports}
      ${classImports}

      ${sections.join("\n\n")}
    `;
  }
}
