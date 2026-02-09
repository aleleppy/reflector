import type { ReferenceObject } from "./types/open-api-spec.interface.js";

export class ObjectProp {
  name: string;
  type: string;

  private readonly required: boolean;

  constructor(params: { referenceObject: ReferenceObject; name: string; isRequired?: boolean }) {
    const { referenceObject, name, isRequired } = params;

    this.name = name;
    this.type = referenceObject.$ref.split("/").at(-1) ?? "";

    this.required = isRequired ?? true; // tem que ver isso daí
  }

  constructorBuild() {
    return `this.${this.name} = new ${this.type}({ data: params?.data?.${this.name}, empty: params?.empty ?? false })`;
  }

  classBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.type}`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.type}Interface`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.bundle()`;
  }
}
