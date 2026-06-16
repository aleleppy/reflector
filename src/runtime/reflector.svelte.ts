/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "$lib/utils/toast.svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { browser } from "$app/environment";
import { SvelteURL } from "svelte/reactivity";

type ValidatorResult = string | null;
type ValidatorFn<T> = (v: T) => ValidatorResult;
type BundleResult<T> = T extends { bundle: () => infer R } ? R : T;

export type Sanitizer = {
  parse: (display: string) => string; // texto exibido -> valor canônico
  format: (value: string) => string; // valor canônico -> texto exibido (máscara)
};

export type ApiCallParams<TResponse, TPaths = void, TQuery = void> = {
  behavior?: Behavior<TResponse, ApiErrorResponse>;
} & (TPaths extends void ? object : { paths?: TPaths }) &
  (TQuery extends void ? object : { queryOverride?: TQuery });

type PartialBuildedInput<T> = {
  [K in Exclude<keyof T, "bundle">]?: BuildedInput<T[K]>;
} & {
  bundle: unknown;
};

export interface QueryContract {
  event: string;
  key: string;
}

type SeiLa = HTMLInputElement | HTMLButtonElement;
export type SvelteEvent = {
  currentTarget: EventTarget & SeiLa;
};

export interface ValidationErrorItem {
  field: string;
  code: string;
  message: string;
  received?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
  errors?: ValidationErrorItem[];
}

export class Behavior<TSuccess = unknown, TError = unknown> {
  onError?: (e: TError) => Promise<void> | void;
  onSuccess?: (v: TSuccess) => Promise<void> | void;
}

export class BuildedInput<T> {
  display = $state<T>(null as any);
  // Backing store for `value` — only used WITHOUT a sanitizer, where `value`
  // and `display` are two independent states (legacy behavior). With a
  // sanitizer, `display` is the single writable source and `value` derives
  // from it via the getter, so `_value` is left untouched.
  private _value = $state<T>(null as any);
  private serverErrorMessage = $state<string | null>(null);
  private serverErrorValue = $state.raw<T | null>(null);
  sanitizer?: Sanitizer;
  required: boolean;
  nullable: boolean;
  placeholder: T;
  max?: number;
  readonly kind = "builded";
  readonly validator?: ValidatorFn<T>;

  constructor(params: {
    key?: T | undefined;
    example: T;
    required: boolean;
    nullable?: boolean;
    placeholder: T;
    max?: number;
    validator?: ValidatorFn<T>;
    sanitizer?: Sanitizer;
  }) {
    const { example, required, nullable, key, validator, placeholder, max, sanitizer } = params;

    this.required = required;
    this.nullable = nullable ?? false;
    this.placeholder = placeholder;

    if (max !== undefined) {
      this.max = max;
    }

    if (validator) {
      this.validator = validator;
    }

    if (sanitizer) {
      this.sanitizer = sanitizer;
    }

    const initial = key === undefined ? example : key;

    if (this.sanitizer) {
      this.value = initial as T; // setter formata display a partir do valor canônico
    } else {
      this._value = initial; // comportamento atual: dois states independentes
      this.display = initial;
    }
  }

  get value(): T {
    if (!this.sanitizer) return this._value;
    const parsed = this.sanitizer.parse((this.display ?? "") as unknown as string);
    if (this.nullable && parsed === "") return null as unknown as T;
    return parsed as unknown as T;
  }

  set value(v: T) {
    if (!this.sanitizer) {
      this._value = v; // back-compat: não toca display
      return;
    }
    if (v === null || v === undefined) {
      this.display = "" as unknown as T;
      return;
    }
    this.display = this.sanitizer.format(String(v)) as unknown as T;
  }

  /**
   * Reaplica a máscara: parse(display) -> format. Usado na hidratação / oninput
   * pelo componente. No-op sem sanitizer. Reassina `display`, então o caret vai
   * pro fim — isso é responsabilidade do componente, não do reflector.
   */
  reformat(): void {
    if (!this.sanitizer) return;
    const parsed = this.sanitizer.parse((this.display ?? "") as unknown as string);
    this.display = this.sanitizer.format(parsed) as unknown as T;
  }

  validate(): ValidatorResult {
    if (!this.validator) return null;
    return this.validator(this.value);
  }

  setServerError(message: string) {
    this.serverErrorMessage = message;
    this.serverErrorValue = this.value;
  }

  clearServerError() {
    this.serverErrorMessage = null;
    this.serverErrorValue = null;
  }

  get serverError(): string | null {
    if (this.serverErrorMessage === null) return null;
    return this.value === this.serverErrorValue ? this.serverErrorMessage : null;
  }
}

export class EnumQueryBuilder<T> {
  readonly key: string = "";
  private readonly defaultValues: T[] = [];

