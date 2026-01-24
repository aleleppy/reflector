import { ReflectorInput } from "./helpers/input.js";
import { type ParameterLocation, type SchemaObject } from "./types/open-api-spec.interface.js";
import { type Example, type ReflectorParamType } from "./types/types.js";

const inputs = new ReflectorInput();

export class SchemaProp {
  // schemaName?: string;
  // name: string;
  // example: Example | undefined;
  // type: ReflectorParamType;
  // buildedProp: string;
  // description?: string;
  // required: boolean;
  inParam: ParameterLocation;
  // isEnum: boolean = false;
  // enums: string[] = [];

  example: string;
  emptyExample: string;
  name: string;
  bType: string;
  isRequired: boolean;
  paramType: ReflectorParamType;

  buildedValue: string;

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
  }) {
    const { schemaName, name, schemaObject, type, example, required, description, isEmpty, inParam } = params;

    // this.inParam = inParam;
    // this.isEnum = false;

    this.inParam = inParam;
    this.paramType = type;
    this.isRequired = required;
    this.name = this.treatName(name);
    this.bType = this.getType({ type, schemaName });
    this.example = `${this.getExample({ example, type })}`;
    this.emptyExample = `${this.getEmptyExample(type)}`;

    this.buildedValue = this.getBuildedValue({
      example: this.example,
      isRequired: this.isRequired,
      type,
      bType: this.bType,
    });
  }

  private getBuildedValue(params: { type: ReflectorParamType; isRequired: boolean; example: string; bType: string }) {
    const { example, isRequired, type, bType } = params;

    let content: string = "";

    if (type === "number" || type === "string" || type === "boolean") {
      content = `build({key: ${this.getEmptyExample(type)}, example: ${example}, required: ${isRequired}})`;
    } else if (type === "object") {
      content = `new ${bType}()`;
    } else if (type === "array") {
      content = "[]";
    }

    return content;
  }

  getEmptyExample(type: ReflectorParamType) {
    if (type === "number") {
      return 0;
    } else if (type === "boolean") {
      return false;
    } else {
      return "''";
    }
  }

  private getExample(params: { example: Example | undefined; type: ReflectorParamType }) {
    const { example, type } = params;

    const sanitizedExample = type === "boolean" || type === "number" ? example : `"${example}"`;

    return example ? sanitizedExample : this.getEmptyExample(type);
  }

  private deepValidator(params: { name: string }): string | false {
    const { name } = params;
    if (name === "email") {
      // return `z.email().default('${this.example}')`;
      return "Email";
    } else if (name === "password") {
      return "Password";
    }
    // else if (this.isEnum) {
    //   return `${treatenEnum(this.enums)}.default('${this.enums[0]}')`;
    // }
    else {
      return false;
    }
  }

  private treatName(name: string) {
    return name;
  }

  private getType(params: { type: ReflectorParamType; schemaName: string | undefined }) {
    const { type, schemaName } = params;

    if (type === "object") {
      return `${schemaName}`;
    } else if (type === "array") {
      return `${schemaName}[]`;
    } else {
      return type as string;
    }
  }
}
