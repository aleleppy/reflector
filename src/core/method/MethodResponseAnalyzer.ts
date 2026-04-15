import type {
  ResponsesObject,
  SchemaObject,
  ResponseObject,
  ContentObject,
  ReferenceObject,
} from "../../types/open-api-spec.interface.js";

type RefLike = { $ref: string };

const PRIMITIVE_RESPONSE_TYPES = new Set(["string", "number", "boolean", "integer", "any", "object", "array"]);

export class MethodResponseAnalyzer {
  responseType: string | null = null;
  hasEnumResponse: boolean = false;
  isPrimitiveResponse: boolean = false;

  analyze(responses: ResponsesObject): void {
    for (const response of Object.values(responses)) {
      if (!response || this.isRef(response)) continue;
      const schemaOrType = this.getFromContent(response.content);
      const type = this.typeFromSchemaOrType(schemaOrType);
      if (type !== undefined) {
        this.isPrimitiveResponse = PRIMITIVE_RESPONSE_TYPES.has(type);
        this.responseType = this.normalizePrimitive(type);
        break;
      }
    }
  }

  private normalizePrimitive(type: string): string {
    if (type === "integer") return "number";
    if (type === "array") return "unknown[]";
    if (type === "object") return "unknown";
    return type;
  }

  private isRef<T extends object>(v: ResponseObject | ReferenceObject | ContentObject | SchemaObject): v is T & RefLike {
    return !!v && typeof v === "object" && "$ref" in v;
  }

  private componentName(refObj: RefLike): string | undefined {
    const parts = refObj.$ref.split("/");
    const name = parts[parts.length - 1];
    if (name?.toLowerCase() === "response") return undefined;
    return name;
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
    if (typeof schemaOrType === "string") {
      this.hasEnumResponse = false;
      return schemaOrType;
    }

    const schema = schemaOrType;

    if (schema.enum) {
      this.hasEnumResponse = true;
      return this.extractEnumType(schema);
    }

    if (schema.allOf) {
      for (const entry of schema.allOf) {
        if (this.isRef(entry)) continue;
        const t = this.typeFromProperties(entry.properties);
        if (t !== undefined) return t;
      }
    }

    if (schema.type === "array" && schema.items) {
      const items = schema.items;
      if (this.isRef(items)) return this.componentName(items);
      if (items.enum) {
        this.hasEnumResponse = true;
        return this.extractEnumType(items);
      }
      return items.type;
    }

    if (schema.properties) {
      const t = this.typeFromProperties(schema.properties);
      if (t !== undefined) return t;
    }

    return schema.type;
  }

  private extractEnumType(schema: SchemaObject): string {
    const extended = schema as SchemaObject & { "x-enum-name"?: string };
    if (extended["x-enum-name"]) {
      return extended["x-enum-name"];
    }
    if (schema.title) {
      return schema.title;
    }
    return "string";
  }

  private typeFromProperties(properties: Record<string, ReferenceObject | SchemaObject> | undefined): string | undefined {
    if (!properties?.["data"]) return undefined;

    const data = properties["data"];

    if (this.isRef(data)) return this.componentName(data);
    if (data.type === "any") return undefined;
    if (data.enum) {
      this.hasEnumResponse = true;
      return this.extractEnumType(data);
    }
    if (data.type === "array" && data.items && !this.isRef(data.items) && "enum" in data.items && data.items.enum) {
      this.hasEnumResponse = true;
    }
    return data.type;
  }
}
