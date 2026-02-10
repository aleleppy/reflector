export class EnumProp {
  name: string;
  isParam: boolean;
  readonly type: string;

  private readonly isRequired: boolean;
  private readonly example: string;

  constructor(params: { name: string; enums: string[]; required: boolean; isParam?: boolean }) {
    const { name, required, isParam, enums } = params;

    this.name = name;
    this.isParam = !!isParam;
    this.isRequired = required;

    this.type = enums.map((e) => `'${e}'`).join("|");

    this.example = enums[0] as string;
  }

  classBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: BuildedInput<${this.type}>`;
  }

  constructorBuild() {
    return `this.${this.name} = build({ key: params?.data?.${this.name}, placeholder: '${this.example}', example: '${this.example}', required: ${this.isRequired}})`;
  }

  interfaceBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: ${this.type}`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.value`;
  }
}
