/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "$lib/utils/toast.svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { browser } from "$app/environment";
import { untrack } from "svelte";
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

/**
 * Discriminated result of a generated `run()` call. `ok` is the single
 * discriminator — never branch on `data` being nullish to detect success.
 * `data` is the raw response class instance (with `.bundle()`) for endpoints
 * with a body, and `null` for void endpoints.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorResponse };

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
      // Antes só escrevia `_value`, deixando `display` stale → input de texto
      // (`bind:value={data.display}`) renderizava vazio quando o consumidor setava
      // `.value` e esquecia `.display`. Agora mantém os dois em sincronia. `_value`
      // segue sendo a fonte de leitura do getter, então não quebra quem mantém
      // value≠display via sanitizer ou mask manual (que seta `display` DEPOIS).
      this._value = v;
      this.display = v;
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

  /**
   * Hidrata in-place: seta valor canônico + display formatado, sanitizer-aware,
   * e limpa server error. Envolto em `untrack` pra poder ser chamado de dentro
   * de um `$effect` que lê `data` sem criar loop (a leitura de
   * `display`/`sanitizer` não vira dependência). Substitui o
   * `hydrateForm`/`clearFormInPlace` que os consumidores escreviam na mão.
   */
  hydrate(v: T): void {
    untrack(() => {
      if (this.sanitizer) {
        this.value = v; // setter já formata display a partir do canônico
      } else {
        this._value = v;
        this.display = v;
      }
      this.clearServerError();
    });
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
    (pendingUrl ?? page.url).searchParams.has(this.key)
      ? ((pendingUrl ?? page.url).searchParams.getAll(this.key) as T[])
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
 * Acumulador de mutações de query param. N chamadas no mesmo tick mutam a MESMA
 * `SvelteURL` pendente e coalescem num único `goto` agendado por microtask —
 * evita clobber (cada `goto` partir da URL antiga) e faz read-after-write
 * honesto (os getters leem de `pendingUrl ?? page.url`). `$state.raw`: a troca
 * de referência null↔URL dá a reatividade grossa; a `SvelteURL` já é reativa
 * nos próprios `searchParams`, então um `$state` profundo proxiaria um objeto
 * que já é reativo.
 */
let pendingUrl = $state.raw<SvelteURL | null>(null);

function stageParamMutation(mutate: (params: URLSearchParams) => void) {
  if (!browser) return;
  if (!pendingUrl) {
    pendingUrl = new SvelteURL(page.url);
    queueMicrotask(flushPendingUrl);
  }
  mutate(pendingUrl.searchParams);
}

function flushPendingUrl() {
  const url = pendingUrl;
  pendingUrl = null;
  if (url) goto(url, { replaceState: true, keepFocus: true });
}

/**
 * Atualiza um query param na URL.
 * - `""` (string vazia) → remove o param.
 * - qualquer outro valor → `searchParams.set(key, String(event))`.
 */
export function changeParam({ event, key }: QueryContract) {
  stageParamMutation((params) => {
    if (event === "") {
      params.delete(key);
    } else {
      params.set(key, String(event));
    }
  });
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

  /** Snapshot read-only do query param (a URL é a fonte). Escrita só via `.update()`. */
  get current(): string | null {
    const fromUrl = (pendingUrl ?? page.url).searchParams.get(this.key);
    return fromUrl !== null ? fromUrl : this.defaultValue;
  }

  /**
   * @deprecated Use `.current`. `.value` colide de nome com `BuildedInput.value`
   * (que é gravável) — semântica oposta, fonte de confusão. Será removido num major
   * futuro; até lá delega pra `.current`.
   */
  get value(): string | null {
    return this.current;
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
  stageParamMutation((params) => {
    for (const p of group) {
      const { key, value } = p;

      if (Array.isArray(value)) {
        params.delete(key);
        value.forEach((v) => params.append(key, String(v)));
        continue;
      }

      if (value === "") {
        params.delete(key);
        continue;
      }

      params.set(key, String(value));
    }
  });
}

export function changeArrayParam({ values, key }: { values: string[]; key: string }) {
  stageParamMutation((params) => {
    params.delete(key);
    values.forEach((value) => params.append(key, value));
  });
}

export function bundleStrict<T extends Record<string, unknown>>(
  payload: T,
): { [K in keyof T as Exclude<T[K], undefined> extends never ? never : K]: Exclude<T[K], undefined> };
export function bundleStrict(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

function isBuildedInput(v: unknown): v is BuildedInput<unknown> {
  return v != null && typeof v === "object" && (v as { kind?: unknown }).kind === "builded";
}

/**
 * Serialização schema-aware de request: recebe as instâncias `BuildedInput` (não o
 * `.value` já extraído), então enxerga os flags (`required`/`nullable`) que vivem na
 * instância. Corrige o 400 silencioso do `bundleStrict` cego: campo `nullable` apagado
 * pra `''` virava `""` no payload (estourava parse de ISO date no back). Aqui `nullable`
 * com `''` vira `null` de propósito.
 *
 * Não faz gate client-side de `required` — consistente com o padrão do projeto
 * (`bundle()` só serializa; validação é do backend, surface via toast). Quem quiser
 * gate síncrono usa `isFormValid` antes do `bundle`.
 *
 * Trata cada entry: `undefined` → omite; `BuildedInput` → value (com coerção nullable);
 * array → `genericArrayBundler`; DTO aninhado (`.bundle()`) → recursa; plain → passthrough.
 *
 * O overload tipado espelha o `bundleStrict`: strip do wrapper `BuildedInput<V> → V`,
 * array → `BundleResult`, DTO aninhado → retorno do seu `bundle`, e dropa as keys
 * puramente `undefined`. Sem ele o request `bundle()` regredia pra `Record<string,unknown>`
 * e estourava svelte-check em todo consumidor que lê campo tipado do payload.
 */
type BundledValue<V> =
  V extends BuildedInput<infer U>
    ? U
    : V extends readonly (infer E)[]
      ? BundleResult<E>[]
      : V extends { bundle: () => infer R }
        ? R
        : V;

export function bundleInputs<T extends Record<string, unknown>>(
  inputs: T,
): {
  [K in keyof T as Exclude<BundledValue<T[K]>, undefined> extends never
    ? never
    : K]: Exclude<BundledValue<T[K]>, undefined>;
};
export function bundleInputs(inputs: Record<string, unknown>): Record<string, unknown>;
export function bundleInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(inputs)) {
    if (v === undefined) continue; // opcional nunca construído → omite

    if (isBuildedInput(v)) {
      let val = v.value as unknown;
      if (v.nullable && val === "") val = null; // mata o ''→"" que estoura ISO no back
      if (val === undefined) continue; // omite undefined; NÃO omite null (nullable manda null de propósito)
      out[key] = val;
      continue;
    }

    if (Array.isArray(v)) {
      out[key] = genericArrayBundler(v);
      continue;
    }

    if (v && typeof (v as { bundle?: unknown }).bundle === "function") {
      out[key] = (v as { bundle: () => unknown }).bundle(); // DTO aninhado → recursa
      continue;
    }

    out[key] = v; // plain (v !== undefined já garantido)
  }
  return out;
}
