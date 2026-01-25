import { capitalizeFirstLetter, splitByUppercase, treatAndUpper, treatByUppercase } from "./helpers/helpers.js";

import { SchemaProp } from "./property.js";
import type { SchemaObject, ReferenceObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators, ReflectorParamType } from "./types/types.js";

export class Schema {
  name: string;
  properties: SchemaProp[] = [];
  // type: string;
  schema: string;
  enums = new Set<string>();
  objects = new Map<string, string>();

  constructor(params: {
    properties: Record<string, SchemaObject | ReferenceObject>;
    name: string;
    requireds: string[];
    isEmpty: boolean;
    validators: FieldValidators;
  }) {
    const { name, properties, requireds, isEmpty, validators } = params;

    this.name = `${isEmpty ? "Empty" : ""}${name}`;

    for (const [key, value] of Object.entries(properties)) {
      if ("$ref" in value || !value?.type) {
        if ("$ref" in value) {
          const teste = value.$ref;
          const object = teste.split("/").at(-1);
          this.objects.set(key, `${object}`);
        }

        continue;
      }

      const required = requireds.includes(key);

      const teste = value.items;

      // const enumName = `Enum${treatAndUpper(name)}${capitalizeFirstLetter(key)}`;

      if (teste && !("$ref" in teste) && teste.enum) {
        this.enums.add(this.getEnumConst({ enums: teste.enum, schemaName: key }));
      } else if (value.enum) {
        this.enums.add(this.getEnumConst({ enums: value.enum, schemaName: key }));
      }

      const validator = validators.get(key);

      this.properties.push(
        new SchemaProp({
          schemaName: this.name,
          name: key,
          schemaObject: value,
          type: value.type as ReflectorParamType,
          example: value.example,
          required,
          isEmpty,
          inParam: "path",
          validator,
        }),
      );
    }

    const keys = this.properties
      .map((p) => {
        const keyName = `${p.name}${p.isRequired ? "" : "?"}`;
        let state;

        if (p.reflectorType === "object") {
          state = `$state<${p.bType}>()`;
        } else if (p.reflectorType === "array") {
          state = `$state<${p.bType}>([])`;
        } else {
          state = `$state(${p.buildedValue})`;
        }

        return `${keyName} = ${state}`;
      })
      .join(";\n");

    const buildedObjects = Array.from(this.objects)
      .map(([k, v]) => {
        return `${k} = $state(new ${v}())`;
      })
      .join(";\n");

    this.schema = `export class ${this.name} {
      ${keys}
      ${this.properties.length > 0 ? ";" : ""}
      ${buildedObjects}
    };`;
  }

  private getEnumConst(params: { enums: string[]; schemaName: string }) {
    const { enums, schemaName } = params;

    const enumList = enums.map((en) => `'${en}'`).join("|");

    return `export type Enum${capitalizeFirstLetter(schemaName)} = ${enumList}`;
  }
}
