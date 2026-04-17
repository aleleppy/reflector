import { Schema } from "./Schema.js";
import { isReferenceObject } from "../../helpers/helpers.js";

import type { ComponentsObject } from "../../types/open-api-spec.interface.js";
import type { FieldConfigs } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";

export class SchemaRegistry {
  readonly schemas: Schema[] = [];
  readonly propertiesNames = new Set<string>();
  private readonly schemaMap = new Map<string, Schema>();

  constructor(params: {
    components: ComponentsObject;
    fieldConfigs: FieldConfigs;
    context: CodegenContext;
  }) {
    const { components, fieldConfigs, context } = params;
    const componentSchemas = components.schemas;

    if (!componentSchemas) return;

    for (const [key, object] of Object.entries(componentSchemas)) {
      if (isReferenceObject(object) || !object.properties) continue;

      const properties = object.properties;

      const schema = {
        properties,
        name: key,
        requireds: object.required || [],
      };

      Object.keys(properties).forEach((prop) => {
        this.propertiesNames.add(prop);
      });

      this.schemas.push(new Schema({ ...schema, isEmpty: false, fieldConfigs, context }));
    }

    for (const schema of this.schemas) {
      this.schemaMap.set(schema.name, schema);
    }

    console.log(`${this.schemas.length} schemas generated successfully.`);
  }

  /** Resolve transitive schema dependencies from a list of schema class names */
  resolveTransitiveDeps(names: string[]): Schema[] {
    const resolved = new Set<string>();
    const stack = [...names];

    while (stack.length > 0) {
      const name = stack.pop()!;
      if (resolved.has(name)) continue;

      const schema = this.schemaMap.get(name);
      if (!schema) continue;

      resolved.add(name);
      for (const dep of schema.schemaDeps) {
        if (!resolved.has(dep)) {
          stack.push(dep);
        }
      }
    }

    return [...resolved].map((n) => this.schemaMap.get(n)!).filter(Boolean);
  }
}
