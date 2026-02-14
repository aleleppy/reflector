import { splitByUppercase, treatByUppercase } from "../utils/StringUtils.js";
import { Property } from "./Property.js";

export const enumTypes = new Map<string, string>();

export class EnumProperty extends Property {
  readonly type: string;
  enumName: string;
  private example: string;

  constructor(params: {
    name: string;
    enums: string[];
    required: boolean;
    isParam?: boolean;
    entityName: string;
  }) {
    const { name, enums, required, isParam, entityName } = params;
    super({ name, required, isParam });

    this.type = enums.map((e) => `'${e}'`).join("|");
    this.example = enums[0] as string;
    this.enumName = this.resolveEnumName(entityName, name, enums);
  }

  private resolveEnumName(entityName: string, propName: string, enums: string[]): string {
    const key = enums.join(",");
    const existing = enumTypes.get(key);
    
    if (existing) return existing;

    const parts = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
    const rawName = `ENUM_${parts.join("_")}_${propName.toUpperCase()}`.split("_");
    const deduped = [...new Set(rawName)].join("_");
    
    enumTypes.set(key, deduped);
    return deduped;
  }

  generateConstructor(): string {
    return `${this.thisDot()}${this.name} = build({ key: params?.data?.${this.name}, placeholder: ${this.enumName}.${this.example}, example: ${this.enumName}.${this.example}, required: ${this.required}})`;
  }

  generateClassProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: BuildedInput<${this.enumName}>`;
  }

  generateInterfaceProperty(): string {
    const req = this.required ? "" : "?";
    return `${this.name}${req}: ${this.enumName}`;
  }

  generateBundleCode(): string {
    return `${this.name}: ${this.thisDot()}${this.name}?.value`;
  }
}
