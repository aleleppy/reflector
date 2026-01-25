type LooseValidatorField = { fields: string[]; validator: string };

function stripComments(code: string) {
  // remove //... e /* ... */
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
}

function extractValidatorsArraySource(code: string) {
  // tenta achar: export const validators ... = [ ... ];
  const cleaned = stripComments(code);

  const startIdx = cleaned.search(/\bexport\s+const\s+validators\b/);
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
  let inStr: "'" | '"' | "`" | null = null;
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

export function parseValidatorFieldsFromConfig(code: string): LooseValidatorField[] {
  const arrSrc = extractValidatorsArraySource(code);
  if (!arrSrc) return [];

  // captura objetos do tipo:
  // { fields: ['email'], validator: validateInputs.email, }
  const objRegex = /\{\s*fields\s*:\s*\[([\s\S]*?)\]\s*,\s*validator\s*:\s*([A-Za-z0-9_$.]+)\s*,?\s*\}/g;

  const results: LooseValidatorField[] = [];
  let m: RegExpExecArray | null;

  while ((m = objRegex.exec(arrSrc))) {
    const fieldsRaw = m[1] ?? "";
    const validatorRaw = (m[2] ?? "").trim();

    // pega strings dentro do array de fields (aceita ' " `)
    const fields: string[] = [];
    const strRegex = /['"`]([^'"`]+)['"`]/g;

    let sm: RegExpExecArray | null;
    while ((sm = strRegex.exec(fieldsRaw))) {
      if (sm[1]) fields.push(sm[1]);
    }

    // ✅ mantém o caminho inteiro (ex: validateInputs.email)
    results.push({ fields, validator: validatorRaw });
  }

  return results;
}
