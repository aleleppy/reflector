// Stubs minimal for Svelte 5 runes so the runtime template can be loaded
// in plain vitest (node env, no Svelte compiler). The new QueryBuilder
// is rune-free; these stubs only keep BuildedInput/EnumQueryBuilder field
// initializers from throwing on import.
declare global {
  // eslint-disable-next-line no-var
  var $state: <T>(initial: T) => T;
  // eslint-disable-next-line no-var
  var $derived: <T>(value: T) => T;
}

if (typeof globalThis.$state === "undefined") {
  globalThis.$state = <T>(initial: T): T => initial;
}
if (typeof globalThis.$derived === "undefined") {
  globalThis.$derived = <T>(value: T): T => value;
}

export {};
