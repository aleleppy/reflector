import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import prettier from "prettier";

export class Source {
  path: string;
  data: string;

  constructor(params: { path: string; data?: string }) {
    const { path, data } = params;

    this.path = path;
    this.data = data ?? "";
  }

  async save() {
    const formatted = await this.format();
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, formatted, "utf8");
  }

  /**
   * Runs prettier in memory, resolving the consumer's config against the
   * final path (so staging elsewhere doesn't change the formatting).
   */
  async format(): Promise<string> {
    const outputPath = resolve(this.path);
    const options = await prettier.resolveConfig(outputPath);
    return prettier.format(this.data, { ...options, filepath: outputPath });
  }

  async safeSave() {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, this.data, "utf8");
  }

  changeData(data: string) {
    this.data = data;
  }

  buildPath(endpoint: string[]) {
    if (endpoint.length === 1) return endpoint[0];
    return endpoint.join("/");
  }
}
