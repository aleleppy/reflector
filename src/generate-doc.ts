// src/generate-doc.ts
import "dotenv/config"; // carrega .env a partir de process.cwd()
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { Reflector } from "./main.js";
import { OpenAPIObject } from "./types/open-api-spec.interface.js";

/** ajuda a pegar a 1ª env definida dentre várias chaves possíveis */
function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

/** normaliza URL base com / no fim */
function withTrailingSlash(u: string) {
  if (!u) return u;
  return u.endsWith("/") ? u : `${u}/`;
}

function getParams() {
  const BACKEND_URL_RAW = pickEnv("BACKEND_URL", "PUBLIC_BACKEND");
  const ENVIRONMENT_RAW = pickEnv("ENVIRONMENT", "VITE_ENVIRONMENT", "VITE_ENVIROMENT", "NODE_ENV") ?? "PROD";

  if (!BACKEND_URL_RAW) throw new Error("BACKEND_URL vazio");

  const ENVIRONMENT = ENVIRONMENT_RAW.toUpperCase();
  const BACKEND_URL = withTrailingSlash(BACKEND_URL_RAW);

  if (!BACKEND_URL) {
    console.warn("[reflector] BACKEND_URL não definido (nem em params nem na .env: BACKEND_URL/PUBLIC_BACKEND).");
  }

  if (ENVIRONMENT === "PROD") console.warn("[reflector] Ambiente não-DEV: os schemas serão atualizados automaticamente.");

  return { BACKEND_URL, ENVIRONMENT };
}

export async function reflector(manual: boolean = false) {
  const { BACKEND_URL, ENVIRONMENT } = getParams();

  console.warn("opa");

  if (ENVIRONMENT === "DEV" && !manual) {
    console.warn("[reflector] Ambiente DEV: para regerar os schemas manualmente, use: npx reflect");
    return breakReflector();
  }

  const DOC_URL = `${BACKEND_URL}openapi.json`;
  let data: OpenAPIObject;

  try {
    const documentation = await axios.get(DOC_URL, { timeout: 15000 });
    data = documentation.data;
  } catch (e) {
    console.warn(`[reflector] Não foi possível obter a documentação em ${DOC_URL}. Carregando cópia local...`);
    const backupPath = path.resolve(process.cwd(), "src/reflector/backup.json");
    data = JSON.parse(fs.readFileSync(backupPath, "utf8")) as OpenAPIObject;
  }

  const { components, paths } = data;
  if (!components) {
    console.warn("[reflector] OpenAPI sem components; abortando.");
    return { name: "vite-plugin-generate-doc" };
  }

  const r = new Reflector({ components, paths });
  r.build();
  r.localSave(data);

  breakReflector();
}

function breakReflector() {
  return {
    name: "vite-plugin-generate-doc",
  };
}
