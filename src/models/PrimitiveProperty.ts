import type { SchemaObject } from "../types/open-api-spec.interface.js";
import { Property } from "./Property.js";

type AbstractType = string | boolean | number | undefined;
type EmptyExample = string | false | number;

export class PrimitiveProperty extends Property {
  private rawType: string;
  private buildedConst: string;
  private emptyExample: EmptyExample;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    required: boolean;
    validator: string | undefined;
    isParam?: boolean;
  }) {
    const { name, schemaObject, required, validator, isParam } = params;
    super({ name, required, isParam: isParam ?? false });

    const type = (schemaObject.type as string) ?? "string";
    this.rawType = type;
    this.emptyExample = this.getEmptyExample({ type, schemaObject });
    const example = schemaObject.example;

    this.buildedConst = this.buildConst({ example, name: this.name, required, type, validator });
  }

  private getEmptyExample(params: { type: string; schemaObject: SchemaObject }): EmptyExample {
    const { schemaObject, type } = params;

    if (type === "number") return 1;
    if (type === "boolean") return false;
    if (schemaObject.enum) return `"${schemaObject.enum[0]}"`;
    return "''";
  }

  private buildConst(params: {
    name: string;
    example: AbstractType;
    required: boolean;
    type: string;
    validator: string | undefined;
  }): string {
    const { example, name, required, type, validator } = params;

    const buildedValidator = () => {
      if (validator) return `validator: ${validator}`;
      if (required && type === "string") return `validator: validateInputs.emptyString`;
      return "";
    };

    const sanitizedExample = () => {
      if (this.isParam || !example) return this.emptyExample;
      if (type === "string") return `"${example}"`;
      return example;
    };

    const buildedExample = () => {
      if (this.emptyExample === sanitizedExample()) return sanitizedExample();
      if (type === "boolean") return `!!params?.empty`;
      return `params?.empty ? ${this.emptyExample} : ${sanitizedExample()}`;
    };

    return `build({ key: params?.data?.${name}, placeholder: ${sanitizedExample()}, example: ${buildedExample()}, required: ${required}, ${buildedValidator()}})`;
  }

  generateConstructor(): string {
    return `${this.thisDot()}${this.name} = ${this.buildedConst}`;
  }

  generateClassProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: BuildedInput<${this.rawType}>`;
  }

  generateInterfaceProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: ${this.rawType}`;
  }

  generateBundleCode(): string {
    return `${this.name}: ${this.thisDot()}${this.name}?.value`;
  }
}