  values = $derived(
    page.url.searchParams.has(this.key)
      ? (page.url.searchParams.getAll(this.key) as T[])
      : this.defaultValues,
  );
  selected = $state<T | null>(null);

  constructor(params: { key: string; defaultValues?: T[] }) {
    this.key = params.key;
    this.defaultValues = params.defaultValues ?? [];
  }

  add = () => {
    if (!this.selected) return;
    const values = [...this.values, this.selected] as string[];
    changeArrayParam({ key: this.key, values });
    this.selected = null;
  };

  remove = (index: number) => {
    const values = [
      ...this.values.slice(0, index),
      ...this.values.slice(index + 1),
    ] as string[];
    return changeArrayParam({ key: this.key, values });
  };
}

export function build<T>(params: {
  key?: T | undefined;
  example: T;
  placeholder: T;
  required: boolean;
  nullable?: boolean;
  max?: number;
  validator?: ValidatorFn<T>;
  sanitizer?: Sanitizer;
}): BuildedInput<T> {
  return new BuildedInput(params);
}

export function isFormValid<T>(schema: PartialBuildedInput<T>): boolean {
  delete (schema as { bundle?: unknown }).bundle;

  const arrayOfBuildedInputs = Object.values(schema) as BuildedInput<unknown>[];

  const isValid = arrayOfBuildedInputs.every((a) => {
    const result = a?.validate?.() ?? null;

    if (result) {
      throw new Error(`O valor ${a.value} do campo está incorreto. ${result}`);
    }

    return result === null;
  });

  if (!isValid) {
    toast.error({
      title: "Erro ao fazer a requisição",
      description: "Um ou mais campos preenchidos estão incorretos.",
    });
  }

  return isValid;
}

export function genericArrayBundler(data: string[]): string[];
export function genericArrayBundler<T extends { bundle: () => BundleResult<T> }>(
  data: T[],
): BundleResult<T>[];
export function genericArrayBundler<T extends { bundle: () => BundleResult<T> }>(
  data: T[] | string[],
) {
  if (data.length === 0) return [];
  if (typeof data[0] === "string") return data;
  return (data as T[]).map((item) => item.bundle());
}

/**
 * Atualiza um query param na URL.
 * - `""` (string vazia) → remove o param.
 * - qualquer outro valor → `searchParams.set(key, String(event))`.
 */
export function changeParam({ event, key }: QueryContract) {
  const url = new SvelteURL(page.url);
  if (event === "") {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, String(event));
  }
  goto(url, { replaceState: true, keepFocus: true });
}

type StringOrNumber = string | number;

type QueryWithArrayType = {
  key: string;
  value: string | number | null | StringOrNumber[];
};

export class QueryBuilder {
  readonly key: string;
  readonly kind = "query";
  private readonly defaultValue: string | null;

  constructor(params: { key: string; defaultValue?: string | number | null }) {
    this.key = params.key;
    this.defaultValue =
      params.defaultValue === undefined || params.defaultValue === null
        ? null
        : String(params.defaultValue);
  }

  get value(): string | null {
    const fromUrl = page.url.searchParams.get(this.key);
    return fromUrl !== null ? fromUrl : this.defaultValue;
  }

  /**
   * Aplica o valor recebido ao query param.
   * - `null` / `undefined` → no-op (não chama `goto`).
   * - `""` (string vazia) → delega pra `changeParam`, que remove o param.
   * - número / string não-vazia → `set(key, String(event))`.
   */
  update(event: string | number | null) {
    if (event === null || event === undefined) return;
    return changeParam({ key: this.key, event: String(event) });
  }
}

/**
 * Atualiza vários query params de uma vez.
 * - array → `delete(key)` seguido de `append` para cada item.
 * - `""` → remove o param.
 * - outros valores → `set(key, String(value))`.
 */
export function setQueryGroup(group: QueryWithArrayType[]) {
  if (!browser) return;

  const url = new SvelteURL(page.url);

  for (const p of group) {
    const { key, value } = p;

    if (Array.isArray(value)) {
      url.searchParams.delete(key);
      value.forEach((v) => url.searchParams.append(key, String(v)));
      continue;
    }

    if (value === "") {
      url.searchParams.delete(key);
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  goto(url, { replaceState: true, keepFocus: false });
}

export function changeArrayParam({ values, key }: { values: string[]; key: string }) {
  const url = new SvelteURL(page.url);
  url.searchParams.delete(key);
  values.forEach((value) => url.searchParams.append(key, value));
  goto(url, { replaceState: true, keepFocus: true });
}

export function bundleStrict<T extends Record<string, unknown>>(
  payload: T,
): { [K in keyof T as Exclude<T[K], undefined> extends never ? never : K]: Exclude<T[K], undefined> };
export function bundleStrict(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}
