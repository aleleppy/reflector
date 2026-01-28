import { type ParameterLocation, type ReferenceObject, type SchemaObject } from "./types/open-api-spec.interface.js";
import { type Example, type ReflectorParamType } from "./types/types.js";

// export class SchemaProp {
//   inParam?: ParameterLocation | undefined;

//   reflectorType: ReflectorParamType;

//   example: string;
//   emptyExample: string;
//   name: string;

//   buildedValue: string;
//   buildedType: string;

//   enums?: string;

//   isRequired: boolean;
//   isSpecial: boolean = false;

//   constructor(params: {
//     schemaName?: string;
//     name: string;
//     schemaObject: SchemaObject;
//     type: ReflectorParamType;
//     example: Example | undefined;
//     required: boolean;
//     description?: string;
//     isEmpty: boolean;
//     inParam?: ParameterLocation;
//     validator?: string | undefined;
//   }) {
//     const { schemaName, name, schemaObject, type, example, required, description, isEmpty, inParam, validator } = params;

//     if (schemaObject.enum) {
//       this.enums = schemaObject.enum.map((e) => `'${e}'`).join("|");
//     }

//     this.inParam = inParam;
//     this.reflectorType = schemaObject.enum ? "enum" : type;
//     this.isRequired = required;
//     this.name = this.treatName(name);
//     this.buildedType = this.getType({ type, schemaName, schemaObject });
//     this.example = `${this.getExample({ example, type, schemaObject })}`;
//     this.emptyExample = `${this.getEmptyExample({ schemaObject, type: this.reflectorType })}`;

//     this.buildedValue = this.getBuildedValue({
//       example: this.example,
//       isRequired: this.isRequired,
//       type,
//       bType: this.buildedType,
//       enums: this.enums,
//       schemaObject,
//       validator,
//       inParam,
//     });
//   }

//   private getBuildedValue(params: {
//     type: ReflectorParamType;
//     isRequired: boolean;
//     example: string;
//     bType: string;
//     enums: string | undefined;
//     schemaObject: SchemaObject;
//     validator: string | undefined;
//     inParam?: ParameterLocation | undefined;
//   }) {
//     const { example, isRequired, type, bType, schemaObject, validator, inParam } = params;

//     let content: string = "";

//     const buildedValidator = validator ? `validator: ${validator}` : "";

//     const buildedKey = () => {
//       const example = this.getEmptyExample({ type, schemaObject });
//       return inParam ? example : `params?.${this.name} ?? ${example}`;
//     };

//     if (type === "number" || type === "string" || type === "boolean") {
//       content = `build({key: ${buildedKey()}, example: ${example}, required: ${isRequired}, ${buildedValidator}})`;
//     } else if (type === "object") {
//       content = `new ${bType}()`;
//     } else if (type === "array") {
//       content = `${this.name}Interface[]`;
//     }

//     return content;
//   }

//   private getExample(params: { example: Example | undefined; type: ReflectorParamType; schemaObject: SchemaObject }) {
//     const { example, type, schemaObject } = params;

//     const sanitizedExample = type === "boolean" || type === "number" ? example : `"${example}"`;

//     return example ? sanitizedExample : this.getEmptyExample({ schemaObject, type });
//   }

//   private treatName(name: string) {
//     let newName = name;

//     if (name.split("-").length > 1) {
//       this.isSpecial = true;
//       newName = `['${name}']`;
//     }

//     return newName;
//   }

//   private getType(params: { type: ReflectorParamType; schemaName: string | undefined; schemaObject: SchemaObject }) {
//     const { type, schemaName, schemaObject } = params;

//     if (type === "object") {
//       return `${schemaName}`;
//     } else if (type === "array") {
//       let name = schemaName;

//       const teste = schemaObject.items;

//       if (teste && "$ref" in teste) {
//         const a = teste.$ref;
//         name = a.split("/").at(-1);
//       }

//       return `${name}[]`;
//     } else {
//       return type as string;
//     }
//   }

//   getEmptyExample(params: { type: ReflectorParamType; schemaObject: SchemaObject }) {
//     const { schemaObject, type } = params;

//     if (type === "number") {
//       return 0;
//     } else if (type === "boolean") {
//       return false;
//     } else if (schemaObject.enum) {
//       return `'${schemaObject.enum[0]}'`;
//     } else {
//       return "''";
//     }
//   }
// }
