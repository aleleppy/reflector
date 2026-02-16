import type { ReflectorOperation } from "../../types/types.js";
import type { RequestBodyObject, ReferenceObject, ContentObject, SchemaObject } from "../../types/open-api-spec.interface.js";

export class MethodBodyAnalyzer {
  bodyType?: string;

  analyze(operation: ReflectorOperation): string | undefined {
    const body = this.getTypeFromRequestBody(operation.requestBody);
    if (body) this.bodyType = body;
    return this.bodyType;
  }

  private getTypeFromRequestBody(requestBody: RequestBodyObject | ReferenceObject | undefined): string | undefined {
    if (!requestBody || this.isRef(requestBody)) return undefined;
    const schemaOrType = this.getFromContent(requestBody.content);
    return this.typeFromSchemaOrType(schemaOrType);
  }

  private isRef<T extends object>(
    v: RequestBodyObject | ReferenceObject | ContentObject | SchemaObject,
  ): v is T & { $ref: string } {
    return !!v && typeof v === "object" && "$ref" in v;
  }

  private componentName(refObj: { $ref: string }): string | undefined {
    const parts = refObj.$ref.split("/");
    return parts[parts.length - 1];
  }

  private getFromContent(content: ContentObject | undefined): string | SchemaObject | undefined {
    if (!content || this.isRef(content)) return undefined;

    const first = Object.values(content)[0];
    const schema = first?.schema;
    if (!schema) return undefined;

    if (this.isRef(schema)) return this.componentName(schema);
    return schema;
  }

  private typeFromSchemaOrType(schemaOrType: string | SchemaObject | undefined): string | undefined {
    if (!schemaOrType) return undefined;
    if (typeof schemaOrType === "string") return schemaOrType;

    const schema = schemaOrType;

    if (schema.enum) {
      const enumName = schema["x-enumNames"];
      if (Array.isArray(enumName)) return schema.title || "string";
      return schema.title || enumName || "string";
    }

    const allOfFirst = schema.allOf?.[0];
    if (allOfFirst && !this.isRef(allOfFirst)) {
      const t = this.typeFromProperties(allOfFirst.properties);
      if (t !== undefined) return t;
    }

    if (schema.type === "array" && schema.items) {
      const items = schema.items;
      if (this.isRef(items)) return this.componentName(items);
      if (items.enum) return items.title || (items as SchemaObject & { "x-enumNames"?: string })["x-enumNames"] || "string";
      return items.type;
    }

    if (schema.properties) {
      const t = this.typeFromProperties(schema.properties);
      if (t !== undefined) return t;
    }

    return schema.type;
  }

  private typeFromProperties(properties: Record<string, ReferenceObject | SchemaObject> | undefined): string | undefined {
    if (!properties?.["data"]) return undefined;

    const data = properties["data"];

    if (this.isRef(data)) return this.componentName(data);
    if (data.type === "any") return undefined;
    if (data.enum) return data.title || (data as SchemaObject & { "x-enumNames"?: string })["x-enumNames"] || "string";
    return data.type;
  }
}
