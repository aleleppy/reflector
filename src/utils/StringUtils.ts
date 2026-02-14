export function toCamelCase(str: string): string {
  return str
    .split("-")
    .map((chunk, i) => (i === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)))
    .join("");
}

export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join("");
}

export function splitByUppercase(text: string): string[] {
  return text.split(/(?=[A-Z])/);
}

export function treatByUppercase(text: string): string {
  const trashWords = new Set(["Get", "Res", "Default", "Dto", "Public"]);
  const parts = splitByUppercase(text)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .filter((p) => !trashWords.has(p));

  if (parts.length === 0) return "entity";

  const words = parts.length === 1 ? [parts[0], "Entity"] : parts;
  const first = words[0];
  if (!first) return "entity";

  let out = first.charAt(0).toLowerCase() + first.slice(1);
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    out += w.charAt(0).toUpperCase() + w.slice(1);
  }

  return out.length > 0 ? out : "entity";
}

export function capitalizeFirstLetter(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
