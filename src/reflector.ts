export class ReflectorFile {
  private readonly imports = [
    'import toast from "$lib/utils/toast.svelte"',
    'import { goto } from "$app/navigation"',
    'import { page } from "$app/state"',
  ].join(";");

  private readonly types = [
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

  private readonly classes = [
    `export interface ApiErrorResponse {
      error: string;
      message: string;
    }`,
    `export class Behavior<TSuccess = unknown, TError = unknown> {
      onError?: (e: TError) => void;
      onSuccess?: (v: TSuccess) => void;
    }`,
    `export class BuildedInput<T> {
      value = $state<T>(null as any);
      display = $state<T>(null as any);
      required: boolean;
      placeholder: T;
      readonly validator?: ValidatorFn<T>;

      constructor(params: {
        key?: T | undefined;
        example: T;
        required: boolean;
        placeholder: T;
        validator?: ValidatorFn<T>;
      }) {
        const { example, required, key, validator, placeholder } = params;

        const initial = key ?? example;

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
    }`,
    `
      export class EnumQueryBuilder<T> {
        private readonly key: string = '';
        values = $derived(page.url.searchParams.getAll(this.key)) as T[];
        selected = $state<T | null>(null);

        constructor(params: { key: string; values: T[] }) {
          const { key } = params;

          this.key = key;
        }

        add() {
          if (!this.selected) return;
          const values = [...this.values, this.selected] as string[];
          changeArrayParam({ key: this.key, values });
          this.selected = null;
        }

        remove(index: number) {
          const values = [
            ...this.values.slice(0, index),
            ...this.values.slice(index + 1),
          ] as string[];
          return changeArrayParam({ key: this.key, values });
        }
      }
    `,
  ].join(";");

  private readonly functions = [
    `export function build<T>(params: {
      key?: T | undefined;
      example: T;
      placeholder: T;
      required: boolean;
      validator?: ValidatorFn<T>;
    }): BuildedInput<T> {
      return new BuildedInput(params);
    }`,
    `export function isFormValid<T>(schema: Partial<T>): boolean {
      delete schema.bundle;

      const arrayOfBuildedInputs = Object.values(schema) as BuildedInput<unknown>[];

      const isValid = arrayOfBuildedInputs.every((a) => {
      const result = a?.validate?.() ?? null
        return result === null
      });

      if (!isValid) {
        toast.error('Erro ao fazer a requisição', 'Um ou mais campos preenchidos estão incorretos.');
      }

      return isValid;
    }`,
    `export function genericArrayBundler<T>(data: T[]): BundleResult<T>[] {
      return data.map((item) => {
        if (typeof (item as any)?.bundle === 'function') {
          return (item as any).bundle();
        }
        return item;
      });
    }`,
    `
    export function changeParam({ event, key }: QueryContract) {
      const newValue = event.currentTarget.value;
      const url = new URL(page.url);
      url.searchParams.set(key, String(newValue));
      goto(url, { replaceState: true, keepFocus: true });
    }
    `,
    `
    export class QueryBuilder {
      private readonly key: string = '';
      value = $derived(page.url.searchParams.get(this.key));

      constructor(params: { key: string; value: string | number | null }) {
        const { key } = params;

        this.key = key;
      }

      update(event: SvelteEvent) {
        return changeParam({ key: this.key, event });
      }
    }
    `,
    `
    export function changeArrayParam({
      values,
      key,
    }: {
      values: string[];
      key: string;
    }) {
      const url = new URL(page.url);
      url.searchParams.delete(key);
      values.forEach((value) => url.searchParams.append(key, value));
      goto(url, { replaceState: true, keepFocus: true });
    }
    `,
  ].join(";");

  fileContent = `
    ${this.imports}

    ${this.types}

    ${this.classes}

    ${this.functions}
  `;
}
