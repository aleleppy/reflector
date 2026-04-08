import { isEnumSchema, isReferenceObject } from "../helpers/helpers.js";
import type { SchemaObject } from "../types/open-api-spec.interface.js";
import { EnumProp } from "./enum.property.js";

export class ArrayProp {
  name: string;
  type: string;
  isRequired: boolean;
  isParam: boolean;
  private _isPrimitiveType: boolean = false;
  private readonly isNullable: boolean;

  get isSchemaRef(): boolean {
    return !this._isPrimitiveType && !this.isEnum;
  }
  readonly isEnum: boolean;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    schemaName: string;
    required: boolean;
    isParam: boolean | undefined;
    isEnum: boolean | undefined;
    isNullable: boolean | undefined;
  }) {
    const { name, schemaObject, schemaName, required, isParam, isNullable } = params;

    this.isEnum = isEnumSchema(schemaObject);
    this.isNullable = !!isNullable;

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

    if (items && !isReferenceObject(items) && items.enum) {
      this._isPrimitiveType = true;
      const enumType = new EnumProp({
        enums: items.enum ?? schemaObject.enum,
        name: this.name,
        required: true,
        isParam: undefined,
        entityName: schemaName,
      }).enumName;
      return enumType;
    }

    if (isReferenceObject(items)) {
      const theType = items.$ref.split("/").at(-1);
      return theType as string;
    }

    this._isPrimitiveType = true;

    return "string";
  }

  constructorBuild() {
    const result = this._isPrimitiveType ? "" : `.map((param) => new ${this.type}({ data: param }))`;
    const nullFallback = this.isNullable ? "null" : "[]";

    return `this.${this.name} = params?.data?.${this.name} != null ? params.data.${this.name}${result} : (params?.data?.${this.name} === null ? ${nullFallback} : [])`;
  }

  classBuild() {
    const required = this.isRequired ? "" : "?";
    const sanitizedType = this._isPrimitiveType ? this.type : `${this.type}`;
    const nullable = this.isNullable ? " | null" : "";
    const defaultValue = this.isNullable ? "null" : "[]";

    return `${this.name}${required} = $state<${sanitizedType}[]${nullable}>(${defaultValue})`;
  }

  interfaceBuild() {
    const required = this.isRequired ? "" : "?";
    const sanitizedType = this._isPrimitiveType ? this.type : `${this.type}Interface`;
    const nullable = this.isNullable ? " | null" : "";

    return `${this.name}${required}: ${sanitizedType}[]${nullable}`;
  }

  bundleBuild() {
    const result = () => {
      if (this._isPrimitiveType || this.isEnum) return "";
      return ".map((obj) => obj.bundle())";
    };

    return `${this.name}: this.${this.name}${result()}`;
  }

  queryBundleBuild() {
    return `${this.name}: this.${this.name}?.values`;
  }

  queryBuild(): string {
    if (this.isEnum) {
      return `readonly ${this.name} = $derived(new EnumQueryBuilder<${this.type}>({ key: '${this.name}' }))`;
    }
    // Para arrays normais (não enum), usamos QueryBuilder padrão
    return `readonly ${this.name} = $derived(new QueryBuilder({ key: '${this.name}' }))`;
  }

  staticBuild() {
    const result = this._isPrimitiveType ? "obj" : `new ${this.type}({ data: obj })`;
    const aType = this._isPrimitiveType ? this.type : `${this.type}Interface`;

    return `
      static from(data: ${aType}[]) {
        return data.map((obj) => ${result});
      }
    `;
  }

  queryDefaultValue() {
    return "[]";
  }
}
