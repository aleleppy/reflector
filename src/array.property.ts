import type { SchemaObject } from "./types/open-api-spec.interface.js";

export class ArrayProp {
  name: string;
  type: string;

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

    if (teste && "$ref" in teste) {
      const a = teste.$ref;
      name = a.split("/").at(-1) as string;
    }

    return name;
  }

  constructorBuild() {
    return `this.${this.name} = params?.${this.name}.map((param) => new ${this.type}(param)) ?? []`;
  }

  classBuild() {
    return `${this.name}: ${this.type}[]`;
  }

  interfaceBuild() {
    return `${this.name}: ${this.type}Interface[]`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}.map((obj) => obj.bundle())`;
  }
}
