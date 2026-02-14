import type { Method } from "../method.js";
import type { Source } from "../file.js";

export class Module {
  readonly name: string;
  readonly path: string;
  readonly moduleName: string;
  readonly src: Source;
  readonly methods: Method[];

  constructor(params: { name: string; path: string; moduleName: string; methods: Method[]; src: Source }) {
    this.name = params.name;
    this.path = params.path;
    this.moduleName = params.moduleName;
    this.methods = params.methods;
    this.src = params.src;
  }
}
