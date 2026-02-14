import { splitByUppercase, treatByUppercase } from "./helpers/helpers.js";

export class EnumClass {
  typeName: string;
  values: string[];

  constructor(params: { entityName: string; propName: string; enums: string[] }) {
    const { entityName, enums, propName } = params;

    const teste = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
    const naaa = `ENUM_${teste.join("_")}_${propName.toUpperCase()}`.split("_");
    this.typeName = [...new Set(naaa)].join("_");

    this.values = enums;
  }

  build() {
    return `export enum ${this.typeName} { ${this.values} }`;
  }
}
