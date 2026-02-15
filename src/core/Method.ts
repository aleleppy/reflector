import type { ApiType } from "../types/types.js";
import type { PrimitiveProp } from "../props/primitive.property.js";
import type { ArrayProp } from "../props/array.property.js";
import type { EnumProp } from "../props/enum.property.js";
import type { ReflectorRequestType } from "../request.js";

export type AttributeProp = PrimitiveProp | ArrayProp | EnumProp;

export interface MethodAnalyzers {
  request: {
    bodyType: string | undefined;
    responseType: string | null;
    attributeType: ReflectorRequestType;
    apiType: ApiType;
    parameters: any[];
    hasEnumResponse: boolean;
  };
  props: {
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    querys: AttributeProp[];
    cookies: PrimitiveProp[];
  };
}

export class Method {
  name: string;
  endpoint: string;
  apiType: ApiType;
  attributeType: ReflectorRequestType;
  description: string | undefined = undefined;
  analyzers: MethodAnalyzers;
  responseTypeInterface: string;
  isValid: boolean = true;

  constructor(params: {
    name: string;
    endpoint: string;
    apiType: ApiType;
    attributeType: ReflectorRequestType;
    description: string | undefined;
    analyzers: MethodAnalyzers;
    responseTypeInterface: string;
  }) {
    this.name = params.name;
    this.endpoint = params.endpoint;
    this.apiType = params.apiType;
    this.attributeType = params.attributeType;
    this.description = params.description;
    this.analyzers = params.analyzers;
    this.responseTypeInterface = params.responseTypeInterface;
  }
}
