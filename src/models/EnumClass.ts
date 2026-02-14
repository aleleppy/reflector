import { splitByUppercase, treatByUppercase } from "../utils/StringUtils.js";

export class EnumClass {
  typeName: string;
  values: string[];

  constructor(params: { entityName: string; propName: string; enums: string[] }) {
    const { entityName, enums, propName } = params;

    const parts = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
    const raw = `ENUM_${parts.join("_")}_${propName.toUpperCase()}`.split("_");
    this.typeName = [...new Set(raw)].join("_");
    this.values = [...new Set(enums)];
  }

  build(): string {
    return `export enum ${this.typeName} { ${this.values.join(", ")} }`;
  }
}
