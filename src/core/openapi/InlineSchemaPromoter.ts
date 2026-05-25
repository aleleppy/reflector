import { capitalizeFirstLetter, isReferenceObject } from "../../helpers/helpers.js";
import type {
  ComponentsObject,
  OperationObject,
  PathsObject,
  ReferenceObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from "../../types/open-api-spec.interface.js";

const HTTP_METHODS = ["get", "put", "post", "delete", "patch", "options", "head", "trace"] as const;

/**
 * Promotes inline request-body and response `data` schemas to named
 * components in the OpenAPI document, mutating the provided objects.
 *
 * Without this, `MethodBodyAnalyzer` falls back to `schema.type` ("object")
 * because inline bodies aren't referenced by a `$ref`, and the resulting
 * body type name collides with the JS primitive — so the generated module
 * imports a non-existent `{ object }` class and the schema file is never
 * emitted (resolveTransitiveDeps finds nothing in schemaMap).
 *
 * Responses in this API follow a `{success, data, message}` envelope where
 * `data` is either declared directly or overlaid via `allOf`. When `data` is
 * an inline object/array (no `$ref`), the response analyzer can only
 * extract the raw `schema.type` ("object"/"array"), which isn't a valid
 * class name. Promoting `data` to a named component gives the analyzer a
 * proper `$ref` to resolve.
 */
export class InlineSchemaPromoter {
  static promote(components: ComponentsObject, paths: PathsObject): void {
    InlineSchemaPromoter.promoteBodies(components, paths);
    InlineSchemaPromoter.promoteResponses(components, paths);
    InlineSchemaPromoter.promoteNestedObjects(components);
  }

  /**
   * Recursively promotes inline object and array-of-object schemas nested
   * inside named component schemas to their own named components, replacing
   * them with a `$ref`.
   *
   * The rest of the pipeline already resolves `$ref` correctly (`ObjectProp`
   * for object properties, `ArrayProp.getType` for array items), but it
   * silently DROPS inline objects (`SchemaPropertyClassifier.classify` returns
   * `null` for `type: "object"` without `$ref`) and DEGRADES inline
   * arrays-of-object to `string[]` (`array.property.ts` fallback). Promoting
   * them upfront routes both through the working `$ref` path, producing typed
   * child classes instead of `string[]` / dropped fields.
   *
   * Runs after body/response promotion so it also covers the freshly promoted
   * envelope schemas. Uses a worklist so newly created child schemas are
   * themselves scanned for deeper nesting.
   */
  private static promoteNestedObjects(components: ComponentsObject): void {
    const schemas = components.schemas;
    if (!schemas) return;

    const usedNames = new Set(Object.keys(schemas));
    const queue = Object.keys(schemas);

    while (queue.length > 0) {
      const schemaName = queue.shift()!;
      const schema = schemas[schemaName];
      if (!schema || "$ref" in schema) continue;

      // Array-root schema (e.g. a promoted `data: array` response): promote its
      // inline-object items to a named `${schemaName}Item` so they get a typed
      // child schema instead of staying inline and degrading to `string[]`.
      if (!schema.properties && schema.type === "array") {
        const inlineItems = InlineSchemaPromoter.extractableInlineArrayItems(schema);
        if (inlineItems) {
          const name = InlineSchemaPromoter.reserveNestedName(usedNames, schemaName, "item");
          schemas[name] = inlineItems;
          queue.push(name);
          schema.items = { $ref: `#/components/schemas/${name}` };
        }
        continue;
      }

      if (!schema.properties) continue;

      for (const [propKey, propValue] of Object.entries(schema.properties)) {
        if (isReferenceObject(propValue)) continue;

        const inlineObject = InlineSchemaPromoter.extractableInlineObject(propValue);
        if (inlineObject) {
          const name = InlineSchemaPromoter.reserveNestedName(usedNames, schemaName, propKey);
          schemas[name] = inlineObject;
          queue.push(name);
          schema.properties[propKey] = InlineSchemaPromoter.refForProperty(name, propValue.nullable);
          continue;
        }

        const inlineItems = InlineSchemaPromoter.extractableInlineArrayItems(propValue);
        if (inlineItems) {
          const name = InlineSchemaPromoter.reserveNestedName(usedNames, schemaName, propKey);
          schemas[name] = inlineItems;
          queue.push(name);
          propValue.items = { $ref: `#/components/schemas/${name}` };
        }
      }
    }
  }

  /** Inline object with own `properties` (not a free-form `additionalProperties` map). */
  private static extractableInlineObject(value: SchemaObject): SchemaObject | null {
    if (value.type !== "object" || value.additionalProperties || !value.properties) return null;
    return value;
  }

  /** `type: array` whose `items` is an inline object with `properties`. */
  private static extractableInlineArrayItems(value: SchemaObject): SchemaObject | null {
    if (value.type !== "array" || !value.items || isReferenceObject(value.items)) return null;
    const items = value.items;
    if (items.type !== "object" || items.additionalProperties || !items.properties) return null;
    return items;
  }

  private static reserveNestedName(usedNames: Set<string>, parent: string, prop: string): string {
    const base = `${parent}${capitalizeFirstLetter(prop.replaceAll(/[^a-zA-Z0-9]/g, ""))}`;
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}${suffix++}`;
    }
    usedNames.add(name);
    return name;
  }

  /**
   * OpenAPI 3.0 forbids siblings next to `$ref`, so a nullable object property
   * must wrap the ref in `allOf` + `nullable` — the form `classifyObject`
   * already understands. Non-nullable properties use a bare `$ref`.
   */
  private static refForProperty(name: string, nullable: boolean | undefined): SchemaObject | ReferenceObject {
    const ref: ReferenceObject = { $ref: `#/components/schemas/${name}` };
    if (nullable) return { allOf: [ref], nullable: true };
    return ref;
  }

  private static promoteBodies(components: ComponentsObject, paths: PathsObject) {
    components.schemas ??= {};
    const schemas = components.schemas;
    const usedNames = new Set(Object.keys(schemas));

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const httpMethod of HTTP_METHODS) {
        InlineSchemaPromoter.promoteInlineBody(pathItem[httpMethod], httpMethod, pathStr, schemas, usedNames);
      }
    }
  }

  private static promoteInlineBody(
    operation: OperationObject | undefined,
    httpMethod: string,
    pathStr: string,
    schemas: Record<string, SchemaObject | ReferenceObject>,
    usedNames: Set<string>,
  ) {
    if (!operation?.requestBody || "$ref" in operation.requestBody) return;
    const firstEntry = Object.values(operation.requestBody.content ?? {})[0];
    const schema = firstEntry?.schema;
    if (!schema || "$ref" in schema || !schema.properties) return;

    const base = operation.operationId
      ? capitalizeFirstLetter(operation.operationId)
      : capitalizeFirstLetter(httpMethod) + pathStr.replaceAll(/[^a-zA-Z0-9]/g, "");

    let name = `${base}Body`;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}Body${suffix++}`;
    }
    usedNames.add(name);

    schemas[name] = schema;
    firstEntry.schema = { $ref: `#/components/schemas/${name}` };
  }

  private static promoteResponses(components: ComponentsObject, paths: PathsObject) {
    components.schemas ??= {};
    const schemas = components.schemas;
    const usedNames = new Set(Object.keys(schemas));

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const httpMethod of HTTP_METHODS) {
        InlineSchemaPromoter.promoteInlineResponse(pathItem[httpMethod], httpMethod, pathStr, schemas, usedNames);
      }
    }
  }

  private static promoteInlineResponse(
    operation: OperationObject | undefined,
    httpMethod: string,
    pathStr: string,
    schemas: Record<string, SchemaObject | ReferenceObject>,
    usedNames: Set<string>,
  ) {
    if (!operation?.responses) return;

    const successResponse = InlineSchemaPromoter.findSuccessResponse(operation.responses);
    if (!successResponse || "$ref" in successResponse || !successResponse.content) return;

    const firstEntry = Object.values(successResponse.content)[0];
    const schema = firstEntry?.schema;
    if (!schema || "$ref" in schema) return;

    const dataHolder = InlineSchemaPromoter.findInlineDataHolder(schema);
    if (!dataHolder) return;

    const base = operation.operationId
      ? capitalizeFirstLetter(operation.operationId)
      : capitalizeFirstLetter(httpMethod) + pathStr.replaceAll(/[^a-zA-Z0-9]/g, "");

    let name = `${base}Response`;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}Response${suffix++}`;
    }
    usedNames.add(name);

    schemas[name] = dataHolder.data;
    dataHolder.replace({ $ref: `#/components/schemas/${name}` });
  }

  private static findSuccessResponse(responses: ResponsesObject): ResponseObject | ReferenceObject | undefined {
    for (const [code, response] of Object.entries(responses)) {
      if (code.startsWith("2")) return response;
    }
    return undefined;
  }

  /**
   * Locates the inline `data` sub-schema inside a response envelope, whether
   * it lives at `schema.properties.data` or inside an `allOf` entry. Returns
   * a handle that lets the caller swap the inline schema for a `$ref`.
   */
  private static findInlineDataHolder(
    schema: SchemaObject,
  ): { data: SchemaObject; replace: (ref: ReferenceObject) => void } | null {
    const holders: { properties?: Record<string, SchemaObject | ReferenceObject> }[] = [];
    if (schema.properties) holders.push(schema as { properties: Record<string, SchemaObject | ReferenceObject> });
    if (schema.allOf) {
      for (const entry of schema.allOf) {
        if (!("$ref" in entry) && entry.properties) {
          holders.push(entry as { properties: Record<string, SchemaObject | ReferenceObject> });
        }
      }
    }

    for (const holder of holders) {
      const data = holder.properties?.["data"];
      if (!data || "$ref" in data) continue;
      if (!InlineSchemaPromoter.hasExtractableContent(data)) continue;
      return {
        data,
        replace: (ref) => {
          holder.properties!["data"] = ref;
        },
      };
    }

    return null;
  }

  private static hasExtractableContent(schema: SchemaObject): boolean {
    if (schema.properties) return true;
    if (schema.items) return true;
    if (schema.allOf?.length) return true;
    return false;
  }
}
