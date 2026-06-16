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

    this.required = isRequired ?? true; // tem que ver isso daí
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
