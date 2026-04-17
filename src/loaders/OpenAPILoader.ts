import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import { Source } from "../file.js";
import type { OpenAPIObject } from "../types/open-api-spec.interface.js";

const BACKUP_PATH = "src/reflector/backup.json";

/**
 * Fetches the remote OpenAPI document; on network failure, falls back to
 * the on-disk backup written during the previous successful run.
 */
export class OpenAPILoader {
  static async load(docUrl: string): Promise<OpenAPIObject> {
    try {
      const response = await axios.get<OpenAPIObject>(docUrl, { timeout: 15000 });
      const data = response.data;
      const backup = new Source({ path: BACKUP_PATH, data: JSON.stringify(data) });
      await backup.save();
      return data;
    } catch {
      console.warn(`[reflector] Não foi possível obter a documentação em ${docUrl}. Carregando cópia local...`);
      const backupPath = path.resolve(process.cwd(), BACKUP_PATH);
      return JSON.parse(fs.readFileSync(backupPath, "utf8")) as OpenAPIObject;
    }
  }
}
