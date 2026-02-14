import { splitByUppercase, treatByUppercase } from "./StringUtils.js";

export function generateEnumName(entityName: string, propName: string): string {
  const parts = splitByUppercase(treatByUppercase(entityName)).map((x) => x.toUpperCase());
  const nameParts = `ENUM_${parts.join("_")}_${propName.toUpperCase()}`.split("_");
  return Array.from(new Set(nameParts)).join("_");
}

export function deduplicateEnum(values: string[]): string[] {
  return Array.from(new Set(values));
}
