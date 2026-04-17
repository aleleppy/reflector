import type { ApiType, ReflectorOperation, ReflectorRequestType } from "../../types/types.js";
import type { PrimitiveProp } from "../../props/primitive.property.js";
import type { ArrayProp } from "../../props/array.property.js";
import type { EnumProp } from "../../props/enum.property.js";
import type { CodegenContext } from "../CodegenContext.js";
import { MethodBuilder } from "./MethodBuilder.js";
import { MethodGenerator } from "./generators/MethodGenerator.js";

export type AttributeProp = PrimitiveProp | ArrayProp | EnumProp;

export interface MethodAnalyzers {
  request: {
    bodyType: string | undefined;
    responseType: string | null;
    attributeType: ReflectorRequestType;
    apiType: ApiType;
    parameters: unknown[];
    hasEnumResponse: boolean;
    isPrimitiveResponse: boolean;
  };
  props: {
    paths: PrimitiveProp[];
    headers: PrimitiveProp[];
    querys: AttributeProp[];
    cookies: PrimitiveProp[];
  };
}

export class Method {
  readonly name: string;
  readonly endpoint: string;
  readonly apiType: ApiType;
  readonly attributeType: ReflectorRequestType;
  readonly description: string | undefined;
  readonly analyzers: MethodAnalyzers;
  readonly responseTypeInterface: string;
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

  static fromOperation(operation: ReflectorOperation, moduleName: string, context: CodegenContext): Method {
    return new MethodBuilder().build(operation, moduleName, context);
  }

  get request() {
    return this.analyzers.request;
  }

  get headers(): PrimitiveProp[] {
    return this.analyzers.props.headers;
  }

  get cookies(): PrimitiveProp[] {
    return this.analyzers.props.cookies;
  }

  get paths(): PrimitiveProp[] {
    return this.analyzers.props.paths;
  }

  get querys(): AttributeProp[] {
    return this.analyzers.props.querys;
  }

  build(): string {
    return new MethodGenerator().generate(this);
  }
}
