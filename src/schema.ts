import { ArrayProp } from "./props/array.property.js";
import { EnumProp } from "./props/enum.property.js";
import { ReflectorInterface } from "./interface.js";
import { ObjectProp } from "./props/object.property.js";
import { PrimitiveProp } from "./props/primitive.property.js";

import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { FieldConfigs, ReflectorParamType } from "./types/types.js";
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
  /** Custom type names used by this schema (from fieldConfigs) */
  readonly customTypeDeps: string[];

  schema: string;
  interface: string;

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
    fieldConfigs: FieldConfigs;
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

    const customTypeDepsSet = new Set<string>();
    for (const prop of this.primitiveProps) {
      if (prop.customType) customTypeDepsSet.add(prop.customType);
    }
    this.customTypeDeps = [...customTypeDepsSet];

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
    fieldConfigs: FieldConfigs;
  }) {
    const { properties, requireds, fieldConfigs } = params;

    for (const [key, value] of Object.entries(properties)) {
      if (isReferenceObject(value) || !value?.type) {
        if (!isReferenceObject(value) && value.additionalProperties) {
          const fakeStringSchema = { ...value, type: "string" } as SchemaObject;
          const config = fieldConfigs.get(key);
          this.primitiveProps.push(new PrimitiveProp({ name: key, schemaObject: fakeStringSchema, required: requireds.includes(key), validator: config?.validator, customType: config?.type, isParam: undefined, isNullable: value.nullable }));
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
        this.arrayProps.push(new ArrayProp({ name, required, schemaName, schemaObject, isParam: undefined, isEnum: true, isNullable: schemaObject.nullable }));
        continue;
      } else if (value.enum) {
        this.enumProps.push(new EnumProp({ enums: value.enum, name, required, isParam: undefined, entityName: schemaName }));
        continue;
      }

      const config = fieldConfigs.get(key);
      const validator = config?.validator;
      const customType = config?.type;
      const type = value.type as ReflectorParamType;

      if (type === "object") {
        if (schemaObject.additionalProperties) {
          const fakeStringSchema = { ...schemaObject, type: "string" } as SchemaObject;
          this.primitiveProps.push(new PrimitiveProp({ name, schemaObject: fakeStringSchema, required, validator, customType, isParam: undefined, isNullable: schemaObject.nullable }));
        }
        continue;
      }

      if (type === "array") {
        this.arrayProps.push(new ArrayProp({ schemaObject, schemaName, name, required, isParam: undefined, isEnum: false, isNullable: schemaObject.nullable }));
        continue;
      }

      this.primitiveProps.push(new PrimitiveProp({ name, schemaObject, required, validator, customType, isParam: undefined, isNullable: schemaObject.nullable }));
    }
  }
}
