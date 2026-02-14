import type { SchemaObject } from "../types/open-api-spec.interface.js";
import { Property } from "./Property.js";
import { EnumProperty } from "./EnumProperty.js";

export class ArrayProperty extends Property {
  type: string;
  private isPrimitiveType: boolean = false;
  readonly isEnum: boolean;
  private schemaName: string;

  constructor(params: {
    name: string;
    schemaObject: SchemaObject;
    schemaName: string;
    isParam?: boolean;
    required?: boolean;
  }) {
    const { name, schemaObject, schemaName, isParam, required } = params;
    super({ name, required: required ?? true, isParam });

    this.schemaName = schemaName;
    this.isEnum = this.detectEnum(schemaObject);
    this.type = this.getType({ schemaObject, schemaName });
  }

  private detectEnum(schemaObject: SchemaObject): boolean {
    const items = schemaObject.items;
    return !!(items && !("$ref" in items) && items.enum);
  }

  private getType(params: { schemaObject: SchemaObject; schemaName: string }): string {
    const { schemaObject } = params;
    const items = schemaObject.items;

    if (items && !("$ref" in items) && items.enum) {
      this.isPrimitiveType = true;
      const enumProp = new EnumProperty({
        enums: items.enum,
        name: this.name,
        required: true,
        entityName: this.schemaName,
      });
      return enumProp.enumName;
    }

    if ("$ref" in items!) {
      const ref = items.$ref;
      const parts = ref.split("/");
      return parts[parts.length - 1];
    }

    if (items!.type === "array") {
      return `${this.getType({ schemaObject: items!, schemaName: this.schemaName })}[]`;
    }

    return items!.type || "unknown";
  }

  generateConstructor(): string {
    return `${this.thisDot()}${this.name} = ${this.buildConst()}`;
  }

  private buildConst(): string {
    return `build({ key: params?.data?.${this.name}, placeholder: [], example: [], required: ${this.required} })`;
  }

  generateClassProperty(): string {
    const required = this.required ? "" : "?";
    return `${this.name}${required} = $state<${this.type}[]>([])`;
  }

  generateInterfaceProperty(): string {
    const required = this.required ? "" : "?";
    return `${this.name}${required}: ${this.type}[]`;
  }

  generateBundleCode(): string {
    return `${this.name}: ${this.thisDot()}${this.name}?.value`;
  }

  staticBuild(): string {
    return `static from(data: ${this.type}[]) { return data.map((item) => new ${this.type}({ data: item })); }`;
  }
}
