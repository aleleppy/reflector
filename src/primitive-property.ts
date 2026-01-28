import type { SchemaObject } from "./types/open-api-spec.interface.js";

export class PrimitiveProp {
  name: string;
  type: string;
  isSpecial: boolean = false;

  private readonly required: boolean;
  private readonly rawType: string;
  private readonly buildedConst: string;

  constructor(params: { name: string; schemaObject: SchemaObject; required: boolean; validator: string | undefined }) {
    const { name, schemaObject, required } = params;

    const { example, type } = schemaObject;

    this.name = this.treatName(name);
    this.rawType = type ?? "any";
    this.type = `BuildedInput<${type}>`;
    this.required = required;

    this.buildedConst = this.buildConst({ example, name, required, type });
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      this.isSpecial = true;
      newName = `['${name}']`;
    }

    return newName;
  }

  private buildConst(params: { name: string; example: string; required: boolean; type: string | undefined }) {
    const { example, name, required, type } = params;

    const sanitizedExample = type === "boolean" || type === "number" ? example : `"${example}"`;

    return `
      build({ key: params?.${name}, example: ${sanitizedExample}, required: ${required}})
    `;
  }

  constructorBuild() {
    return `this.${this.name} = ${this.buildedConst}`;
  }

  classBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.type}`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.rawType}`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.value`;
  }
}
