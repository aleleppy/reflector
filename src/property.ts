import { sanitizeNumber, treatenEnum } from "./helpers/helpers.js";
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
  // inParam: ParameterLocation;
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

    this.paramType = type;
    this.isRequired = required;
    this.name = this.treatName(name);
    this.bType = this.getType({ type, schemaName });
    this.example = `${this.getExample({ example, type })}`;
    this.emptyExample = `${this.getEmptyExample(type)}`;

    this.buildedValue = this.getBuildedValue({
      example: this.example,
      isRequired: this.isRequired,
      name: this.name,
      type,
      bType: this.bType,
    });
  }

  private getBuildedValue(params: {
    name: string;
    type: ReflectorParamType;
    isRequired: boolean;
    example: string;
    bType: string;
  }) {
    const { example, isRequired, name, type, bType } = params;

    let content: string = "";
    // let emptyContent: string = "";

    if (type === "number" || type === "string" || type === "boolean") {
      content = `build({key: ${this.getEmptyExample(type)}, example: ${example}, required: ${isRequired}})`;
    } else if (type === "object") {
      content = `new ${bType}()`;
      // emptyContent = `new ${bType}()`;
    } else if (type === "array") {
      content = "[]";
      // emptyContent = "[]";
    }

    return content;
  }

  // private getDtoName(ref: string) {
  //   const splittedRef = ref.split("/");
  //   const dto = splittedRef[splittedRef.length - 1];

  //   return dto;
  // }

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

  private isNullable(isRequired: boolean) {
    return isRequired ? "" : " | null";
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

  // private build(params: { schemaObject: SchemaObject; name: string; type: ReflectorParamType; isRequired: boolean }) {
  //   const { name, schemaObject, type, isRequired } = params;

  //   // if (this.type === "number") {
  //   //   const number = JSON.stringify(this.example) ?? 0;
  //   //   this.buildedType = sanitizeNumber(number);
  //   // } else if (this.type === "string") {
  //   //   this.buildedType = this.deepValidator() ?? this.type;
  //   // } else if (this.type === "boolean") {
  //   //   this.buildedExample = `'${this.example}'`;
  //   // } else {
  //   //   this.buildedType = this.type;
  //   // }

  //   // switch (this.type) {
  //   //   case "string": {
  //   //     // console.log(schemaObject.enum);
  //   //   }
  //   //   case "boolean":
  //   //     return `${x} = ${}`;
  //   //   case "number": {
  //   //     const number = JSON.stringify(this.example) ?? 0;
  //   //     return `${x} = ${sanitizeNumber(number)}`;
  //   //   }
  //   //   // case "array": {
  //   //   //   if (!schemaObject.items || !("$ref" in schemaObject.items)) {
  //   //   //     let zodType = "z.string()";

  //   //   //     if (schemaObject.items?.enum) {
  //   //   //       zodType = treatenEnum(schemaObject.items.enum);
  //   //   //     } else if (schemaObject.items?.type) {
  //   //   //       zodType = `z.${schemaObject.items.type}()`;
  //   //   //     }

  //   //   //     return `${name}: z.${this.type}(${zodType})${this.isNullable()}.default([])`;
  //   //   //   }

  //   //   //   const dto = this.getDtoName(schemaObject.items.$ref);
  //   //   //   return `${name}: ${dto}Schema[]`;
  //   //   // }
  //   //   // case "object":
  //   //   //   return `${name}: any`;
  //   //   default:
  //   //     return `${name}: any`;
  //   // }
  // }
}
