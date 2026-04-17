import { ArrayProp } from "../../props/array.property.js";
import { EnumProp } from "../../props/enum.property.js";
import { ObjectProp } from "../../props/object.property.js";
import { PrimitiveProp } from "../../props/primitive.property.js";

import type { SchemaObject, ReferenceObject } from "../../types/open-api-spec.interface.js";
import type { FieldConfigs, ReflectorParamType } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";
import { isReferenceObject } from "../../helpers/helpers.js";

export type ClassifiedProp = PrimitiveProp | ArrayProp | ObjectProp | EnumProp;

export class SchemaPropertyClassifier {
  static classify(params: {
    key: string;
    value: ReferenceObject | SchemaObject;
    requireds: string[];
    fieldConfigs: FieldConfigs;
    schemaName: string;
    context: CodegenContext;
  }): ClassifiedProp | null {
    const { key, value, requireds, fieldConfigs, schemaName, context } = params;

    if (isReferenceObject(value) || !value?.type) {
      if (!isReferenceObject(value) && value.additionalProperties) {
        const fakeStringSchema = { ...value, type: "string" } as SchemaObject;
        const config = fieldConfigs.get(key);
        return new PrimitiveProp({
          name: key,
          schemaObject: fakeStringSchema,
          required: requireds.includes(key),
          validator: config?.validator,
          customType: config?.type,
          isParam: undefined,
          isNullable: value.nullable,
        });
      }
      return SchemaPropertyClassifier.classifyObject({ key, value });
    }

    const required = requireds.includes(key);
    const items = value.items;

    if (items && !isReferenceObject(items) && items.enum) {
      return new ArrayProp({
        name: key,
        required,
        schemaName,
        schemaObject: value,
        isParam: undefined,
        isEnum: true,
        isNullable: value.nullable,
        context,
      });
    }

    if (value.enum) {
      return new EnumProp({
        enums: value.enum,
        name: key,
        required,
        isParam: undefined,
        entityName: schemaName,
        context,
      });
    }

    const config = fieldConfigs.get(key);
    const validator = config?.validator;
    const customType = config?.type;
    const type = value.type as ReflectorParamType;

    if (type === "object") {
      if (value.additionalProperties) {
        const fakeStringSchema = { ...value, type: "string" } as SchemaObject;
        return new PrimitiveProp({
          name: key,
          schemaObject: fakeStringSchema,
          required,
          validator,
          customType,
          isParam: undefined,
          isNullable: value.nullable,
        });
      }
      return null;
    }

    if (type === "array") {
      return new ArrayProp({
        schemaObject: value,
        schemaName,
        name: key,
        required,
        isParam: undefined,
        isEnum: false,
        isNullable: value.nullable,
        context,
      });
    }

    return new PrimitiveProp({
      name: key,
      schemaObject: value,
      required,
      validator,
      customType,
      isParam: undefined,
      isNullable: value.nullable,
    });
  }

  private static classifyObject(params: {
    value: ReferenceObject | SchemaObject;
    key: string;
  }): ObjectProp | null {
    const { value, key } = params;

    if ("allOf" in value) {
      const ref = value.allOf?.[0];
      const isRequired = !!value.nullable;
      const nullable = !!value.nullable;

      if (ref && isReferenceObject(ref)) {
        return new ObjectProp({ name: key, referenceObject: ref, isRequired, isNullable: nullable });
      }
      return null;
    }

    if (isReferenceObject(value)) {
      return new ObjectProp({ name: key, referenceObject: value });
    }

    return null;
  }
}
