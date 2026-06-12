// Stubs minimal for Svelte 5 runes so the runtime template can be loaded
// in plain vitest (node env, no Svelte compiler). These stubs keep
// BuildedInput/EnumQueryBuilder field initializers from throwing — including
// BuildedInput's `serverErrorValue = $state.raw(...)`, hence the `.raw` member.
// They are identity functions: no real reactivity, only the value semantics.
declare global {
  // eslint-disable-next-line no-var
  var $state: { <T>(initial: T): T; raw: <T>(initial: T) => T };
  // eslint-disable-next-line no-var
  var $derived: <T>(value: T) => T;
}

if (typeof globalThis.$state === "undefined") {
  const state = <T>(initial: T): T => initial;
  const raw = <T>(initial: T): T => initial;
  globalThis.$state = Object.assign(state, { raw }) as typeof globalThis.$state;
}
if (typeof globalThis.$derived === "undefined") {
  globalThis.$derived = <T>(value: T): T => value;
}

export {};
