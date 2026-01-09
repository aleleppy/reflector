import { sanitizeNumber } from "./helpers/helpers.js";
import { ReflectorInput } from "./helpers/input.js";
import { type ParameterLocation, type SchemaObject } from "./types/open-api-spec.interface.js";
import { type Example, type ReflectorParamType } from "./types/types.js";

const inputs = new ReflectorInput();

export class ZodProperty {
  name: string;
  example: Example | undefined;
  type: ReflectorParamType;
  buildedProp: string;
  description?: string;
  required: boolean;
  inParam: ParameterLocation;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    type: ReflectorParamType;
    example: Example | undefined;
    required: boolean;
    description?: string;
    isEmpty: boolean;
    inParam: ParameterLocation;
  }) {
    const { name, schemaObject, type, example, required, description, isEmpty, inParam } = params;

    this.inParam = inParam;

    if (name.split("-").length > 1) {
      this.name = `['${name}']`;
    } else {
      this.name = name;
    }

    this.required = required;

    this.type = type;
    this.example = isEmpty ? this.getEmptyExample() : this.getExample(example);
    this.buildedProp = this.build(schemaObject);
    if (description) this.description = description;
  }

  private getDtoName(ref: string) {
    const cavalos = ref.split("/");
    const dto = cavalos[cavalos.length - 1];

    return dto;
  }

  private getEmptyExample() {
    switch (this.type) {
      case "number":
        return 0;
      case "boolean":
        return false;
      case "string":
        return "";
      default:
        return "";
    }
  }

  private getExample(example: Example | undefined) {
    if (example) return example;

    return this.getEmptyExample();
  }

  private deepValidator(): string | false {
    if (this.name === "email") {
      return `z.email().default('${this.example}')`;
    } else if (this.name === "password") {
      return inputs.password;
    } else {
      return false;
    }
  }

  private isNullable() {
    return this.required ? "" : ".nullable()";
  }

  private treatName(name: string) {
    return name;
  }

  private build(value: SchemaObject): string {
    const name = this.treatName(this.name);

    const x = `${name}: z.${this.type}()${this.isNullable()}`;

    switch (this.type) {
      case "string": {
        const deepValidation = this.deepValidator();
        return deepValidation ? `${name}: ${deepValidation}` : `${x}.default('${this.example}')`;
      }
      case "boolean":
        return `${x}.default(${this.example})`;
      case "number": {
        const number = JSON.stringify(this.example) ?? 0;
        return `${x}.default(${sanitizeNumber(number)})`;
      }
      case "array": {
        if (!value.items || !("$ref" in value.items)) {
          return `${name}: z.${this.type}(z.${value.items?.type || "string"}())${this.isNullable()}.default([])`;
        }

        const dto = this.getDtoName(value.items.$ref);
        return `${name}: z.array(${dto}Schema).default(new Array(10).fill(${dto}Schema.parse({})))`;
      }
      case "object":
        return `${name}: z.any()`;
      default:
        return `${name}: z.any()`;
    }
  }
}
