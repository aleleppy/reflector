import type {
  RequestBodyObject,
  ReferenceObject,
  ParameterObject,
  ContentObject,
  ResponseObject,
  SchemaObject,
  ResponsesObject,
} from "./types/open-api-spec.interface.js";
import type { ApiType, ReflectorOperation } from "./types/types.js";

export type ReflectorRequestType = "entity" | "list" | "pagination" | "form" | "other";
type RefLike = { $ref: string };

function isRef<T extends object>(
  v: RequestBodyObject | ReferenceObject | ParameterObject | ContentObject | ResponseObject | SchemaObject,
): v is T & RefLike {
  return !!v && typeof v === "object" && "$ref" in v;
}

export class Request {
  readonly attributeType: ReflectorRequestType;
  readonly apiType: ApiType;

  bodyType?: string;
  responseType: string | null;
  parameters: ParameterObject[] = [];
  // inType:

  constructor(operation: ReflectorOperation) {
    this.apiType = operation.apiMethod;
    const parameters = operation.parameters;

    if (parameters) {
      parameters.forEach((p) => {
        this.parameters.push(p as ParameterObject);
      });
    }

    const body = this.getTypeFromRequestBody(operation.requestBody);
    if (body) this.bodyType = body;

    const response = this.getTypeFromResponses(operation.responses);
    this.responseType = response ?? null;

    this.attributeType = this.inferAttributeType(operation) ?? ("other" as ReflectorRequestType);
  }

  // ============= Derivações principais =======================================
  private getTypeFromRequestBody(requestBody: RequestBodyObject | ReferenceObject | undefined): string | undefined {
    if (!requestBody || isRef(requestBody)) return undefined;
    const schemaOrType = this.getFromContent(requestBody.content);
    return this.typeFromSchemaOrType(schemaOrType);
  }

  private getTypeFromResponses(responses: ResponsesObject): string | undefined {
    for (const response of Object.values(responses)) {
      if (!response || isRef(response)) continue;
      const schemaOrType = this.getFromContent(response.content);
      const t = this.typeFromSchemaOrType(schemaOrType);
      if (t !== undefined) return t;
    }
    return undefined;
  }

  private inferAttributeType(operation: ReflectorOperation): ReflectorRequestType | undefined {
    const method = operation.apiMethod;

    if (method === "post" || method === "put" || method === "patch") {
      return "form";
    }

    if (method === "get") {
      const params = operation.parameters ?? [];
      const hasPage = params.some((p) => !isRef(p) && p.name === "page");
      return (hasPage ? "list" : "entity") as ReflectorRequestType;
    }

    return undefined;
  }

  // ============= Helpers de Schema/Content ===================================
  private componentName(refObj: RefLike): string | undefined {
    const parts = refObj.$ref.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Lê o primeiro media type do ContentObject e devolve:
   *  - string com nome de componente (quando é $ref),
   *  - SchemaObject inline,
   *  - ou undefined se nada aproveitável.
   */
  private getFromContent(content: ContentObject | undefined): string | SchemaObject | undefined {
    if (!content || isRef(content)) return undefined;

    const first = Object.values(content)[0];
    const schema = first?.schema;
    if (!schema) return undefined;

    if (isRef(schema)) return this.componentName(schema);
    return schema;
  }

  /**
   * Converte um "schema ou nome de tipo" em string (ou undefined).
   * Cobre: string direta, $ref, allOf, array, properties (com foco em "data"), e fallback por `type`.
   */
  private typeFromSchemaOrType(schemaOrType: string | SchemaObject | undefined): string | undefined {
    if (!schemaOrType) return undefined;
    if (typeof schemaOrType === "string") return schemaOrType;

    const schema = schemaOrType;

    // Composição: tenta extrair de allOf[0].properties
    const allOfFirst = schema.allOf?.[0];
    if (allOfFirst && !isRef(allOfFirst)) {
      const t = this.typeFromProperties(allOfFirst.properties);
      if (t !== undefined) return t;
    }

    // Array -> tipo do item
    if (schema.type === "array" && schema.items) {
      const items = schema.items;
      if (isRef(items)) return this.componentName(items);
      return items.type;
    }

    // Properties -> prioriza "data"
    if (schema.properties) {
      const t = this.typeFromProperties(schema.properties);
      if (t !== undefined) return t;
    }

    // Fallback: usa o próprio `type`, se houver
    return schema.type;
  }

  /**
   * Extrai o tipo a partir de `properties`, priorizando a propriedade `data`.
   * Se `data` não existir ou não tiver tipo, retorna undefined.
   */
  private typeFromProperties(properties: Record<string, ReferenceObject | SchemaObject> | undefined): string | undefined {
    if (!properties?.["data"]) return undefined;

    const data = properties["data"];

    if (isRef(data)) return this.componentName(data);
    if (data.type === "any") return;
    return data.type;
  }
}
