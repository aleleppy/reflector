import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import { Source } from "../file.js";
import { generatedDir } from "../vars.global.js";
import type { OpenAPIObject } from "../types/open-api-spec.interface.js";

function backupPath(): string {
  return path.resolve(process.cwd(), `${generatedDir}/backup.json`);
}

/**
 * Legacy loader (no `source` configured). Fetches the remote OpenAPI
 * document; on ANY failure, silently falls back to the on-disk backup
 * written during the previous successful run, under `generatedDir`.
 *
 * @deprecated The fallback hides a dead backend behind a "successful" run.
 * Use `source` (`SpecSource`), which never falls back. Removed in 3.0.
 */
export class OpenAPILoader {
  static async load(docUrl: string): Promise<OpenAPIObject> {
    const target = backupPath();
    try {
      const response = await axios.get<OpenAPIObject>(docUrl, { timeout: 15000 });
      const data = response.data;
      const backup = new Source({ path: target, data: JSON.stringify(data) });
      await backup.save();
      return data;
    } catch {
      console.warn(`[reflector] Não foi possível obter a documentação em ${docUrl}. Carregando cópia local...`);
      return JSON.parse(fs.readFileSync(target, "utf8")) as OpenAPIObject;
    }
  }
}
