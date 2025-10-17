import { ZodProperty } from "./property.js";
import { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import { ReflectorParamType } from "./types/types.js";

export class Schema {
  name: string;
  properties: ZodProperty[] = [];
  type: string;
  schema: string;

  constructor(params: { properties: Record<string, SchemaObject | ReferenceObject>; name: string; requireds: string[] }) {
    const { name, properties, requireds } = params;
    this.name = name;

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
        })
      );
    }

    this.type = `export type ${name} = z.infer<typeof ${name}Schema>;`;
    this.schema = `export const ${name}Schema = z.object({
      ${this.properties.map((p) => p.buildedProp)}
    });`;
  }
}
