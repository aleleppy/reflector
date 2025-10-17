import { OperationObject } from "./open-api-spec.interface.js";

export type ReflectorParamType = "string" | "boolean" | "number" | "array" | "object";
export type ApiType = "get" | "post" | "delete" | "patch" | "put";
export type ReflectorOperation = OperationObject & {
  apiMethod: ApiType;
};
export type Info = {
  endpoint: string;
  operations: ReflectorOperation[];
  moduleName: string;
};

export type Example = string | boolean | number;
