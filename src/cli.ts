#!/usr/bin/env node
import { reflector } from "./generate-doc.js";

try {
  await reflector(); // lê .env e roda tudo
  console.log("[reflector] Finalizado com sucesso.");
  process.exit(0);
} catch (err) {
  console.error("[reflector] Falha:", err instanceof Error ? err.message : err);
  process.exit(1);
}
