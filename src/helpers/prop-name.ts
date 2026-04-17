/**
 * Escapes property names containing hyphens (invalid as identifiers) into
 * bracket-access form. `isSpecial` signals the bracketed branch to callers
 * that behave differently for hyphenated names (e.g. omitting the dot in
 * `this.foo` vs `this['foo-bar']`).
 */
export function treatPropertyName(name: string): { name: string; isSpecial: boolean } {
  const isSpecial = name.includes("-");
  return {
    name: isSpecial ? `['${name}']` : name,
    isSpecial,
  };
}
