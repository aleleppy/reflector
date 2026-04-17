import * as fs from "node:fs";
import * as path from "node:path";

const src = path.resolve("src/runtime/reflector.svelte.ts");
const dst = path.resolve("dist/runtime/reflector.svelte.ts");

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log(`copied ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dst)}`);
