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

export interface FieldConfig {
  validator?: string;
  type?: string;
}

export type FieldConfigs = Map<string, FieldConfig>;

/**
 * Maps custom type names (e.g. "IconName") to their full import statements
 * (e.g. "import type { IconName } from '$lib/utils/icons/icons.type.svelte'")
 */
export type TypeImports = Map<string, string>;
export type AttributeProp = PrimitiveProp | ArrayProp | EnumProp;
export type ParamType = "Paths" | "Querys" | "Headers";
