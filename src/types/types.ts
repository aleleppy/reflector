import type { ArrayProp } from "../props/array.property.js";
import type { EnumProp } from "../props/enum.property.js";
import type { PrimitiveProp } from "../props/primitive.property.js";
import type { OperationObject } from "./open-api-spec.interface.js";

export type ReflectorParamType = "string" | "boolean" | "number" | "array" | "object" | "enum" | "any";
export type ReflectorRequestType = "entity" | "list" | "pagination" | "form" | "other";
export type ApiType = "get" | "post" | "delete" | "patch" | "put";
export type ReflectorOperation = OperationObject & {
  apiMethod: ApiType;
  endpoint: string;
};
export type Info = {
  path: string;
  operations: ReflectorOperation[];
  moduleName: string;
};

export type Example = string | boolean | number;

/** Payload a `fieldConfigs` entry attaches to a generated primitive field. */
export interface FieldConfig {
  validator?: string;
  sanitizer?: string;
  type?: string;
}

/**
 * How a `fieldConfigs` entry selects properties: by property name (`fields`)
 * or by the property's OpenAPI `format` (`formats`). Exactly one per entry.
 */
export type FieldConfigMatcher = "fields" | "formats";

/** One `fieldConfigs` entry as parsed from the consumer's `reflector.config.ts`. */
export interface ParsedFieldConfig {
  matcher: FieldConfigMatcher;
  /** Property names (`fields`) or OpenAPI format names (`formats`), per `matcher`. */
  names: string[];
  config: FieldConfig;
}

/**
 * Field configs indexed per matcher. Resolution per property: a `format`
 * match wins over a name match (see `resolveFieldConfig`); no merging.
 */
export interface FieldConfigs {
  readonly byField: ReadonlyMap<string, FieldConfig>;
  readonly byFormat: ReadonlyMap<string, FieldConfig>;
}

/**
 * Maps custom type names (e.g. "IconName") to their full import statements
 * (e.g. "import type { IconName } from '$lib/utils/icons/icons.type.svelte'")
 */
export type TypeImports = Map<string, string>;
export type AttributeProp = PrimitiveProp | ArrayProp | EnumProp;
export type ParamType = "Paths" | "Querys" | "Headers";
