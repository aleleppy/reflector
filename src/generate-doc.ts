import "dotenv/config";
import axios from "axios";
import * as path from "node:path";
import * as fs from "node:fs";
import { Reflector } from "./main.js";
import { Source } from "./file.js";
import { parseValidatorFieldsFromConfig } from "./helpers/generate-doc.helper.js";
import type { OpenAPIObject } from "./types/open-api-spec.interface.js";
import type { FieldValidators } from "./types/types.js";

/** ajuda a pegar a 1ª env definida dentre várias chaves possíveis */
function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

/** normaliza URL base com / no fim */
function withTrailingSlash(u: string | undefined): string | undefined {
  if (!u) return u;
  return u.endsWith("/") ? u : `${u}/`;
}

function getParams(): { BACKEND_URL: string; ENVIRONMENT: string } {
  const BACKEND_URL_RAW = pickEnv("BACKEND_URL", "PUBLIC_BACKEND");
  const ENVIRONMENT_RAW =
    pickEnv("ENVIRONMENT", "VITE_ENVIRONMENT", "VITE_ENVIROMENT", "NODE_ENV") ?? "PROD";

  if (!BACKEND_URL_RAW) throw new Error("BACKEND_URL vazio");

  const ENVIRONMENT = ENVIRONMENT_RAW.toUpperCase();
  const BACKEND_URL = withTrailingSlash(BACKEND_URL_RAW)!;

  if (!BACKEND_URL) {
    console.warn(
      "[reflector] BACKEND_URL não definido (nem em params nem na .env: BACKEND_URL/PUBLIC_BACKEND).",
    );
  }

  if (ENVIRONMENT === "PROD")
    console.warn("[reflector] Ambiente não-DEV: os schemas serão atualizados automaticamente.");

  return { BACKEND_URL, ENVIRONMENT };
}

export async function reflector(manual = false) {
  const { BACKEND_URL, ENVIRONMENT } = getParams();

  if (ENVIRONMENT === "DEV" && !manual) {
    console.warn("[reflector] Ambiente DEV: para regerar os schemas manualmente, use: npx reflect");
    return breakReflector();
  }

  const DOC_URL = `${BACKEND_URL}openapi.json`;
  let data: OpenAPIObject;
  let validators: FieldValidators = new Map();

  try {
    const documentation = await axios.get<OpenAPIObject>(DOC_URL, { timeout: 15000 });
    data = documentation.data;
    const backup = new Source({ path: "src/backup.json", data: JSON.stringify(data) });
    await backup.save();
  } catch (e) {
    console.warn(
      `[reflector] Não foi possível obter a documentação em ${DOC_URL}. Carregando cópia local...`,
    );
    const backupPath = path.resolve(process.cwd(), "src/reflector/backup.json");
    data = JSON.parse(fs.readFileSync(backupPath, "utf8")) as OpenAPIObject;
  }

  try {
    const fieldsConfig = path.resolve(process.cwd(), "src/reflector.config.ts");
    const configText = fs.readFileSync(fieldsConfig, "utf8");
    const parsedRelations = parseValidatorFieldsFromConfig(configText);
    parsedRelations.forEach((rel) => {
      rel.fields.forEach((field) => {
        validators.set(field, rel.validator);
      });
    });
  } catch (e) {
    console.warn("[reflector] Não consegui ler/parsear reflector.config.ts", e);
  }

  // Lê reflector.json do projeto consumidor (opcional)
  let apiImport = '$repository/api';
  try {
    const reflectorJsonPath = path.resolve(process.cwd(), "reflector.json");
    const reflectorJson = JSON.parse(fs.readFileSync(reflectorJsonPath, "utf8"));
    if (reflectorJson.api) {
      apiImport = reflectorJson.api;
    }
  } catch {
    // reflector.json não encontrado ou inválido — usa o padrão
  }

  const { components, paths } = data;

  if (!components) {
    console.warn("[reflector] OpenAPI sem components; abortando.");
    return breakReflector();
  }

  const r = new Reflector({ components, paths, validators, apiImport });
  await r.build();
  await r.localSave(data);

  return breakReflector();
}

function breakReflector() {
  return {
    name: "vite-plugin-generate-doc",
  };
}
