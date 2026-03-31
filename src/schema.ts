import { ArrayProp } from "./props/array.property.js";
import { EnumProp } from "./props/enum.property.js";
import { ReflectorInterface } from "./interface.js";
import { ObjectProp } from "./props/object.property.js";
import { PrimitiveProp } from "./props/primitive.property.js";

import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators, ReflectorParamType } from "./types/types.js";
import { isReferenceObject } from "./helpers/helpers.js";

export class Schema {
  name: string;

  primitiveProps: PrimitiveProp[] = [];
  arrayProps: ArrayProp[] = [];
  objectProps: ObjectProp[] = [];
  enumProps: EnumProp[] = [];

  /** Other schema class names this schema depends on (via ObjectProp/$ref arrays) */
  readonly schemaDeps: string[];
  /** Enum type names used by this schema */
  readonly enumDeps: string[];

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

    // Derive dependencies for per-module schema splitting
    const schemaDepsSet = new Set<string>();
    for (const prop of this.objectProps) {
      schemaDepsSet.add(prop.type);
    }
    for (const prop of this.arrayProps) {
      if (prop.isSchemaRef) {
        schemaDepsSet.add(prop.type);
      }
    }
    this.schemaDeps = [...schemaDepsSet];

    const enumDepsSet = new Set<string>();
    for (const prop of this.enumProps) {
      if (prop.enumName) enumDepsSet.add(prop.enumName);
    }
    for (const prop of this.arrayProps) {
      if (prop.isEnum && prop.type) enumDepsSet.add(prop.type);
    }
    this.enumDeps = [...enumDepsSet];

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

    const constructorCode = `constructor(params?: { data?: ${this.name}Interface | undefined, empty?: boolean }) { 
        ${constructorThis.join(";\n")}
      }`;

    this.schema = `
    export class ${this.name} {
      ${keys.join(";")}

      ${constructorCode}

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

      if (ref && isReferenceObject(ref)) {
        this.objectProps.push(new ObjectProp({ name: key, referenceObject: ref, isRequired, isNullable: nullable }));
      }
    } else if (isReferenceObject(value)) {
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
      if (isReferenceObject(value) || !value?.type) {
        if (!isReferenceObject(value) && value.additionalProperties) {
          this.primitiveProps.push(new PrimitiveProp({ name: key, schemaObject: value, required: requireds.includes(key), validator: validators.get(key), isParam: undefined }));
        } else {
          this.processObject({ key, value });
        }
        continue;
      }

      const schemaName = this.name;
      const name = key;
      const schemaObject = value;

      const required = requireds.includes(key);
      const items = value.items;

      if (items && !isReferenceObject(items) && items.enum) {
        this.arrayProps.push(new ArrayProp({ name, required, schemaName, schemaObject, isParam: undefined, isEnum: true }));
        continue;
      } else if (value.enum) {
        this.enumProps.push(new EnumProp({ enums: value.enum, name, required, isParam: undefined, entityName: schemaName }));
        continue;
      }

      const validator = validators.get(key);
      const type = value.type as ReflectorParamType;

      if (type === "object") {
        if (schemaObject.additionalProperties) {
          this.primitiveProps.push(new PrimitiveProp({ name, schemaObject, required, validator, isParam: undefined }));
        }
        continue;
      }

      if (type === "array") {
        this.arrayProps.push(new ArrayProp({ schemaObject, schemaName, name, required, isParam: undefined, isEnum: false }));
        continue;
      }

      this.primitiveProps.push(new PrimitiveProp({ name, schemaObject, required, validator, isParam: undefined }));
    }
  }
}
