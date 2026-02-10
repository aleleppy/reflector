import type { SchemaObject } from "../types/open-api-spec.interface.js";
import { EnumProp } from "./enum.property.js";

export class ArrayProp {
  name: string;
  type: string;
  isRequired: boolean;
  isParam: boolean;
  private isPrimitiveType: boolean = false;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    schemaName: string;
    required: boolean;
    isParam?: boolean;
    isEnum?: boolean;
  }) {
    const { name, schemaObject, schemaName, required, isParam, isEnum } = params;

    this.name = this.treatName(name);
    this.type = this.getType({ schemaObject, schemaName });
    this.isRequired = required;
    this.isParam = !!isParam;
  }

  private treatName(name: string) {
    let newName = name;

    if (name.split("-").length > 1) {
      newName = `['${name}']`;
    }

    return newName;
  }

  private getType(params: { schemaObject: SchemaObject; schemaName: string }): string {
    const { schemaObject, schemaName } = params;

    const items = schemaObject.items;
    if (!items) return schemaName;

    if (items && !("$ref" in items) && items.enum) {
      this.isPrimitiveType = true;
      const enumType = new EnumProp({ enums: items.enum, name: this.name, required: true }).type;
      return `(${enumType})`;
    }

    if ("$ref" in items) {
      const theType = items.$ref.split("/").at(-1);
      return theType as string;
    }

    this.isPrimitiveType = true;

    return "string";
  }

  constructorBuild() {
    const result = this.isPrimitiveType ? "" : `.map((param) => new ${this.type}({ data: param }))`;

    return `this.${this.name} = params?.data?.${this.name}${result} ?? []`;
  }

  classBuild() {
    const required = this.isRequired ? "" : "?";
    const sanitizedType = this.isPrimitiveType ? this.type : `${this.type}`;

    return `${this.name}${required}: ${sanitizedType}[]`;
  }

  interfaceBuild() {
    const required = this.isRequired ? "" : "?";
    const sanitizedType = this.isPrimitiveType ? this.type : `${this.type}Interface`;

    return `${this.name}${required}: ${sanitizedType}[]`;
  }

  // toInterfaceArrayBuild() {
  //   const required = this.isRequired ? "" : "?";
  //   const sanitizedType = this.isPrimitiveType ? this.type : `${this.type}Interface`;

  //   return `${this.name}${required}: ${sanitizedType}[]`;
  // }

  bundleBuild() {
    const result = this.isPrimitiveType ? "" : ".map((obj) => obj.bundle())";

    return `${this.name}: this.${this.name}${result}`;
  }

  staticBuild() {
    const result = this.isPrimitiveType ? "obj" : `new ${this.type}({ data: obj })`;
    const aType = this.isPrimitiveType ? this.type : `${this.type}Interface`;

    return `
      static from(data: ${aType}[]) {
        return data.map((obj) => ${result});
      }
    `;
  }
}
