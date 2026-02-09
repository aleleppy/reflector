import { ArrayProp } from "./array.property.js";
import { capitalizeFirstLetter } from "./helpers/helpers.js";
import { ReflectorInterface } from "./interface.js";
import { ObjectProp } from "./object.property.js";
import { PrimitiveProp } from "./primitive-property.js";

import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators, ReflectorParamType } from "./types/types.js";

export class Schema {
  name: string;

  primitiveProps: PrimitiveProp[] = [];
  arrayProps: ArrayProp[] = [];
  objectProps: ObjectProp[] = [];

  schema: string;
  enums = new Set<string>();
  objects = new Map<string, string>();
  interface: string;

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
    validators: FieldValidators;
  }) {
    const { name, properties, requireds, isEmpty, validators } = params;

    this.name = `${isEmpty ? "Empty" : ""}${name}`;

    for (const [key, value] of Object.entries(properties)) {
      if ("$ref" in value || !value?.type) {
        if ("allOf" in value) {
          const ref = value.allOf?.[0];
          const isRequired = !!value.nullable;
          const nullable = !!value.nullable;

          if (key === "companyReply") {
            console.log(isRequired, value.nullable);
          }

          if (ref && "$ref" in ref) {
            this.objectProps.push(new ObjectProp({ name: key, referenceObject: ref, isRequired, isNullable: nullable }));
          }
        } else if ("$ref" in value) {
          this.objectProps.push(new ObjectProp({ name: key, referenceObject: value }));
        }
        continue;
      }

      const required = requireds.includes(key);

      const teste = value.items;

      // const enumName = `Enum${treatAndUpper(name)}${capitalizeFirstLetter(key)}`;

      if (teste && !("$ref" in teste) && teste.enum) {
        this.enums.add(this.getEnumConst({ enums: teste.enum, schemaName: key }));
      } else if (value.enum) {
        this.enums.add(this.getEnumConst({ enums: value.enum, schemaName: key }));
      }

      const validator = validators.get(key);
      const type = value.type as ReflectorParamType;

      if (type === "object") continue;

      if (type === "array") {
        this.arrayProps.push(new ArrayProp({ schemaObject: value, schemaName: this.name, name: key, required }));
      } else {
        this.primitiveProps.push(new PrimitiveProp({ name: key, schemaObject: value, required, validator }));
      }
    }

    const reflectorInterface = new ReflectorInterface({
      name: this.name,
      arrayProps: this.arrayProps,
      primitiveProps: this.primitiveProps,
      objectProps: this.objectProps,
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

  private getEnumConst(params: { enums: string[]; schemaName: string }) {
    const { enums, schemaName } = params;

    const enumList = enums.map((en) => `'${en}'`).join("|");

    return `export type Enum${capitalizeFirstLetter(schemaName)} = ${enumList}`;
  }
}
