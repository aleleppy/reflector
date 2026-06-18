import type { ReferenceObject } from "../types/open-api-spec.interface.js";

export class ObjectProp {
  name: string;
  type: string;

  private readonly required: boolean;
  private readonly isNullable: boolean;

  constructor(params: { referenceObject: ReferenceObject; name: string; isRequired?: boolean; isNullable?: boolean }) {
    const { referenceObject, name, isRequired, isNullable } = params;

    this.name = name;
    this.type = referenceObject.$ref.split("/").at(-1) ?? "";

    this.required = isRequired ?? false;
    this.isNullable = !!isNullable;
  }

  constructorBuild() {
    if (this.isNullable) {
      return `this.${this.name} = params?.data?.${this.name} != null ? new ${this.type}({ data: params.data.${this.name} }) : (params?.data?.${this.name} === null ? null : new ${this.type}())`;
    }

    return `this.${this.name} = new ${this.type}({ data: params?.data?.${this.name} }) `;
  }

  classBuild() {
    const req = this.required ? "" : "?";
    const nullable = this.isNullable ? "| null" : "";
    const defaultVar = this.isNullable ? "null" : `new ${this.type}`;

    return `${this.name}${req} = $state<${this.type} ${nullable}>(${defaultVar})`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";
    const nullable = this.isNullable ? "| null" : "";

    return `${this.name}${req}: ${this.type}Interface ${nullable}`;
  }

  bundleBuild() {
    const nullable = this.isNullable ? "?? null" : "";
    return `${this.name}: this.${this.name}?.bundle() ${nullable}`;
  }

  /**
   * Field name when this sub-DTO is emitted as optional AND always-instantiated
   * (`nome? = $state<T>(new T)` — `!required && !nullable`), so the client-side
   * gate (`validateForm`) must skip it when empty instead of validating its inner
   * `required` fields as mandatory. `null` for required or nullable sub-DTOs (the
   * latter defaults to `null` and is already skipped at runtime). Mirrors the `?`
   * modifier `classBuild` emits, keeping the runtime gate consistent with the type.
   */
  optionalGateName(): string | null {
    return !this.required && !this.isNullable ? this.name : null;
  }

  hydrateBuild() {
    if (this.isNullable) {
      return `if (data.${this.name} !== undefined) {
        if (data.${this.name} === null) this.${this.name} = null;
        else if (this.${this.name}) this.${this.name}.hydrate(data.${this.name} as never);
        else this.${this.name} = new ${this.type}({ data: data.${this.name} as never });
      }`;
    }

    return `if (data.${this.name} !== undefined) {
      if (this.${this.name}) this.${this.name}.hydrate(data.${this.name} as never);
      else this.${this.name} = new ${this.type}({ data: data.${this.name} as never });
    }`;
  }
}
