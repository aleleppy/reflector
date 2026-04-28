import type { AttributeProp } from "../../types/types.js";

/** TS type literal for a single query override entry. Mirrors the
 *  shape produced by each Prop's bundle entry:
 *    PrimitiveProp / EnumProp     → `string | null`
 *    ArrayProp (enum)             → `${type}[]`
 *    ArrayProp (non-enum, raro)   → `string[]`
 */
export function queryOverrideEntryType(q: AttributeProp): string {
  if ("isEnum" in q && q.isEnum) return `${q.type}[]`;
  if (!("rawType" in q) && !("enumName" in q)) return "string[]";
  return "string | null";
}

/** Inline TS object type literal for the full queryOverride bag,
 *  derived from the method's query props. Returns undefined when there
 *  are no query params (caller should skip emitting the slot). */
export function queryOverrideTypeLiteral(querys: AttributeProp[]): string | undefined {
  if (querys.length === 0) return undefined;
  const fields = querys.map((q) => `${q.name}?: ${queryOverrideEntryType(q)}`).join("; ");
  return `{ ${fields} }`;
}
