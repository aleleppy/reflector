// export function stripState(attr: string): string {
//   // Ex.: "form = $state(newForm(DefaultCreateUserDtoSchema))"
//   const [lhs, rhsRaw = ""] = attr.split("=");
//   const rhs = rhsRaw.trim();

import type { SchemaObject } from "../types/open-api-spec.interface.js";
import type { ReflectorConfig } from "../config/types.js";
import { defaultConfig } from "../config/defaults.js";

// Configuração global (pode ser sobrescrita pelo usuário)
let globalConfig: ReflectorConfig = { ...defaultConfig };

/**
 * Define a configuração global do reflector
 */
export function setConfig(config: ReflectorConfig): void {
  globalConfig = {
    naming: {
      ...defaultConfig.naming,
      ...config.naming,
    },
  };
}

/**
 * Obtém a configuração atual
 */
export function getConfig(): ReflectorConfig {
  return globalConfig;
}

/**
 * Obtém o conjunto de palavras a serem filtradas
 * @deprecated Use getFilterWords() em vez de trashWords diretamente
 */
export function getFilterWords(): Set<string> {
  const words = globalConfig.naming?.filterWords ?? defaultConfig.naming!.filterWords!;
  return new Set(words);
}

// Mantido para compatibilidade retroativa
const trashWords = getFilterWords();

export function toCamelCase(str: string) {
  return str
    .split("-")
    .map((chunk, i) => (i === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)))
    .join("");
}

export function sanitizeKey(name: string) {
  const match = /^\[id(.+)\]$|^\{(.+)\}$/.exec(name);

  if (match) {
    const raw: string = (match[1] || match[2]) ?? ""; // pega o conteúdo entre [] ou {}
    const camel = toCamelCase(raw);
    // Garante que a primeira letra fique minúscula
    return camel.charAt(0).toLowerCase() + camel.slice(1);
  }

  return toCamelCase(name);
}

export function sanitizeNumber(texto: string) {
  return texto.replaceAll(/["']/g, "");
}

export function capitalizeFirstLetter(text: string) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function splitByUppercase(text: string) {
  return text.split(/(?=[A-Z])/);
}

export function treatByUppercase(text: string): string {
  const base = text;
  const filterWords = getFilterWords();

  // Se splitByUppercase tiver tipagem "string[] | undefined", isso resolve.
  const parts: string[] = (splitByUppercase(base) ?? [])
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .filter((p) => !filterWords.has(p));

  if (parts.length === 0) return "entity";

  const words = parts.length === 1 ? [parts[0], "Entity"] : parts;

  const first = words[0];
  if (!first) return "entity"; // deixa o TS 100% feliz

  let out = first.charAt(0).toLowerCase() + first.slice(1);

  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    out += w.charAt(0).toUpperCase() + w.slice(1);
  }

  return out.length > 0 ? out : "entity";
}

export function treatAndUpper(text: string): string {
  return capitalizeFirstLetter(treatByUppercase(text));
}

export function createDangerMessage(text: string) {
  console.log("\x1b[31m%s\x1b[0m", `[!] ${text}`);
}

export function getFilteredEntities(rawEndpoint: string) {
  const splittedEntitys = rawEndpoint.split("/");
  return splittedEntitys.filter((item) => item !== "" && !item.includes("{"));
}

export function getEndpointAndModuleName(rawEndpoint: string) {
  const filteredEntitys = getFilteredEntities(rawEndpoint);

  const moduleName = filteredEntitys.map((x) => sanitizeKey(capitalizeFirstLetter(x))).join("");
  const baseEndpoint = filteredEntitys.join("/");

  return { baseEndpoint: getEndpoint(baseEndpoint), moduleName };
}

export function getEndpoint(rawEndpoint: string) {
  const filteredEntitys = getFilteredEntities(rawEndpoint);

  return filteredEntitys.join("/");
}

export function getFullEndpoint(rawEndpoint: string) {
  return rawEndpoint
    .split("/")
    .filter(Boolean)
    .map((str) => {
      // pega somente params no formato "{algumaCoisa}"
      const match = new RegExp(/^\{(.+)\}$/).exec(str);
      if (match) {
        const key = match[1]; // sem { }
        return `\${${key}}`; // gera "${paths.key}" como texto
      }
      return str;
    })
    .join("/");
}

export function isEnumSchema(schema: SchemaObject): boolean {
  if (schema.enum) return true;
  if (schema.items) {
    if ("$ref" in schema.items) return false;
    if (schema.items.enum) return true;
  }
  return false;
}

// export function treatenEnum(enums: string[]) {
//   const a = enums.map((e) => `"${e}"`);

//   return ` z.literal([${a}])`;
// }
