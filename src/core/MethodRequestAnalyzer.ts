import type { ReflectorOperation, AttributeProp } from "../types/types.js";
import type { PrimitiveProp } from "../props/primitive.property.js";

import { PrimitiveProp as PrimitivePropClass } from "../props/primitive.property.js";
import { ArrayProp as ArrayPropClass } from "../props/array.property.js";
import { EnumProp as EnumPropClass } from "../props/enum.property.js";

export class MethodRequestAnalyzer {
  paths: PrimitiveProp[] = [];
  headers: PrimitiveProp[] = [];
  querys: AttributeProp[] = [];
  cookies: PrimitiveProp[] = [];

  analyze(operation: ReflectorOperation, moduleName: string): void {
    if (!operation.parameters || operation.parameters.length === 0) return;

    for (const object of operation.parameters) {
      if ("$ref" in object) continue;
      if (!object.schema) continue;

      const { required, name, schema, in: inParam } = object;

      if ("$ref" in schema) continue;

      const isRequired = !!required;
      const baseProps = { name, required: isRequired, schemaObject: schema, validator: undefined, isParam: true };

      if (inParam === "query") {
        this.processQueryParam(name, schema, moduleName, isRequired);
      } else if (inParam === "header") {
        this.headers.push(new PrimitivePropClass(baseProps));
      } else if (inParam === "path") {
        this.paths.push(new PrimitivePropClass(baseProps));
      } else if (inParam === "cookie") {
        this.cookies.push(new PrimitivePropClass(baseProps));
      }
    }
  }

  private processQueryParam(name: string, schema: any, moduleName: string, isRequired: boolean): void {
    if (schema.type === "array") {
      this.querys.push(
        new ArrayPropClass({
          name,
          schemaObject: schema,
          schemaName: moduleName,
          isParam: true,
          isEnum: false,
          required: isRequired,
        }),
      );
      return;
    }

    if (schema.enum) {
      this.querys.push(
        new EnumPropClass({ name, required: isRequired, enums: schema.enum, isParam: true, entityName: moduleName }),
      );
      return;
    }

    this.querys.push(
      new PrimitivePropClass({ name, required: isRequired, schemaObject: schema, validator: undefined, isParam: true }),
    );
  }

  getProps() {
    return {
      paths: this.paths,
      headers: this.headers,
      querys: this.querys,
      cookies: this.cookies,
    };
  }
}
