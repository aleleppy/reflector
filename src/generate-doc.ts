import "dotenv/config";

import { Reflector } from "./core/Reflector.js";
import { OpenAPILoader } from "./loaders/OpenAPILoader.js";
import { ConfigLoader } from "./loaders/ConfigLoader.js";
import { describeSpecSource, loadSpecSource } from "./loaders/SpecSource.js";

import type { SpecSource } from "./loaders/SpecSource.js";
import type { OpenAPIObject } from "./types/open-api-spec.interface.js";

export interface ReflectorOptions {
  /** Overrides `source` from `reflector.json` (the CLI's `--spec` / `--url` land here). */
  source?: SpecSource;
}

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function withTrailingSlash(u: string): string {
  return u.endsWith("/") ? u : `${u}/`;
}

function resolveEnvironment(): string {
  return (pickEnv("ENVIRONMENT", "VITE_ENVIRONMENT", "VITE_ENVIROMENT", "NODE_ENV") ?? "PROD").toUpperCase();
}

/**
 * @deprecated Legacy path (no `source` configured): GET `${BACKEND_URL}openapi.json`,
 * silently falling back to `backup.json`. Removed in 3.0. `BACKEND_URL` is
 * checked eagerly (before the DEV short-circuit), as it always was.
 */
function legacyLoader(): () => Promise<OpenAPIObject> {
  const BACKEND_URL_RAW = pickEnv("BACKEND_URL", "PUBLIC_BACKEND");
  if (!BACKEND_URL_RAW) throw new Error("BACKEND_URL vazio");
  const docUrl = `${withTrailingSlash(BACKEND_URL_RAW)}openapi.json`;

  return () => {
    console.warn(
      `[reflector] DEPRECATED: nenhum "source" configurado — gerando de ${docUrl} com fallback silencioso para backup.json. ` +
        `Esse modo e o fallback serão removidos na 3.0. Configure "source": { "file": "contract/openapi.json" } no reflector.json ` +
        `(ou use npx reflect --spec <path>).`,
    );
    return OpenAPILoader.load(docUrl);
  };
}

export async function reflector(manual = false, options: ReflectorOptions = {}) {
  const ENVIRONMENT = resolveEnvironment();
  const reflectorJson = ConfigLoader.loadReflectorJson();
  const source = options.source ?? reflectorJson.source;
  const loadSpec = source ? () => loadSpecSource(source) : legacyLoader();

  if (ENVIRONMENT === "PROD") console.warn("[reflector] Ambiente não-DEV: os schemas serão atualizados automaticamente.");

  if (ENVIRONMENT === "DEV" && !manual) {
    console.warn("[reflector] Ambiente DEV: para regerar os schemas manualmente, use: npx reflect");
    return breakReflector();
  }

  const data = await loadSpec();
  const fieldConfigs = ConfigLoader.loadFieldConfigs();
  const typeImports = ConfigLoader.loadTypeImports();
  const { apiImport, experimentalFeatures, config } = reflectorJson;

  const { components, paths } = data;
  if (!components) {
    console.warn("[reflector] OpenAPI sem components; abortando.");
    return breakReflector();
  }

  const r = new Reflector({ components, paths, fieldConfigs, typeImports, apiImport, experimentalFeatures, config });
  await r.build();

  if (source) console.log(`[reflector] Gerado a partir do ${describeSpecSource(source)}.`);
  return breakReflector();
}

function breakReflector() {
  return { name: "vite-plugin-generate-doc" };
}
