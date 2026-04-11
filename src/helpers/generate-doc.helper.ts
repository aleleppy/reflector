interface LooseFieldConfig {
  fields: string[];
  validator?: string;
  type?: string;
}

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

export function parseFieldConfigsFromConfig(code: string): LooseFieldConfig[] {
  const arrSrc = extractFieldConfigsArraySource(code);
  if (!arrSrc) return [];

  const blocks = extractObjectBlocks(arrSrc);
  const results: LooseFieldConfig[] = [];

  for (const block of blocks) {
    // extrai fields: [...]
    const fieldsMatch = block.match(/fields\s*:\s*\[([\s\S]*?)\]/);
    if (!fieldsMatch) continue;

    const fields: string[] = [];
    const strRegex = /['"`]([^'"`]+)['"`]/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRegex.exec(fieldsMatch[1] ?? ""))) {
      if (sm[1]) fields.push(sm[1]);
    }

    if (fields.length === 0) continue;

    // extrai validator (referência sem aspas, ex: validateInputs.email)
    const validatorMatch = block.match(/validator\s*:\s*([A-Za-z0-9_$.]+)/);
    const validator = validatorMatch?.[1]?.trim();

    // extrai type (string literal com aspas, ex: 'IconName')
    const typeMatch = block.match(/type\s*:\s*['"`]([^'"`]+)['"`]/);
    const type = typeMatch?.[1]?.trim();

    const config: LooseFieldConfig = { fields };
    if (validator) config.validator = validator;
    if (type) config.type = type;

    results.push(config);
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
