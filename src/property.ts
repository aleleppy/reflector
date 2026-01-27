import { ReflectorInput } from "./helpers/input.js";
import { type ParameterLocation, type SchemaObject } from "./types/open-api-spec.interface.js";
import { type Example, type ReflectorParamType } from "./types/types.js";

const inputs = new ReflectorInput();

export class SchemaProp {
  inParam: ParameterLocation;
  isSpecial: boolean = false;

  example: string;
  emptyExample: string;
  name: string;
  bType: string;
  isRequired: boolean;
  reflectorType: ReflectorParamType;

  buildedValue: string;

  enums?: string;

  constructor(params: {
    schemaName?: string;
    name: string;
    schemaObject: SchemaObject;
    type: ReflectorParamType;
    example: Example | undefined;
    required: boolean;
    description?: string;
    isEmpty: boolean;
    inParam: ParameterLocation;
    validator?: string | undefined;
  }) {
    const { schemaName, name, schemaObject, type, example, required, description, isEmpty, inParam, validator } = params;

    if (schemaObject.enum) {
      this.enums = schemaObject.enum.map((e) => `'${e}'`).join("|");
    }

    this.inParam = inParam;
    this.reflectorType = schemaObject.enum ? "enum" : type;
    this.isRequired = required;
    this.name = this.treatName(name);
    this.bType = this.getType({ type, schemaName, schemaObject });
    this.example = `${this.getExample({ example, type, schemaObject })}`;
    this.emptyExample = `${this.getEmptyExample({ schemaObject, type: this.reflectorType })}`;

    this.buildedValue = this.getBuildedValue({
      example: this.example,
      isRequired: this.isRequired,
      type,
      bType: this.bType,
      enums: this.enums,
      schemaObject,
      validator,
    });
  }

  private getBuildedValue(params: {
    type: ReflectorParamType;
    isRequired: boolean;
    example: string;
    bType: string;
    enums: string | undefined;
    schemaObject: SchemaObject;
    validator: string | undefined;
  }) {
    const { example, isRequired, type, bType, enums, schemaObject, validator } = params;

    let content: string = "";

    const diamondType = enums ? `<${enums}>` : "";
    const buildedValidator = validator ? `validator: ${validator}` : "";

    if (type === "number" || type === "string" || type === "boolean") {
      content = `build${diamondType}({key: ${this.getEmptyExample({ type, schemaObject })}, example: ${example}, required: ${isRequired}, ${buildedValidator}})`;
    } else if (type === "object") {
      content = `new ${bType}()`;
    } else if (type === "array") {
      content = "[]";
    }

    return content;
  }

  getEmptyExample(params: { type: ReflectorParamType; schemaObject: SchemaObject }) {
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

  private getExample(params: { example: Example | undefined; type: ReflectorParamType; schemaObject: SchemaObject }) {
    const { example, type, schemaObject } = params;

    const sanitizedExample = type === "boolean" || type === "number" ? example : `"${example}"`;

    return example ? sanitizedExample : this.getEmptyExample({ schemaObject, type });
  }

  private deepValidator(params: { name: string }): string | false {
    const { name } = params;
    if (name === "email") {
      // return `z.email().default('${this.example}')`;
      return "Email";
    } else if (name === "password") {
      return "Password";
    } else {
      return false;
    }
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      this.isSpecial = true;
      newName = `['${name}']`;
    }

    return newName;
  }

  private getType(params: { type: ReflectorParamType; schemaName: string | undefined; schemaObject: SchemaObject }) {
    const { type, schemaName, schemaObject } = params;

    if (type === "object") {
      return `${schemaName}`;
    } else if (type === "array") {
      let name = schemaName;

      const teste = schemaObject.items;

      if (teste && "$ref" in teste) {
        const a = teste.$ref;
        name = a.split("/").at(-1);
      }

      return `${name}[]`;
    } else {
      return type as string;
    }
  }
}
