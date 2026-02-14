export class ReflectorTypesGenerator {
  generate(): string {
    return [
      "type ValidatorResult = string | null",
      "type ValidatorFn<T> = (v: T) => ValidatorResult",
      "type BundleResult<T> = T extends { bundle: () => infer R } ? R : T;",
      `type Partial<T> = {
  [K in Exclude<keyof T, "bundle">]?: BuildedInput<T[K]>;
} & {
  bundle: unknown;
}`,
      `export interface QueryContract {
  event: SvelteEvent;
  key: string;
}`,
      `export type SvelteEvent = Event & {
  currentTarget: EventTarget & HTMLInputElement;
}`,
    ].join(";");
  }
}
