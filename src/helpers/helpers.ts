export function stripState(attr: string): string {
  // Ex.: "form = $state(newForm(DefaultCreateUserDtoSchema))"
  const [lhs, rhsRaw = ""] = attr.split("=");
  const rhs = rhsRaw.trim();

  // remove apenas UM wrapper $state( ... ) do início ao fim
  const cleaned = rhs.startsWith("$state(") && rhs.endsWith(")") ? rhs.slice("$state(".length, -1).trim() : rhs;

  return `${lhs.trim()} = ${cleaned}`;
}

export function toCamelCase(str: string) {
  return str
    .split("-")
    .map((chunk, i) => (i === 0 ? chunk : chunk[0].toUpperCase() + chunk.slice(1)))
    .join("");
}

export function sanitizeKey(name: string) {
  const match = /^\[id(.+)\]$|^\{(.+)\}$/.exec(name);

  if (match) {
    const raw = match[1] || match[2]; // pega o conteúdo entre [] ou {}
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

export function createDangerMessage(text: string) {
  console.log("\x1b[31m%s\x1b[0m", `[!] ${text}`);
}

export function getEndpointAndModuleName(rawEndpoint: string) {
  const splittedEntitys = rawEndpoint.split("/");
  const filteredEntitys = splittedEntitys.filter((item) => item !== "" && !item.includes("{"));
  const moduleName = filteredEntitys.map((x) => sanitizeKey(capitalizeFirstLetter(x))).join("");
  const endpoint = filteredEntitys.join("/");

  return { endpoint, moduleName };
}
