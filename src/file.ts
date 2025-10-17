import { writeFileSync } from "node:fs";
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
    const options = await prettier.resolveConfig(process.cwd());
    const formatted = await prettier.format(this.data, { ...options, filepath: this.path });

    writeFileSync(this.path, formatted, "utf8");
  }

  async safeSave() {
    writeFileSync(this.path, this.data, "utf8");
  }

  async changeData(data: string) {
    this.data = data;
  }

  buildPath(endpoint: string[]) {
    if (endpoint.length === 1) return endpoint[0];
    return endpoint.join("/");
  }
}
