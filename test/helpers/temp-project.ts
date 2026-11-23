import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as http from "node:http";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

import type { AddressInfo } from "node:net";

const here = path.dirname(fileURLToPath(import.meta.url));

export const fixturePath = (name: string) => path.join(here, "..", "fixtures", name, "openapi.json");
export const readFixture = (name: string) => fs.readFileSync(fixturePath(name), "utf8");

const ENV_KEYS = ["BACKEND_URL", "PUBLIC_BACKEND", "ENVIRONMENT", "VITE_ENVIRONMENT", "VITE_ENVIROMENT"] as const;

/**
 * Temp consumer project: chdir into it, clear the env the lib reads (the
 * repo's own `.env` is loaded by `dotenv/config` at import time) and mute
 * the console. `restore()` undoes all of it.
 */
export function useTempProject() {
  const originalCwd = process.cwd();
  const savedEnv = new Map(ENV_KEYS.map((k) => [k, process.env[k]]));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reflector-project-"));

  process.chdir(dir);
  for (const k of ENV_KEYS) delete process.env[k];
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  return {
    dir,
    warn,
    log,
    error,
    file: (rel: string) => path.join(dir, rel),
    write(rel: string, data: string) {
      const target = path.join(dir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data, "utf8");
    },
    exists: (rel: string) => fs.existsSync(path.join(dir, rel)),
    restore() {
      process.chdir(originalCwd);
      for (const [k, v] of savedEnv) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      vi.restoreAllMocks();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Every file under `root` as `rel → content` (rel with forward slashes). */
export function snapshotTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(root, full).split(path.sep).join("/")] = fs.readFileSync(full, "utf8");
    }
  };
  walk(root);
  return out;
}

/** A URL on localhost where nothing listens (connection refused). */
export async function deadUrl(): Promise<string> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}/`;
}

/** Serves `body` with `status` on every request until `close()`. */
export async function serve(status: number, body: string): Promise<{ url: string; hits: () => number; close: () => Promise<void> }> {
  let hits = 0;
  const server = http.createServer((_req, res) => {
    hits++;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/openapi.json`,
    hits: () => hits,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
