import type { ArrayProp } from "../../props/array.property.js";
import type { EnumProp } from "../../props/enum.property.js";
import type { ObjectProp } from "../../props/object.property.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";

export interface SchemaDependencies {
  schemaDeps: string[];
  enumDeps: string[];
  customTypeDeps: string[];
}

export class SchemaDependencyCollector {
  static collect(props: {
    primitiveProps: PrimitiveProp[];
    arrayProps: ArrayProp[];
    objectProps: ObjectProp[];
    enumProps: EnumProp[];
  }): SchemaDependencies {
    const { primitiveProps, arrayProps, objectProps, enumProps } = props;

    const schemaDepsSet = new Set<string>();
    for (const prop of objectProps) {
      schemaDepsSet.add(prop.type);
    }
    for (const prop of arrayProps) {
      if (prop.isSchemaRef) {
        schemaDepsSet.add(prop.type);
      }
    }

    const enumDepsSet = new Set<string>();
    for (const prop of enumProps) {
      if (prop.enumName) enumDepsSet.add(prop.enumName);
    }
    for (const prop of arrayProps) {
      if (prop.isEnum && prop.type) enumDepsSet.add(prop.type);
    }

    const customTypeDepsSet = new Set<string>();
    for (const prop of primitiveProps) {
      if (prop.customType) customTypeDepsSet.add(prop.customType);
    }

    return {
      schemaDeps: [...schemaDepsSet],
      enumDeps: [...enumDepsSet],
      customTypeDeps: [...customTypeDepsSet],
    };
  }
}
