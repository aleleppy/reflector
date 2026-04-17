import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import { parseFieldConfigsFromConfig, parseTypeImportsFromTypesFile } from "../helpers/generate-doc.helper.js";

import type { FieldConfigs, TypeImports } from "../types/types.js";
import type { ReflectorConfig } from "../core/config/ReflectorConfig.js";

export interface ReflectorJson {
  apiImport: string;
  experimentalFeatures: boolean;
  config: Partial<ReflectorConfig>;
}

/**
 * Loads the consumer project's reflector config files:
 * `reflector.config.ts`, `reflector.types.ts`, and `reflector.json`.
 * Missing files are tolerated (empty defaults); other I/O or parse
 * failures throw with the offending path in the message so the user
 * sees the real problem instead of a silent empty config.
 */
export class ConfigLoader {
  static loadFieldConfigs(): FieldConfigs {
    const fieldConfigs: FieldConfigs = new Map();
    const configPath = path.resolve(process.cwd(), "src/reflector.config.ts");

    const configText = ConfigLoader.readOptional(configPath);
    if (configText === null) return fieldConfigs;

    const parsedConfigs = parseFieldConfigsFromConfig(configText);
    parsedConfigs.forEach((rel) => {
      rel.fields.forEach((field) => {
        const config: { validator?: string; type?: string } = {};
        if (rel.validator) config.validator = rel.validator;
        if (rel.type) config.type = rel.type;
        fieldConfigs.set(field, config);
      });
    });

    return fieldConfigs;
  }

  static loadTypeImports(): TypeImports {
    const typesPath = path.resolve(process.cwd(), "src/reflector.types.ts");
    const typesText = ConfigLoader.readOptional(typesPath);
    if (typesText === null) return new Map();
    return parseTypeImportsFromTypesFile(typesText);
  }

  static loadReflectorJson(): ReflectorJson {
    const result: ReflectorJson = { apiImport: "$lib/api", experimentalFeatures: false, config: {} };
    const jsonPath = path.resolve(process.cwd(), "reflector.json");

    const text = ConfigLoader.readOptional(jsonPath);
    if (text === null) return result;

    let parsed: { api?: string; experimentalFeatures?: boolean; config?: Partial<ReflectorConfig> };
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`[reflector] JSON inválido em ${jsonPath}: ${(e as Error).message}`);
    }

    if (parsed.api) result.apiImport = parsed.api;
    if (parsed.experimentalFeatures === true) result.experimentalFeatures = true;
    if (parsed.config) result.config = parsed.config;
    return result;
  }

  private static readOptional(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
      throw new Error(`[reflector] Falha ao ler ${filePath}: ${(e as Error).message}`);
    }
  }
}
