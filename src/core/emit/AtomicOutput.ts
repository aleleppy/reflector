import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import type { Source } from "../../file.js";

/**
 * Writes a codegen run all-or-nothing. Every `Source` is formatted in memory
 * first (prettier is the usual mid-run failure), the result is written to a
 * staging dir inside `root` (same volume, so renames are cheap), and only then
 * each top-level entry is swapped into place. If anything fails before or
 * during the swap, the previous output is left (or put back) intact.
 *
 * Only the entries this run produces are touched; siblings under `root`
 * (e.g. the legacy `backup.json`) are preserved.
 */
export class AtomicOutput {
  static async commit(params: {
    /** Absolute output root (the generated folder). */
    root: string;
    sources: readonly Source[];
    /** Top-level dirs always replaced wholesale, even if this run emits nothing in them (drops stale files). */
    replaceDirs: readonly string[];
  }): Promise<void> {
    const { root, sources, replaceDirs } = params;

    const files = await Promise.all(
      sources.map(async (source) => ({ rel: relativeInside(root, source.path), data: await source.format() })),
    );

    const entries = new Set<string>(replaceDirs);
    for (const { rel } of files) entries.add(rel.split(path.sep)[0]!);

    const runId = `${process.pid}-${Date.now()}`;
    const staging = path.join(root, `.reflector-staging-${runId}`);
    const previous = path.join(root, `.reflector-previous-${runId}`);
    let keepPrevious = false;

    try {
      for (const dir of replaceDirs) fs.mkdirSync(path.join(staging, dir), { recursive: true });
      for (const { rel, data } of files) {
        const target = path.join(staging, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data, "utf8");
      }

      swap({ root, staging, previous, entries: [...entries] });
    } catch (error) {
      if (error instanceof AtomicOutputRollbackError) keepPrevious = true;
      throw error;
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
      if (!keepPrevious) fs.rmSync(previous, { recursive: true, force: true });
    }
  }
}

function relativeInside(root: string, file: string): string {
  const rel = path.relative(root, path.resolve(file));
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`[reflector] Arquivo gerado fora da pasta de saída: ${file} (saída: ${root})`);
  }
  return rel;
}

/**
 * Moves current entries aside and staged ones into place. On failure rolls
 * back and rethrows; if the rollback itself fails, throws
 * `AtomicOutputRollbackError` and the old output stays in `previous`.
 */
function swap(params: { root: string; staging: string; previous: string; entries: string[] }): void {
  const { root, staging, previous, entries } = params;
  const movedAside: string[] = [];
  const installed: string[] = [];

  fs.mkdirSync(previous, { recursive: true });
  try {
    for (const entry of entries) {
      const current = path.join(root, entry);
      if (fs.existsSync(current)) {
        fs.renameSync(current, path.join(previous, entry));
        movedAside.push(entry);
      }
      fs.renameSync(path.join(staging, entry), current);
      installed.push(entry);
    }
  } catch (error) {
    try {
      for (const entry of installed) fs.rmSync(path.join(root, entry), { recursive: true, force: true });
      for (const entry of movedAside) fs.renameSync(path.join(previous, entry), path.join(root, entry));
    } catch (rollbackError) {
      throw new AtomicOutputRollbackError(error, rollbackError, previous);
    }
    throw error;
  }
}

export class AtomicOutputRollbackError extends Error {
  override name = "AtomicOutputRollbackError";
  constructor(
    cause: unknown,
    rollbackCause: unknown,
    readonly previousDir: string,
  ) {
    super(
      `[reflector] Falha ao trocar a saída gerada (${(cause as Error).message}) e o rollback também falhou ` +
        `(${(rollbackCause as Error).message}). A saída anterior foi preservada em ${previousDir}.`,
      { cause },
    );
  }
}
