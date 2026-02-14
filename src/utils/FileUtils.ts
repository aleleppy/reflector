import { writeFileSync } from "node:fs";
import { mkdirSync, rmSync } from "node:fs";
import * as prettier from "prettier";

export async function writeFile(filePath: string, data: string, format = true): Promise<void> {
  if (format) {
    const options = await prettier.resolveConfig(process.cwd());
    const formatted = await prettier.format(data, { ...options, filepath: filePath });
    writeFileSync(filePath, formatted, "utf8");
  } else {
    writeFileSync(filePath, data, "utf8");
  }
}

export function ensureDirectory(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

export function clearDirectory(dirPath: string): void {
  rmSync(dirPath, { recursive: true, force: true });
  mkdirSync(dirPath, { recursive: true });
}
