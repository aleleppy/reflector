import { splitByUppercase, treatByUppercase, capitalizeFirstLetter } from "./StringUtils.js";

export function extractModuleName(operationId: string | undefined): string {
  const rawName = operationId?.split("_")[0] ?? "";
  return splitByUppercase(rawName)
    .filter((x) => x !== "Controller")
    .join("");
}

export function extractMethodName(operationId: string | undefined): string {
  const extracted = operationId?.split("_")[1];
  if (extracted === "list") return "listAll";
  return extracted ?? "unknown";
}

export function generateClassName(name: string): string {
  return capitalizeFirstLetter(treatByUppercase(name));
}

export function generateInterfaceName(name: string): string {
  return `${capitalizeFirstLetter(treatByUppercase(name))}Interface`;
}
