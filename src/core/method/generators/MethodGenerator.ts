import type { Method } from "../Method.js";
import { CallMethodGenerator } from "../../generators/CallMethodGenerator.js";
import { ModuleCallStrategy } from "../../generators/ModuleCallStrategy.js";

export class MethodGenerator {
  private readonly generator = new CallMethodGenerator();
  private readonly strategy = new ModuleCallStrategy();

  generate(method: Method): string {
    return this.generator.generate(method, this.strategy);
  }
}
