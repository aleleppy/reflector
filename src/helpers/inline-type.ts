import { isReferenceObject } from "./helpers.js";
import type { ReferenceObject, SchemaObject } from "../types/open-api-spec.interface.js";

const PRIMITIVE_TS_TYPES: Record<string, string> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
};

export interface InlineType {
  /** TS type expression, e.g. `string`, `Record<string, FooInterface>`, `("A" | "B")[]`. */
  type: string;
  /** Component schema names the expression references (their `Interface` must be in scope). */
  refs: string[];
}

const UNKNOWN: InlineType = { type: "unknown", refs: [] };

/**
 * TS type of a schema that is rendered inline instead of becoming its own class:
 * `$ref`s, primitives, enum literals, arrays of those and free-form maps
 * (`type: object` + `additionalProperties`, or a bare `type: object`).
 *
 * Inline objects with their own `properties` belong to the `InlineSchemaPromoter`;
 * one that reaches here un-promoted has no nameable shape and falls back to `unknown`.
 */
export function inlineType(schema: SchemaObject | ReferenceObject): InlineType {
  if (isReferenceObject(schema)) {
    const name = schema.$ref.split("/").at(-1);
    return name ? { type: `${name}Interface`, refs: [name] } : UNKNOWN;
  }

  const nullable = schema.nullable ? " | null" : "";

  if (schema.enum?.length) {
    return { type: schema.enum.map((value) => JSON.stringify(value)).join(" | ") + nullable, refs: [] };
  }

  if (schema.type === "array") {
    const item = schema.items ? inlineType(schema.items) : UNKNOWN;
    return { type: `(${item.type})[]${nullable}`, refs: item.refs };
  }

  if (isFreeFormMap(schema)) {
    const { additionalProperties } = schema;
    const value = typeof additionalProperties === "object" ? inlineType(additionalProperties) : UNKNOWN;
    return { type: `Record<string, ${value.type}>${nullable}`, refs: value.refs };
  }

  const primitive = schema.type ? PRIMITIVE_TS_TYPES[schema.type] : undefined;
  return { type: (primitive ?? "unknown") + nullable, refs: [] };
}

/** `additionalProperties` map, or a `type: object` that declares no `properties` at all. */
export function isFreeFormMap(schema: SchemaObject): boolean {
  if (schema.properties || schema.allOf || schema.oneOf) return false;
  return !!schema.additionalProperties || schema.type === "object";
}
