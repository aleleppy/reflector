import type { ReferenceObject } from "../types/open-api-spec.interface.js";
import { Property } from "./Property.js";

export class ObjectProperty extends Property {
  private reference: string;

  constructor(params: {
    name: string;
    referenceObject: ReferenceObject;
    isRequired?: boolean;
    isNullable?: boolean;
  }) {
    const { name, referenceObject, isRequired, isNullable } = params;
    super({ name, required: isRequired ?? true, isNullable: isNullable ?? false });

    const ref = referenceObject.$ref;
    const parts = ref.split("/");
    this.reference = parts[parts.length - 1] ?? "unknown";
  }

  generateConstructor(): string {
    return `${this.thisDot()}${this.name} = new ${this.reference}({ data: params?.data?.${this.name} })`;
  }

  generateClassProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: ${this.reference}`;
  }

  generateInterfaceProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: ${this.reference}`;
  }

  generateBundleCode(): string {
    return `${this.name}: ${this.thisDot()}${this.name}?.bundle()`;
  }
}
