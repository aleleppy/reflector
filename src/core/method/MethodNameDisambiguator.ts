import { capitalizeFirstLetter, toCamelCase } from "../../helpers/helpers.js";
import type { Method } from "./Method.js";

/**
 * Two kinds of collision inside a single controller (module) produce invalid
 * generated code. Both are fixed here by appending a suffix derived from the
 * path's last non-parameterized segment.
 *
 * 1. Method-name collision (`nameSuffix`).
 *    Two operations with the same base name (e.g. two `listAll`, two
 *    `findOne`) would emit duplicate `_listAll` / `_findOne` methods and
 *    duplicate per-operation classes (`ListAll`, `FindOnePaths`, etc.).
 *
 * 2. List-state collision (`stateSuffix`).
 *    Any two list-typed operations in the same module emit `list = $state<…>`
 *    twice, even when their method names differ (e.g. `listAll` vs
 *    `getMessages`). The `list` field, `bundledList`, and `clearList()` must
 *    be suffixed per method so both are unique.
 *
 * Suffix derivation (same for both cases, so a single method can reuse one
 * suffix for both):
 *  - Take the last non-`{param}` segment of the endpoint path.
 *  - Pluralize it when the path does NOT end with a `{param}`
 *    (collection endpoints: listAll, create).
 *  - Keep it singular when the path ends with a `{param}`
 *    (item endpoints: findOne, update, remove).
 *  - Camel-case the result to strip hyphens and capitalize.
 *
 * When a method has no collision of either kind, both suffixes stay empty
 * and the output matches the pre-fix behavior — no churn for consumers of
 * non-colliding controllers.
 */
export class MethodNameDisambiguator {
  static apply(methods: Method[]): void {
    this.disambiguateNames(methods);
    this.disambiguateListStates(methods);
  }

  private static disambiguateNames(methods: Method[]): void {
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

        const finalSuffix = this.ensureUnique(suffix, used);
        used.add(finalSuffix);

        method.name = `${method.name}${finalSuffix}`;
        method.nameSuffix = finalSuffix;
      }
    }
  }

  private static disambiguateListStates(methods: Method[]): void {
    const listMethods = methods.filter((m) => m.analyzers.request.attributeType === "list");
    if (listMethods.length < 2) return;

    const used = new Set<string>();
    for (const method of listMethods) {
      // If `disambiguateNames` already assigned a suffix for this method
      // (two list-typed ops with the same name), reuse it so the method
      // name and list state stay aligned (e.g. `_listAllPackages` ↔
      // `listPackages`).
      let suffix = method.nameSuffix || this.deriveSuffix(method.endpoint);
      if (!suffix) continue;

      const finalSuffix = this.ensureUnique(suffix, used);
      used.add(finalSuffix);
      method.stateSuffix = finalSuffix;
    }
  }

  private static ensureUnique(suffix: string, used: Set<string>): string {
    if (!used.has(suffix)) return suffix;
    let i = 2;
    let candidate = `${suffix}${i}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${suffix}${i}`;
    }
    return candidate;
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
    return capitalizeFirstLetter(toCamelCase(word));
  }

  private static pluralize(word: string): string {
    if (word.endsWith("s")) return word;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(x|ch|sh)$/i.test(word)) return `${word}es`;
    return `${word}s`;
  }
}
