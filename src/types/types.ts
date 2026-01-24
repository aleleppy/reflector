import type { OperationObject } from "./open-api-spec.interface.js";

export type ReflectorParamType = "string" | "boolean" | "number" | "array" | "object" | "enum";
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
