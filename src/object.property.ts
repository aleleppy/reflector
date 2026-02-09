import type { ReferenceObject } from "./types/open-api-spec.interface.js";

export class ObjectProp {
  name: string;
  type: string;

  private readonly required: boolean;
  private readonly isNullable: boolean;

  constructor(params: { referenceObject: ReferenceObject; name: string; isRequired?: boolean; isNullable?: boolean }) {
    const { referenceObject, name, isRequired, isNullable } = params;

    this.name = name;
    this.type = referenceObject.$ref.split("/").at(-1) ?? "";

    // if (name === "companyReply") {
    //   console.log(isRequired);
    // }

    this.required = isRequired ?? true; // tem que ver isso daí
    this.isNullable = !!isNullable;
  }

  constructorBuild() {
    const data = this.isNullable ? "" : `data: params?.data?.${this.name},`;
    const empty = this.isNullable ? "true" : "params?.empty ?? false";

    return `this.${this.name} = new ${this.type}({ ${data} empty: ${empty} })`;
  }

  classBuild() {
    const req = this.required ? "" : "?";
    const nullable = this.isNullable ? "| null" : "";

    return `${this.name}${req}: ${this.type} ${nullable}`;
  }

  interfaceBuild() {
    const req = this.required ? "" : "?";

    return `${this.name}${req}: ${this.type}Interface`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.bundle()`;
  }
}
