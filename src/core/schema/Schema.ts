import { ArrayProp } from "../../props/array.property.js";
import { EnumProp } from "../../props/enum.property.js";
import { ObjectProp } from "../../props/object.property.js";
import { PrimitiveProp } from "../../props/primitive.property.js";
import { UnionProp } from "../../props/union.property.js";

import { isReferenceObject } from "../../helpers/helpers.js";
import type { SchemaObject, ReferenceObject } from "../../types/open-api-spec.interface.js";
import type { FieldConfigs } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";

import { SchemaPropertyClassifier } from "./SchemaPropertyClassifier.js";
import { SchemaDependencyCollector } from "./SchemaDependencyCollector.js";
import { SchemaClassRenderer } from "./SchemaClassRenderer.js";
import { ArraySchemaRenderer } from "./ArraySchemaRenderer.js";

export class Schema {
  name: string;

  primitiveProps: PrimitiveProp[] = [];
  arrayProps: ArrayProp[] = [];
  objectProps: ObjectProp[] = [];
  enumProps: EnumProp[] = [];
  unionProps: UnionProp[] = [];

  /** Other schema class names this schema depends on (via ObjectProp/$ref arrays) */
  readonly schemaDeps: string[];
  /** Enum type names used by this schema */
  readonly enumDeps: string[];
  /** Custom type names used by this schema (from fieldConfigs) */
  readonly customTypeDeps: string[];
  /** Sanitizer refs used by this schema (from fieldConfigs) — gates the `sanitizers` import */
  readonly sanitizerDeps: string[];

  schema: string;
  interface: string;
  /**
   * Qual helper de runtime o `bundle()` renderizado referencia — controla os imports
   * do schema file. `'strict'` = response (bundleStrict), `'inputs'` = request
   * (bundleInputs), `null` = array-root (mapeia `item.bundle()`, não usa nenhum).
   */
  bundleHelper: "strict" | "inputs" | null;

  /**
   * Builds a Schema for an array-root component (top-level `type: array`), e.g.
   * a promoted `data: array` response envelope. Renders a wrapper class whose
   * `data` is `Item[]` (hydrated `new Item({ data })` when items are a `$ref`)
   * and whose interface is a bare array alias. Object-root schemas use the
   * regular constructor instead.
   */
  static forArrayRoot(params: {
    name: string;
    items: SchemaObject | ReferenceObject;
    context: CodegenContext;
  }): Schema {
    const { name, items, context } = params;
    const element = Schema.resolveArrayElement(items, name, context);

    const schema = Object.create(Schema.prototype) as Schema;
    schema.name = name;
    schema.primitiveProps = [];
    schema.arrayProps = [];
    schema.objectProps = [];
    schema.enumProps = [];
    schema.unionProps = [];
    (schema as { schemaDeps: string[] }).schemaDeps = element.kind === "ref" ? [element.type] : [];
    (schema as { enumDeps: string[] }).enumDeps = element.kind === "enum" ? [element.type] : [];
    (schema as { customTypeDeps: string[] }).customTypeDeps = [];
    (schema as { sanitizerDeps: string[] }).sanitizerDeps = [];

    const rendered = ArraySchemaRenderer.render({
      name,
      elementType: element.type,
      isRef: element.kind === "ref",
    });
    schema.interface = rendered.interface;
    schema.schema = rendered.schema;
    schema.bundleHelper = null;

    return schema;
  }

  /**
   * Resolves the element type of an array-root schema. Inline-object items are
   * already promoted to a `$ref` by `InlineSchemaPromoter`, so by here items is
   * a `$ref`, an enum, a free-form object (→ `Record<string, unknown>`), or a
   * primitive. `ArrayProp` is reused for ref/enum/primitive (it also registers
   * the enum type in the context); the free-form object is special-cased
   * because `ArrayProp.getType` would degrade it to `string`.
   */
  private static resolveArrayElement(
    items: SchemaObject | ReferenceObject,
    name: string,
    context: CodegenContext,
  ): { kind: "ref" | "enum" | "raw"; type: string } {
    if (isReferenceObject(items)) {
      return { kind: "ref", type: items.$ref.split("/").at(-1) as string };
    }

    if (!items.enum && items.type === "object") {
      return { kind: "raw", type: "Record<string, unknown>" };
    }

    const prop = new ArrayProp({
      name: "data",
      schemaObject: { type: "array", items },
      schemaName: name,
      required: true,
      isParam: undefined,
      isEnum: !!items.enum,
      isNullable: false,
      context,
    });

    if (items.enum) return { kind: "enum", type: prop.type };
    return { kind: "raw", type: prop.type };
  }

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
    fieldConfigs: FieldConfigs;
    context: CodegenContext;
  }) {
    const { name, isEmpty, properties, requireds, fieldConfigs, context } = params;

    this.name = `${isEmpty ? "Empty" : ""}${name}`;

    for (const [key, value] of Object.entries(properties)) {
      const prop = SchemaPropertyClassifier.classify({
        key,
        value,
        requireds,
        fieldConfigs,
        schemaName: this.name,
        context,
      });
      if (!prop) continue;

      if (prop instanceof PrimitiveProp) this.primitiveProps.push(prop);
      else if (prop instanceof ArrayProp) this.arrayProps.push(prop);
      else if (prop instanceof ObjectProp) this.objectProps.push(prop);
      else if (prop instanceof EnumProp) this.enumProps.push(prop);
      else if (prop instanceof UnionProp) this.unionProps.push(prop);
    }

    const deps = SchemaDependencyCollector.collect({
      primitiveProps: this.primitiveProps,
      arrayProps: this.arrayProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
      unionProps: this.unionProps,
    });
    this.schemaDeps = deps.schemaDeps;
    this.enumDeps = deps.enumDeps;
    this.customTypeDeps = deps.customTypeDeps;
    this.sanitizerDeps = deps.sanitizerDeps;

    const rendered = SchemaClassRenderer.render({
      name: this.name,
      primitiveProps: this.primitiveProps,
      arrayProps: this.arrayProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
      unionProps: this.unionProps,
    });
    this.interface = rendered.interface;
    this.schema = rendered.schema;
    this.bundleHelper = rendered.bundleHelper;
  }

  /**
   * Re-renderiza este schema como request DTO: `bundle()` passa a serializar a partir
   * das instâncias `BuildedInput` via `bundleInputs` (em vez de `bundleStrict` sobre os
   * `.value` extraídos). Idempotente. Schemas array-root não têm props → no-op
   * (continuam mapeando `item.bundle()`). Chamado pelo `SchemaRegistry` para o fecho
   * transitivo dos request bodies.
   */
  setRequestMode(): void {
    if (this.bundleHelper !== "strict") return;
    const rendered = SchemaClassRenderer.render({
      name: this.name,
      primitiveProps: this.primitiveProps,
      arrayProps: this.arrayProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
      unionProps: this.unionProps,
      mode: "request",
    });
    this.schema = rendered.schema;
    this.bundleHelper = rendered.bundleHelper;
  }
}
