import { ZodProperty } from "./property.js";
import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { ReflectorParamType } from "./types/types.js";

export class Schema {
  name: string;
  properties: ZodProperty[] = [];
  type: string;
  schema: string;

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
  }) {
    const { name, properties, requireds, isEmpty } = params;

    this.name = `${isEmpty ? "Empty" : ""}${name}`;

    for (const [key, value] of Object.entries(properties)) {
      if ("$ref" in value || !value?.type) continue;

      const required = requireds.includes(key);

      this.properties.push(
        new ZodProperty({
          name: key,
          schemaObject: value,
          type: value.type as ReflectorParamType,
          example: value.example,
          required,
          isEmpty,
          inParam: "path",
        })
      );
    }

    this.type = `export type ${this.name} = z.infer<typeof ${this.name}Schema>;`;
    this.schema = `export const ${this.name}Schema = z.object({
      ${this.properties.map((p) => {
        return p.buildedProp;
      })}
    });`;
  }
}
