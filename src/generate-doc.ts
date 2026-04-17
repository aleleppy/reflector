import "dotenv/config";

import { Reflector } from "./core/Reflector.js";
import { OpenAPILoader } from "./loaders/OpenAPILoader.js";
import { ConfigLoader } from "./loaders/ConfigLoader.js";

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

function getParams(): { BACKEND_URL: string; ENVIRONMENT: string } {
  const BACKEND_URL_RAW = pickEnv("BACKEND_URL", "PUBLIC_BACKEND");
  const ENVIRONMENT_RAW = pickEnv("ENVIRONMENT", "VITE_ENVIRONMENT", "VITE_ENVIROMENT", "NODE_ENV") ?? "PROD";

  if (!BACKEND_URL_RAW) throw new Error("BACKEND_URL vazio");

  const ENVIRONMENT = ENVIRONMENT_RAW.toUpperCase();
  const BACKEND_URL = withTrailingSlash(BACKEND_URL_RAW);

  if (ENVIRONMENT === "PROD") console.warn("[reflector] Ambiente não-DEV: os schemas serão atualizados automaticamente.");

  return { BACKEND_URL, ENVIRONMENT };
}

export async function reflector(manual = false) {
  const { BACKEND_URL, ENVIRONMENT } = getParams();

  if (ENVIRONMENT === "DEV" && !manual) {
    console.warn("[reflector] Ambiente DEV: para regerar os schemas manualmente, use: npx reflect");
    return breakReflector();
  }

  const data = await OpenAPILoader.load(`${BACKEND_URL}openapi.json`);
  const fieldConfigs = ConfigLoader.loadFieldConfigs();
  const typeImports = ConfigLoader.loadTypeImports();
  const { apiImport, experimentalFeatures, config } = ConfigLoader.loadReflectorJson();

  const { components, paths } = data;
  if (!components) {
    console.warn("[reflector] OpenAPI sem components; abortando.");
    return breakReflector();
  }

  const r = new Reflector({ components, paths, fieldConfigs, typeImports, apiImport, experimentalFeatures, config });
  await r.build();

  return breakReflector();
}

function breakReflector() {
  return { name: "vite-plugin-generate-doc" };
}
