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

    let name = schemaName;

    const teste = schemaObject.items;

    if (!teste) return name;

    if ("$ref" in teste) {
      return teste.$ref.split("/").at(-1) as string;
    }

    this.isSpecial = true;
    return teste.type || "string";
  }

  constructorBuild() {
    const result = this.isSpecial ? "" : `.map((param) => new ${this.type}(param))`;

    return `this.${this.name} = params?.${this.name}${result} ?? []`;
  }

  classBuild() {
    return `${this.name}: ${this.type}[]`;
  }

  interfaceBuild() {
    const aType = this.isSpecial ? this.type : `${this.type}Interface`;

    return `${this.name}: ${aType}[]`;
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
