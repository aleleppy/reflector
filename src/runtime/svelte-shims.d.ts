// Ambient declarations for Svelte 5 runes and SvelteKit modules.
// Only loaded when type-checking the runtime template — not shipped to consumers.

declare function $state<T>(initial: T): T;
declare function $state<T>(): T | undefined;
declare namespace $state {
  function raw<T>(initial: T): T;
}

declare function $derived<T>(expression: T): T;
declare namespace $derived {
  function by<T>(fn: () => T): T;
}

declare module "$lib/utils/toast.svelte" {
  interface ToastParams {
    title: string;
    description: string;
  }
  const toast: {
    error(params: ToastParams): void;
    success(params: ToastParams): void;
  };
  export default toast;
}

declare module "$app/navigation" {
  export function goto(
    url: URL | string,
    opts?: { replaceState?: boolean; keepFocus?: boolean },
  ): Promise<void>;
}

declare module "$app/state" {
  export const page: {
    url: URL;
    params: Record<string, string>;
  };
}

declare module "$app/environment" {
  export const browser: boolean;
}

declare module "svelte/reactivity" {
  export class SvelteURL extends URL {}
}
