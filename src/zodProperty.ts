import { sanitizeNumber, treatenEnum } from "./helpers/helpers.js";
import { ReflectorInput } from "./helpers/input.js";
import { type ParameterLocation, type SchemaObject } from "./types/open-api-spec.interface.js";
import { type Example, type ReflectorParamType } from "./types/types.js";

const inputs = new ReflectorInput();

export class ZodProperty {
  schemaName?: string;
  name: string;
  example: Example | undefined;
  type: ReflectorParamType;
  buildedProp: string;
  description?: string;
  required: boolean;
  inParam: ParameterLocation;
  isEnum: boolean = false;
  enums: string[] = [];

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

    this.inParam = inParam;
    this.isEnum = false;

    const items = schemaObject.items;

    if (items && !("$ref" in items) && items.enum) {
      this.isEnum = true;
      this.enums = items.enum;
    } else if (schemaObject.enum) {
      this.isEnum = true;
      this.enums = schemaObject.enum;
    }

    if (schemaName) {
      this.schemaName = schemaName;
    }

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
    } else if (this.isEnum) {
      return `${treatenEnum(this.enums)}.default('${this.enums[0]}')`;
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

  private build(schemaObject: SchemaObject): string {
    const name = this.treatName(this.name);

    const x = `${name}: z.${this.type}()${this.isNullable()}`;

    switch (this.type) {
      case "string": {
        // console.log(schemaObject.enum);

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
        if (!schemaObject.items || !("$ref" in schemaObject.items)) {
          let zodType = "z.string()";

          if (schemaObject.items?.enum) {
            zodType = treatenEnum(schemaObject.items.enum);
          } else if (schemaObject.items?.type) {
            zodType = `z.${schemaObject.items.type}()`;
          }

          return `${name}: z.${this.type}(${zodType})${this.isNullable()}.default([])`;
        }

        const dto = this.getDtoName(schemaObject.items.$ref);
        return `${name}: z.array(${dto}Schema).default(new Array(10).fill(${dto}Schema.parse({})))`;
      }
      case "object":
        return `${name}: z.any()`;
      default:
        return `${name}: z.any()`;
    }
  }
}
