import { splitByUppercase, treatByUppercase } from "../helpers/helpers.js";
import { enumTypes } from "../main.js";

export class EnumProp {
  name: string;
  isParam: boolean;
  readonly type: string;
  enumName: string;

  private readonly isRequired: boolean;
  private readonly example: string;

  constructor(params: { name: string; enums: string[]; required: boolean; isParam: boolean | undefined; entityName: string }) {
    const { name, required, isParam, enums, entityName } = params;

    this.name = name;
    this.isParam = !!isParam;
    this.isRequired = required;

    this.type = enums.map((e) => `'${e}'`).join("|");

    const types = enumTypes.get(enums.join(","));

    if (!types) {
      // const teste2 = new EnumClass({ entityName, propName: this.name, enums });
      // console.log(teste2.build());
      const teste = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
      const naaa = `ENUM_${teste.join("_")}_${this.name.toUpperCase()}`.split("_");
      const aaa = [...new Set(naaa)].join("_");
      enumTypes.set(enums.join(","), aaa);
    }

    this.example = enums[0] as string;
    this.enumName = enumTypes.get(enums.join(",")) ?? "";
  }

  classBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: BuildedInput<${this.enumName}>`;
  }

  constructorBuild() {
    return `this.${this.name} = build({ key: params?.data?.${this.name}, placeholder: ${this.enumName}.${this.example}, example: ${this.enumName}.${this.example}, required: ${this.isRequired}})`;
  }

  interfaceBuild() {
    const req = this.isRequired ? "" : "?";

    return `${this.name}${req}: ${this.enumName}`;
  }

  bundleBuild() {
    return `${this.name}: this.${this.name}?.value`;
  }
}
