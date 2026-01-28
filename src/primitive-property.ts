import type { SchemaObject } from "./types/open-api-spec.interface.js";
import type { ReflectorParamType } from "./types/types.js";

export class PrimitiveProp {
  name: string;
  type: string;
  isSpecial: boolean = false;

  private readonly required: boolean;
  private readonly rawType: string;
  private readonly buildedConst: string;

  constructor(params: { name: string; schemaObject: SchemaObject; required: boolean; validator: string | undefined }) {
    const { name, schemaObject, required } = params;

    const { example: rawExample, type: rawType } = schemaObject;

    const type = (rawType as ReflectorParamType) ?? "string";

    const example = rawExample ?? this.getEmptyExample({ type, schemaObject });

    this.name = this.treatName(name);
    this.rawType = type ?? "any";
    this.type = `BuildedInput<${type}>`;
    this.required = required;

    this.buildedConst = this.buildConst({ example, name: this.name, required, type });
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

  private getEmptyExample(params: { type: ReflectorParamType; schemaObject: SchemaObject }) {
    const { schemaObject, type } = params;

    if (type === "number") {
      return 0;
    } else if (type === "boolean") {
      return false;
    } else if (schemaObject.enum) {
      return `'${schemaObject.enum[0]}'`;
    } else {
      return "''";
    }
  }

  private thisDot() {
    return `this${this.isSpecial ? "" : "."}`;
  }

  constructorBuild() {
    return `${this.thisDot()}${this.name} = ${this.buildedConst}`;
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
    return `${this.name}: ${this.thisDot()}${this.name}?.value`;
  }
}

// class Teste {
//   ["x-two-factor-code"]: string;

//   constructor() {
//     this["x-two-factor-code"] = "aaaaaaa";
//   }

//   bundle() {
//     return { ["x-two-factor-code"]: this["x-two-factor-code"] };
//   }
// }
