export abstract class Property {
  name: string;
  required: boolean;
  isParam: boolean;
  isNullable: boolean;
  isSpecial: boolean = false;

  constructor(params: { name: string; required: boolean; isParam?: boolean; isNullable?: boolean }) {
    this.name = this.treatName(params.name);
    this.required = params.required;
    this.isParam = params.isParam ?? false;
    this.isNullable = params.isNullable ?? false;
  }

  private treatName(name: string): string {
    let newName = name;

    if (name.split("-").length > 1) {
      this.isSpecial = true;
      newName = `['${name}']`;
    }

    return newName;
  }

  protected thisDot(): string {
    return `this${this.isSpecial ? "" : "."}`;
  }

  abstract generateConstructor(): string;
  abstract generateClassProperty(): string;
  abstract generateInterfaceProperty(): string;
  abstract generateBundleCode(): string;
}
