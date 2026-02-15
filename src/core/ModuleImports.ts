// Gerenciamento de imports do módulo
export class ModuleImports {
  readonly imports: Set<string>;
  readonly reflectorImports: Set<string>;
  readonly enumImports: Set<string>;

  constructor() {
    this.imports = new Set([
      "// AUTO GERADO. QUEM ALTERAR GOSTA DE RAPAZES!\n",
      'import api from "$repository/api"',
      `import { PUBLIC_ENVIRONMENT } from '$env/static/public'`,
    ]);

    this.reflectorImports = new Set<string>(["Behavior"]);
    this.enumImports = new Set<string>();
  }

  addImport(importStr: string): void {
    this.imports.add(importStr);
  }

  addReflectorImport(importStr: string): void {
    this.reflectorImports.add(importStr);
  }

  addEnumImport(enumName: string): void {
    this.enumImports.add(enumName);
  }

  addPageStateImport(): void {
    this.imports.add(`import { page } from "$app/state"`);
  }

  getImportsArray(): string[] {
    return Array.from(this.imports);
  }

  getReflectorImportsArray(): string[] {
    return Array.from(this.reflectorImports);
  }

  getEnumImportsArray(): string[] {
    return Array.from(this.enumImports);
  }

  hasEnumImports(): boolean {
    return this.enumImports.size > 0;
  }

  buildReflectorImportsLine(): string {
    return `import { ${this.getReflectorImportsArray().join(", ")}, type ApiErrorResponse } from "$reflector/reflector.svelte";`;
  }

  buildEnumImportsLine(): string {
    if (!this.hasEnumImports()) return "";
    return `import {${this.getEnumImportsArray().join(", ")} } from "$reflector/enums"`;
  }
}
