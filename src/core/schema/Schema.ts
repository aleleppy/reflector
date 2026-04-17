import { ArrayProp } from "../../props/array.property.js";
import { EnumProp } from "../../props/enum.property.js";
import { ObjectProp } from "../../props/object.property.js";
import { PrimitiveProp } from "../../props/primitive.property.js";

import type { SchemaObject, ReferenceObject } from "../../types/open-api-spec.interface.js";
import type { FieldConfigs } from "../../types/types.js";
import type { CodegenContext } from "../CodegenContext.js";

import { SchemaPropertyClassifier } from "./SchemaPropertyClassifier.js";
import { SchemaDependencyCollector } from "./SchemaDependencyCollector.js";
import { SchemaClassRenderer } from "./SchemaClassRenderer.js";

export class Schema {
  name: string;

  primitiveProps: PrimitiveProp[] = [];
  arrayProps: ArrayProp[] = [];
  objectProps: ObjectProp[] = [];
  enumProps: EnumProp[] = [];

  /** Other schema class names this schema depends on (via ObjectProp/$ref arrays) */
  readonly schemaDeps: string[];
  /** Enum type names used by this schema */
  readonly enumDeps: string[];
  /** Custom type names used by this schema (from fieldConfigs) */
  readonly customTypeDeps: string[];

  schema: string;
  interface: string;

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
    }

    const deps = SchemaDependencyCollector.collect({
      primitiveProps: this.primitiveProps,
      arrayProps: this.arrayProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
    });
    this.schemaDeps = deps.schemaDeps;
    this.enumDeps = deps.enumDeps;
    this.customTypeDeps = deps.customTypeDeps;

    const rendered = SchemaClassRenderer.render({
      name: this.name,
      primitiveProps: this.primitiveProps,
      arrayProps: this.arrayProps,
      objectProps: this.objectProps,
      enumProps: this.enumProps,
    });
    this.interface = rendered.interface;
    this.schema = rendered.schema;
  }
}
