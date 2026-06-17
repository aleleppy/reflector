/**
 * Isolates the consumer's framework conventions (import aliases, env flag
 * name) from the codegen core. Defaults reproduce the previous hard-coded
 * SvelteKit paths so existing consumers don't need to change anything.
 */
export interface ReflectorConfig {
  /** Alias that resolves to the generated reflector folder (e.g. `$reflector`). */
  reflectorAlias: string;
  /** Full import path to the validators module (exports `validateInputs`). */
  validatorsImport: string;
  /** Full import path to the sanitizers module (input masks; exports `sanitizers`). */
  sanitizersImport: string;
  /** Module path for the environment flag (e.g. `$env/static/public`). */
  environmentImport: string;
  /** Name of the exported environment flag — values other than `DEV` are treated as prod. */
  environmentFlag: string;
  /** Full import path to the toast module (default export must expose `.error({ title, description })`). */
  toastImport: string;
}

export const DEFAULT_REFLECTOR_CONFIG: ReflectorConfig = {
  reflectorAlias: "$reflector",
  validatorsImport: "$lib/sanitizers/validateFormats",
  sanitizersImport: "$lib/sanitizers/input-sanitizers",
  environmentImport: "$env/static/public",
  environmentFlag: "PUBLIC_ENVIRONMENT",
  toastImport: "$lib/utils/toast.svelte",
};

export function resolveReflectorConfig(partial?: Partial<ReflectorConfig>): ReflectorConfig {
  return { ...DEFAULT_REFLECTOR_CONFIG, ...(partial ?? {}) };
}
