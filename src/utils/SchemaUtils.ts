import type { ReferenceObject, SchemaObject } from "../types/open-api-spec.interface.js";

export function isEnumSchema(schema: SchemaObject): boolean {
  if (schema.enum) return true;
  if (schema.items) {
    if ("$ref" in schema.items) return false;
    if (schema.items.enum) return true;
  }
  return false;
}

export function isReferenceObject(value: unknown): value is ReferenceObject {
  return !!value && typeof value === "object" && "$ref" in value;
}

export function extractTypeFromRef(refObj: ReferenceObject): string | undefined {
  const parts = refObj.$ref.split("/");
  return parts[parts.length - 1];
}
