import type { SchemaObject } from "./types/open-api-spec.interface.js";

export class ArrayProp {
  name: string;
  type: string;
  isSpecial: boolean = false;

  constructor(params: { name: string; schemaObject: SchemaObject; schemaName: string }) {
    const { name, schemaObject, schemaName } = params;

    this.name = this.treatName(name);
    this.type = this.getType({ schemaObject, schemaName });
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      newName = `['${name}']`;
    }

    return newName;
  }

  private getType(params: { schemaObject: SchemaObject; schemaName: string }): string {
    const { schemaObject, schemaName } = params;

    const teste = schemaObject.items;

    if (!teste) return schemaName;

    this.isSpecial = true;

    if ("$ref" in teste) {
      return teste.$ref.split("/").at(-1) as string;
    }

    if (teste.enum && teste.type === "string") {
      return "string";
    }

    return teste.type ?? "string";
  }

  constructorBuild() {
    const result = this.isSpecial ? "" : `.map((param) => new ${this.type}(param))`;

    return `this.${this.name} = params?.${this.name}${result} ?? []`;
  }

  classBuild() {
    const sanitizedType = this.isSpecial ? this.type : `${this.type}[]`;

    return `${this.name}: ${sanitizedType}[]`;
  }

  interfaceBuild() {
    const sanitizedType = this.isSpecial ? this.type : `${this.type}Interface`;

    return `${this.name}: ${sanitizedType}[]`;
  }

  bundleBuild() {
    const result = this.isSpecial ? "" : ".map((obj) => obj.bundle())";

    return `${this.name}: this.${this.name}${result}`;
  }

  staticBuild() {
    const result = this.isSpecial ? "obj" : `new ${this.type}(obj)`;
    const aType = this.isSpecial ? this.type : `${this.type}Interface`;

    return `
      static from(data: ${aType}[]) {
        return data.map((obj) => ${result});
      }
    `;
  }
}
