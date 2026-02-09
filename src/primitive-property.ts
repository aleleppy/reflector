import type { SchemaObject } from "./types/open-api-spec.interface.js";
import type { ReflectorParamType } from "./types/types.js";

const emptyString = "''";

type AbstractType = string | boolean | Date | number | undefined;
type EmptyExample = string | false | 1;

export class PrimitiveProp {
  name: string;
  type: AbstractType;
  isSpecial: boolean = false;
  isParam: boolean;

  private readonly required: boolean;
  private readonly rawType: string;
  private readonly buildedConst: string;
  private readonly emptyExample: EmptyExample;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    required: boolean;
    validator: string | undefined;
    isParam?: boolean;
  }) {
    const { name, schemaObject, required, validator, isParam } = params;
    const { example: rawExample, type: rawType } = schemaObject;

    const type = (rawType as ReflectorParamType) ?? "string";

    this.emptyExample = this.getEmptyExample({ type, schemaObject });
    const example: AbstractType = rawExample;

    const buildedType = type;

    this.name = this.treatName(name);
    this.rawType = type ?? "any";
    this.type = `BuildedInput<${buildedType}>`;
    this.required = required;

    this.isParam = !!isParam;

    this.buildedConst = this.buildConst({ example, name: this.name, required, type, validator, emptyExample: this.emptyExample });
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      this.isSpecial = true;
      newName = `['${name}']`;
    }

    return newName;
  }

  private getEmptyExample(params: { type: ReflectorParamType; schemaObject: SchemaObject }) {
    const { schemaObject, type } = params;

    if (type === "number") {
      return 1;
    } else if (type === "boolean") {
      return false;
    } else if (schemaObject.enum) {
      return `"${schemaObject.enum[0]}"`;
    } else {
      return "''";
    }
  }

  private buildConst(params: {
    name: string;
    example: AbstractType;
    emptyExample: EmptyExample;
    required: boolean;
    type: ReflectorParamType | undefined;
    validator: string | undefined;
  }) {
    const { example, name, required, type, validator, emptyExample } = params;

    const getValidator = (type: ReflectorParamType) => {
      if (type === "string") {
        return "emptyString";
      }

      return null;
    };

    const buildedValidator = () => {
      if (validator) {
        return `validator: ${validator}`;
      } else if (required && type) {
        const v = getValidator(type);
        return v ? `validator: validateInputs.${v}` : "";
      }

      return "";
    };

    const sanitizedExample = () => {
      if (this.isParam || !example) {
        return emptyExample;
      }

      if (type === "string") {
        return `"${example}"`;
      }
      return example;
    };

    const buildedExample = () => {
      if (this.emptyExample === sanitizedExample()) {
        return sanitizedExample();
      }

      return `params?.empty ? ${this.emptyExample} : ${sanitizedExample()}`;
    };

    return `
      build({ key: params?.data?.${name}, placeholder: ${sanitizedExample()}, example: ${buildedExample()}, required: ${required}, ${buildedValidator()}})
    `;
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
