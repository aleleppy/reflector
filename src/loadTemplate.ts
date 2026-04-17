import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Reads the runtime template file that is emitted verbatim into the consumer project. */
export function loadReflectorTemplate(): string {
  return fs.readFileSync(path.resolve(here, "runtime/reflector.svelte.ts"), "utf8");
}
