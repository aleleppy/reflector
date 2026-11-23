import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import type { OpenAPIObject } from "../types/open-api-spec.interface.js";

/**
 * Where the OpenAPI contract comes from. Exactly one key, same shape in
 * `reflector.json` (`"source": { "file": "contract/openapi.json" }`) and
 * in the CLI flags (`--spec <path>` / `--url <url>`).
 */
export type SpecSource = { file: string } | { url: string };

export class SpecSourceError extends Error {
  override name = "SpecSourceError";
}

/** Validates a raw `source` value (from reflector.json) into a `SpecSource`. */
export function parseSpecSource(raw: unknown, origin: string): SpecSource {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SpecSourceError(`[reflector] "source" inválido em ${origin}: esperado { "file": "<path>" } ou { "url": "<url>" }.`);
  }

  const keys = Object.keys(raw);
  const value = (raw as Record<string, unknown>)[keys[0] ?? ""];
  const valid = keys.length === 1 && (keys[0] === "file" || keys[0] === "url") && typeof value === "string" && value.trim() !== "";
  if (!valid) {
    throw new SpecSourceError(
      `[reflector] "source" inválido em ${origin}: use exatamente uma chave, "file" ou "url", com string não vazia (recebido ${JSON.stringify(raw)}).`,
    );
  }

  return keys[0] === "file" ? { file: value as string } : { url: value as string };
}

export function describeSpecSource(source: SpecSource): string {
  return "file" in source ? `arquivo ${path.resolve(process.cwd(), source.file)}` : `URL ${source.url}`;
}

/**
 * Loads and validates the contract. Never writes `backup.json` and never
 * falls back: any read, download, parse or validation problem throws a
 * `SpecSourceError` naming the source.
 */
export async function loadSpecSource(source: SpecSource): Promise<OpenAPIObject> {
  const where = describeSpecSource(source);
  const text = "file" in source ? readSpecFile(source.file) : await downloadSpec(source.url);

  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new SpecSourceError(`[reflector] Contrato OpenAPI inválido (${where}): JSON inválido — ${(e as Error).message}`);
  }

  assertOpenAPI3(doc, where);
  return doc;
}

function readSpecFile(file: string): string {
  const absolute = path.resolve(process.cwd(), file);
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    const reason = code === "ENOENT" ? "arquivo não encontrado" : (e as Error).message;
    throw new SpecSourceError(`[reflector] Não foi possível ler o contrato OpenAPI em ${absolute}: ${reason}`);
  }
}

async function downloadSpec(url: string): Promise<string> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 15000,
      responseType: "text",
      transformResponse: [(data: string) => data],
    });
    return response.data;
  } catch (e) {
    const status = axios.isAxiosError(e) && e.response ? `HTTP ${e.response.status}` : (e as Error).message;
    throw new SpecSourceError(`[reflector] Falha ao baixar o contrato OpenAPI de ${url}: ${status}. Modo "url" não usa backup.json.`);
  }
}

/**
 * Minimal structural check: enough to reject non-OpenAPI JSON, Swagger 2.0
 * and documents the codegen can't consume. Not a full schema validation.
 */
function assertOpenAPI3(doc: unknown, where: string): asserts doc is OpenAPIObject {
  const fail = (reason: string): never => {
    throw new SpecSourceError(`[reflector] Contrato OpenAPI inválido (${where}): ${reason}`);
  };
  const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

  if (!isObject(doc)) return fail("o documento não é um objeto JSON.");

  const version = doc["openapi"];
  if (typeof version !== "string" || !/^3\.\d+(\.\d+)?/.test(version)) {
    const found = typeof doc["swagger"] === "string" ? `swagger ${doc["swagger"]}` : `openapi=${JSON.stringify(version)}`;
    return fail(`esperado OpenAPI 3.x, encontrado ${found}.`);
  }
  if (!isObject(doc["paths"])) return fail('campo "paths" ausente ou não é objeto.');
  if (!isObject(doc["components"])) return fail('campo "components" ausente ou não é objeto.');
}
