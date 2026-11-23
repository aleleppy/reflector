import { reflector } from "../generate-doc.js";

import { SpecSourceError } from "../loaders/SpecSource.js";

import type { SpecSource } from "../loaders/SpecSource.js";

export const CLI_USAGE = `Uso: npx reflect [--spec <path> | --url <url>]

  --spec <path>  Gera a partir de um contrato OpenAPI 3.x em arquivo (sem fallback, sem backup.json).
  --url <url>    Gera a partir da URL do documento OpenAPI (sem fallback, sem backup.json).

Sem flags, usa "source" do reflector.json. Sem "source", cai no modo legado
(\${BACKEND_URL}openapi.json + fallback para backup.json), deprecated e removido na 3.0.`;

export class CliUsageError extends Error {
  override name = "CliUsageError";
}

export type CliArgs = { help: true } | { help: false; source?: SpecSource };

const FLAGS = { "--spec": "file", "--url": "url" } as const;

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let source: SpecSource | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") return { help: true };

    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    if (!(flag in FLAGS)) throw new CliUsageError(`[reflector] Argumento desconhecido: ${arg}`);

    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined || value.trim() === "" || value.startsWith("--")) {
      throw new CliUsageError(`[reflector] ${flag} exige um valor.`);
    }
    if (source) throw new CliUsageError("[reflector] Use só uma fonte: --spec ou --url, uma vez.");

    source = FLAGS[flag as keyof typeof FLAGS] === "file" ? { file: value } : { url: value };
  }

  return source ? { help: false, source } : { help: false };
}

/** Runs `npx reflect`; returns the process exit code instead of throwing. */
export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    const args = parseCliArgs(argv);
    if (args.help) {
      console.log(CLI_USAGE);
      return 0;
    }
    await reflector(true, args.source ? { source: args.source } : {});
    return 0;
  } catch (e) {
    // Expected failures (bad flags, bad contract) get a clean message; anything
    // else is a bug and keeps its stack.
    const expected = e instanceof CliUsageError || e instanceof SpecSourceError;
    console.error(expected ? e.message : e instanceof Error ? (e.stack ?? e.message) : String(e));
    if (e instanceof CliUsageError) console.error(`\n${CLI_USAGE}`);
    return 1;
  }
}
