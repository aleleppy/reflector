import type { FieldConfig, FieldConfigMatcher, ParsedFieldConfig } from "../types/types.js";

function stripComments(code: string): string {
  // remove //... e /* ... */
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
}

function extractFieldConfigsArraySource(code: string): string | null {
  // tenta achar: export const fieldConfigs ... = [ ... ];
  const cleaned = stripComments(code);
  const startIdx = cleaned.search(/\bexport\s+const\s+fieldConfigs\b/);
  if (startIdx < 0) return null;

  const fromStart = cleaned.slice(startIdx);
  const eqIdx = fromStart.indexOf("=");
  if (eqIdx < 0) return null;

  const afterEq = fromStart.slice(eqIdx + 1);
  const bracketStart = afterEq.indexOf("[");
  if (bracketStart < 0) return null;

  // varre até fechar o colchete correspondente
  let i = bracketStart;
  let depth = 0;
  let inStr: string | null = null;
  let escaped = false;

  for (; i < afterEq.length; i++) {
    const ch = afterEq[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        // inclui do '[' até ']'
        return afterEq.slice(bracketStart, i + 1);
      }
    }
  }

  return null;
}

function extractObjectBlocks(arrSrc: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < arrSrc.length; i++) {
    const ch = arrSrc[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        blocks.push(arrSrc.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return blocks;
}

const LIST_PATTERNS: Record<FieldConfigMatcher, RegExp> = {
  fields: /\bfields\s*:\s*\[([\s\S]*?)\]/,
  formats: /\bformats\s*:\s*\[([\s\S]*?)\]/,
};

/** Strings inside `<matcher>: [ ... ]` of an entry block; `null` when the key is absent. */
function extractStringList(block: string, matcher: FieldConfigMatcher): string[] | null {
  const listMatch = block.match(LIST_PATTERNS[matcher]);
  if (!listMatch) return null;

  const names: string[] = [];
  const strRegex = /['"`]([^'"`]+)['"`]/g;
  let sm: RegExpExecArray | null;
  while ((sm = strRegex.exec(listMatch[1] ?? ""))) {
    if (sm[1]) names.push(sm[1]);
  }
  return names;
}

function extractPayload(block: string): FieldConfig {
  // validator / sanitizer: referência sem aspas (ex: validateInputs.email, sanitizers.phone)
  const validator = block.match(/validator\s*:\s*([A-Za-z0-9_$.]+)/)?.[1]?.trim();
  const sanitizer = block.match(/sanitizer\s*:\s*([A-Za-z0-9_$.]+)/)?.[1]?.trim();
  // type: string literal com aspas (ex: 'IconName')
  const type = block.match(/type\s*:\s*['"`]([^'"`]+)['"`]/)?.[1]?.trim();

  const config: FieldConfig = {};
  if (validator) config.validator = validator;
  if (sanitizer) config.sanitizer = sanitizer;
  if (type) config.type = type;
  return config;
}

/**
 * Each entry matches by exactly one of `fields` (property names) or `formats`
 * (OpenAPI `format` values). Both in one entry is ambiguous and throws; an
 * entry with neither (or an empty list) is skipped, as before.
 */
export function parseFieldConfigsFromConfig(code: string): ParsedFieldConfig[] {
  const arrSrc = extractFieldConfigsArraySource(code);
  if (!arrSrc) return [];

  const results: ParsedFieldConfig[] = [];

  for (const block of extractObjectBlocks(arrSrc)) {
    const fields = extractStringList(block, "fields");
    const formats = extractStringList(block, "formats");

    if (fields !== null && formats !== null) {
      throw new Error(
        `[reflector] fieldConfigs: an entry must declare either 'fields' or 'formats', not both: ${block.replace(/\s+/g, " ")}`,
      );
    }

    const match: Omit<ParsedFieldConfig, "config"> | null =
      fields !== null ? { matcher: "fields", names: fields } : formats !== null ? { matcher: "formats", names: formats } : null;
    if (match === null || match.names.length === 0) continue;

    results.push({ ...match, config: extractPayload(block) });
  }

  return results;
}

export function parseTypeImportsFromTypesFile(code: string): Map<string, string> {
  const result = new Map<string, string>();
  const importRegex = /import\s+type\s*\{([^}]+)\}\s*from\s*['"`]([^'"`]+)['"`]/g;

  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(code))) {
    const names = (m[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean);
    const source = m[2] ?? "";
    if (!source) continue;

    for (const name of names) {
      result.set(name, `import type { ${name} } from '${source}'`);
    }
  }

  return result;
}
