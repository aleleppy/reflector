import { Property } from "./Property.js";
import { PrimitiveProperty } from "./PrimitiveProperty.js";
import { ArrayProperty } from "./ArrayProperty.js";
import { ObjectProperty } from "./ObjectProperty.js";
import { EnumProperty } from "./EnumProperty.js";
import type { SchemaObject, ReferenceObject } from "../types/open-api-spec.interface.js";

export class PropertyBuilder {
  private name: string;
  private schemaObject?: SchemaObject;
  private referenceObject?: ReferenceObject;
  private required = true;
  private isParam = false;
  private isNullable = false;
  private validator?: string;
  private schemaName?: string;

  static create(name: string): PropertyBuilder {
    return new PropertyBuilder(name);
  }

  private constructor(name: string) {
    this.name = name;
  }

  fromSchema(schemaObject: SchemaObject, schemaName?: string): this {
    this.schemaObject = schemaObject;
    this.schemaName = schemaName;
    return this;
  }

  fromReference(referenceObject: ReferenceObject): this {
    this.referenceObject = referenceObject;
    return this;
  }

  optional(): this {
    this.required = false;
    return this;
  }

  nullable(): this {
    this.isNullable = true;
    return this;
  }

  asParam(): this {
    this.isParam = true;
    return this;
  }

  withValidator(validator: string | undefined): this {
    this.validator = validator;
    return this;
  }

  withEntityName(entityName: string | undefined): this {
    this.schemaName = entityName as string | undefined;
    return this;
  }

  build(): Property {
    const baseParams = {
      name: this.name,
      required: this.required,
      isParam: this.isParam,
      isNullable: this.isNullable,
    };

    if (this.schemaObject?.enum && this.schemaName) {
      return new EnumProperty({
        ...baseParams,
        enums: this.schemaObject.enum,
        entityName: this.schemaName,
      });
    }

    if (this.schemaObject?.type === "array") {
      return new ArrayProperty({
        ...baseParams,
        schemaObject: this.schemaObject,
        schemaName: this.schemaName ?? "",
      });
    }

    if (this.referenceObject) {
      return new ObjectProperty({
        ...baseParams,
        referenceObject: this.referenceObject,
      });
    }

    return new PrimitiveProperty({
      ...baseParams,
      schemaObject: this.schemaObject ?? { type: "string" },
      validator: this.validator,
    });
  }
}
