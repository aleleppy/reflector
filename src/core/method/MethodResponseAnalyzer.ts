import type {
  ResponsesObject,
  SchemaObject,
  ResponseObject,
  ContentObject,
  ReferenceObject,
} from "../../types/open-api-spec.interface.js";

type RefLike = { $ref: string };

const PRIMITIVE_RESPONSE_TYPES = new Set(["string", "number", "boolean", "integer", "any", "object", "array"]);

/** A successful HTTP status. Only these may define an operation's return value. */
const SUCCESS_STATUS = /^2\d\d$/;

export class MethodResponseAnalyzer {
  responseType: string | null = null;
  hasEnumResponse: boolean = false;
  isPrimitiveResponse: boolean = false;

  analyze(responses: ResponsesObject): void {
    for (const response of this.successResponses(responses)) {
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

  /**
   * Response entries that are allowed to define the return value, in
   * declaration order.
   *
   * Error responses must never win: NestJS documents them with an envelope
   * whose `data` is a nullable "enum of one" (`{ type: "object", nullable:
   * true, enum: [null] }`), which this analyzer reads as a `string` enum. On
   * an operation with no typed 2xx body — `DELETE` + `204` is the common one —
   * that envelope used to become the return type, emitting `api.delete<...>`
   * typed `string` plus `data: response.data`, i.e. `.data` on a `string`.
   *
   * Everything falls back to every declared response only when the operation
   * declares no 2xx at all (specs that describe success as `default`).
   */
  private successResponses(responses: ResponsesObject): (ResponseObject | ReferenceObject)[] {
    const entries = Object.entries(responses ?? {});
    const success = entries.filter(([status]) => SUCCESS_STATUS.test(status));
    return (success.length > 0 ? success : entries).flatMap(([, response]) => (response ? [response] : []));
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
      return this.resolveEnum(schema);
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
        return this.resolveEnum(items, items.type);
      }
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
    if (data.enum) {
      return this.resolveEnum(data, data.type);
    }
    if (data.type === "array" && data.items && !this.isRef(data.items) && "enum" in data.items && data.items.enum) {
      this.hasEnumResponse = this.extractEnumName(data.items) !== null;
    }
    return data.type;
  }

  /**
   * Resolves an `enum` schema to the type name it should be typed against.
   *
   * Only a *named* enum (`x-enum-name` / `title`) yields an enum response —
   * that name is the alias emitted in `enums.ts`. An unnamed inline enum is
   * just a constrained primitive, and reporting it as an enum response made
   * the generator emit `data: response.data` over a `string`-typed body.
   */
  private resolveEnum(schema: SchemaObject, fallback?: string): string {
    const name = this.extractEnumName(schema);
    this.hasEnumResponse = name !== null;
    return name ?? fallback ?? "string";
  }

  private extractEnumName(schema: SchemaObject): string | null {
    const extended = schema as SchemaObject & { "x-enum-name"?: string };
    return extended["x-enum-name"] ?? schema.title ?? null;
  }
}
