/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "$lib/utils/toast.svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { browser } from "$app/environment";
import { SvelteURL } from "svelte/reactivity";

type ValidatorResult = string | null;
type ValidatorFn<T> = (v: T) => ValidatorResult;
type BundleResult<T> = T extends { bundle: () => infer R } ? R : T;

export type ApiCallParams<TResponse, TPaths = void> = TPaths extends void
  ? { behavior?: Behavior<TResponse, ApiErrorResponse> }
  : { behavior?: Behavior<TResponse, ApiErrorResponse>; paths?: TPaths };

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

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export class Behavior<TSuccess = unknown, TError = unknown> {
  onError?: (e: TError) => Promise<void> | void;
  onSuccess?: (v: TSuccess) => Promise<void> | void;
}

export class BuildedInput<T> {
  value = $state<T>(null as any);
  display = $state<T>(null as any);
  required: boolean;
  placeholder: T;
  readonly kind = "builded";
  readonly validator?: ValidatorFn<T>;

  constructor(params: {
    key?: T | undefined;
    example: T;
    required: boolean;
    placeholder: T;
    validator?: ValidatorFn<T>;
  }) {
    const { example, required, key, validator, placeholder } = params;

    const initial = key === undefined ? example : key;

    this.value = initial;
    this.display = initial;
    this.required = required;
    this.placeholder = placeholder;

    if (validator) {
      this.validator = validator;
    }
  }

  validate(): ValidatorResult {
    if (!this.validator) return null;
    return this.validator(this.value);
  }
}

export class EnumQueryBuilder<T> {
  readonly key: string = "";
  values = $derived(page.url.searchParams.getAll(this.key)) as T[];
  selected = $state<T | null>(null);

  constructor(params: { key: string }) {
    const { key } = params;

    this.key = key;
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
  validator?: ValidatorFn<T>;
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
export function genericArrayBundler<
  T extends { bundle: () => BundleResult<T> },
>(data: T[]): BundleResult<T>[];
export function genericArrayBundler<
  T extends { bundle: () => BundleResult<T> },
>(data: T[] | string[]) {
  if (data.length === 0) return [];
  if (typeof data[0] === "string") return data;
  return (data as T[]).map((item) => item.bundle());
}

export function changeParam({ event, key }: QueryContract) {
  const newValue = event;
  const url = new SvelteURL(page.url);
  url.searchParams.set(key, String(newValue));
  goto(url, { replaceState: true, keepFocus: true });
}

type StringOrNumber = string | number;

type QueryWithArrayType = {
  key: string;
  value: string | number | null | StringOrNumber[];
};

export class QueryBuilder {
  readonly key: string = "";
  value = $state<string | null>(null);
  readonly kind = "query";

  constructor(params: { key: string }) {
    const { key } = params;
    this.key = key;

    const urlValue = page.url.searchParams.get(key);
    this.value = urlValue !== null ? urlValue : null;
  }

  update(event: string | number | null) {
    if (event === null || event === undefined) return;
    this.value = String(event);
    return changeParam({ key: this.key, event: this.value });
  }
}

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

    url.searchParams.set(key, String(value));
  }

  goto(url, { replaceState: true, keepFocus: false });
}

export function changeArrayParam({
  values,
  key,
}: {
  values: string[];
  key: string;
}) {
  const url = new SvelteURL(page.url);
  url.searchParams.delete(key);
  values.forEach((value) => url.searchParams.append(key, value));
  goto(url, { replaceState: true, keepFocus: true });
}
