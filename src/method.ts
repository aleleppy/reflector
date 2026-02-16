import { MethodBuilder } from "./core/method/MethodBuilder.js";
import { MethodGenerator } from "./core/method/generators/MethodGenerator.js";
import type { ReflectorOperation, AttributeProp } from "./types/types.js";
import type { PrimitiveProp } from "./props/primitive.property.js";

export class Method {
  private readonly builder = new MethodBuilder();
  private readonly generator = new MethodGenerator();

  name: string;
  endpoint: string;
  description: string | undefined;
  isValid: boolean = true;

  private readonly method: ReturnType<MethodBuilder["build"]>;

  get request() {
    return this.method.analyzers.request;
  }

  get headers(): PrimitiveProp[] {
    return this.method.analyzers.props.headers;
  }

  get cookies(): PrimitiveProp[] {
    return this.method.analyzers.props.cookies;
  }

  get paths(): PrimitiveProp[] {
    return this.method.analyzers.props.paths;
  }

  get querys(): AttributeProp[] {
    return this.method.analyzers.props.querys;
  }

  constructor(params: { operation: ReflectorOperation; moduleName: string }) {
    const { operation, moduleName } = params;
    this.method = this.builder.build(operation, moduleName);

    this.name = this.method.name;
    this.endpoint = this.method.endpoint;
    this.description = this.method.description;
  }

  build(): string {
    return this.generator.generate(this.method);
  }
}
