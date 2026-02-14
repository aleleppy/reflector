type LooseValidatorField = { fields: string[]; validator: string };

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
}

function extractValidatorsArraySource(code: string): string | null {
  const cleaned = stripComments(code);
  const startIdx = cleaned.search(/\bexport\s+const\s+validators\b/);
  if (startIdx < 0) return null;

  const fromStart = cleaned.slice(startIdx);
  const eqIdx = fromStart.indexOf("=");
  if (eqIdx < 0) return null;

  const afterEq = fromStart.slice(eqIdx + 1);
  const bracketStart = afterEq.indexOf("[");
  if (bracketStart < 0) return null;

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
      if (depth === 0) return afterEq.slice(bracketStart, i + 1);
    }
  }

  return null;
}

export function parseValidatorFieldsFromConfig(code: string): LooseValidatorField[] {
  const arrSrc = extractValidatorsArraySource(code);
  if (!arrSrc) return [];

  const objRegex = /\{\s*fields\s*:\s*\[([\s\S]*?)\]\s*,\s*validator\s*:\s*([A-Za-z0-9_$.]+)\s*,?\s*\}/g;
  const results: LooseValidatorField[] = [];
  let m: RegExpExecArray | null;

  while ((m = objRegex.exec(arrSrc))) {
    const fieldsRaw = m[1] ?? "";
    const validatorRaw = (m[2] ?? "").trim();
    const fields: string[] = [];
    const strRegex = /['"`]([^'"`]+)['"`]/g;
    let sm: RegExpExecArray | null;

    while ((sm = strRegex.exec(fieldsRaw))) {
      if (sm[1]) fields.push(sm[1]);
    }

    results.push({ fields, validator: validatorRaw });
  }

  return results;
}
