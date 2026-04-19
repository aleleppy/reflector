import { capitalizeFirstLetter } from "../../helpers/helpers.js";
import type { Method } from "./Method.js";

/**
 * When two operations in the same controller share the same base method name
 * (e.g., two `listAll` from `/packages` and `/packages/:id/controller`),
 * the generated classes and methods collide. We disambiguate by appending
 * a capitalized suffix derived from the last non-parameterized path segment.
 *
 * Rule:
 *  - Pluralize the suffix when the path does NOT end with a `{param}`
 *    (collection endpoints: listAll, create).
 *  - Keep it singular when the path ends with a `{param}`
 *    (item endpoints: findOne, update, remove).
 *
 * Methods whose names are already unique within the module are left alone,
 * preserving snapshot/consumer compatibility for the non-colliding case.
 */
export class MethodNameDisambiguator {
  static apply(methods: Method[]): void {
    const groups = new Map<string, Method[]>();
    for (const m of methods) {
      const bucket = groups.get(m.name);
      if (bucket) bucket.push(m);
      else groups.set(m.name, [m]);
    }

    for (const bucket of groups.values()) {
      if (bucket.length < 2) continue;

      const used = new Set<string>();
      for (const method of bucket) {
        const suffix = this.deriveSuffix(method.endpoint);
        if (!suffix) continue;

        let finalSuffix = suffix;
        let i = 2;
        while (used.has(finalSuffix)) {
          finalSuffix = `${suffix}${i++}`;
        }
        used.add(finalSuffix);

        method.name = `${method.name}${finalSuffix}`;
        method.nameSuffix = finalSuffix;
      }
    }
  }

  private static deriveSuffix(rawPath: string): string {
    const segments = rawPath.split("/").filter(Boolean);
    if (segments.length === 0) return "";

    const isParam = (s: string) => /^\{.+\}$/.test(s);
    const last = segments[segments.length - 1]!;

    let baseSegment = "";
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i]!;
      if (!isParam(seg)) {
        baseSegment = seg;
        break;
      }
    }
    if (!baseSegment) return "";

    const shouldPluralize = !isParam(last);
    const word = shouldPluralize ? this.pluralize(baseSegment) : baseSegment;
    return capitalizeFirstLetter(word);
  }

  private static pluralize(word: string): string {
    if (word.endsWith("s")) return word;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(x|ch|sh)$/i.test(word)) return `${word}es`;
    return `${word}s`;
  }
}
