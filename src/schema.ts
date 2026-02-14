import { ArrayProp } from "./props/array.property.js";
import { EnumProp } from "./props/enum.property.js";
import { ReflectorInterface } from "./interface.js";
import { ObjectProp } from "./props/object.property.js";
import { PrimitiveProp } from "./props/primitive.property.js";

import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators, ReflectorParamType } from "./types/types.js";

export class Schema {
  name: string;

  primitiveProps: PrimitiveProp[] = [];
  arrayProps: ArrayProp[] = [];
  objectProps: ObjectProp[] = [];
  enumProps: EnumProp[] = [];

  schema: string;
  interface: string;

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
    validators: FieldValidators;
  }) {
    const { name, isEmpty } = params;

    this.name = `${isEmpty ? "Empty" : ""}${name}`;

    this.processEntities(params);

    const reflectorInterface = new ReflectorInterface({
      name: this.name,
      arrayProps: this.arrayProps,
      primitiveProps: this.primitiveProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
    });

    this.interface = reflectorInterface.builded;

    const constructorThis: string[] = [];
    const keys: string[] = [];
    const bundleParams: string[] = [];
    let staticMethod: string = "";

    this.primitiveProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      bundleParams.push(prop.bundleBuild());
      keys.push(prop.classBuild());
    });

    this.arrayProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());

      staticMethod = prop.staticBuild();
    });

    this.objectProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());
    });

    this.enumProps.forEach((prop) => {
      constructorThis.push(prop.constructorBuild());
      keys.push(prop.classBuild());
      bundleParams.push(prop.bundleBuild());
    });

    this.schema = `
    export class ${this.name} {
      ${keys.join(";")}

      constructor(params?: { data?: ${this.name}Interface | undefined, empty?: boolean }) { 
        ${constructorThis.join(";\n")}
      }

      ${staticMethod}

      bundle(){
        return { ${bundleParams.join(",")} }
      }
    };`;
  }

  private processObject(params: { value: ReferenceObject | SchemaObject; key: string }) {
    const { value, key } = params;
    if ("allOf" in value) {
      const ref = value.allOf?.[0];
      const isRequired = !!value.nullable;
      const nullable = !!value.nullable;

      if (ref && "$ref" in ref) {
        this.objectProps.push(new ObjectProp({ name: key, referenceObject: ref, isRequired, isNullable: nullable }));
      }
    } else if ("$ref" in value) {
      this.objectProps.push(new ObjectProp({ name: key, referenceObject: value }));
    }
  }

  private processEntities(params: {
    properties: Record<string, ReferenceObject | SchemaObject>;
    requireds: string[];
    validators: FieldValidators;
  }) {
    const { properties, requireds, validators } = params;

    for (const [key, value] of Object.entries(properties)) {
      if ("$ref" in value || !value?.type) {
        this.processObject({ key, value });
        continue;
      }

      const schemaName = this.name;
      const name = key;
      const schemaObject = value;

      const required = requireds.includes(key);
      const items = value.items;

      if (items && !("$ref" in items) && items.enum) {
        this.arrayProps.push(new ArrayProp({ name, required, schemaName, schemaObject, isParam: undefined, isEnum: true }));
        // this.enumProps.push(new EnumProp({ enums: items.enum, name, required }));
        continue;
      } else if (value.enum) {
        this.enumProps.push(new EnumProp({ enums: value.enum, name, required, isParam: undefined, entityName: schemaName }));
        continue;
      }

      const validator = validators.get(key);
      const type = value.type as ReflectorParamType;

      if (type === "object") continue;

      if (type === "array") {
        this.arrayProps.push(new ArrayProp({ schemaObject, schemaName, name, required, isParam: undefined, isEnum: false }));
        continue;
      }

      this.primitiveProps.push(new PrimitiveProp({ name, schemaObject, required, validator, isParam: undefined }));
    }
  }
}
