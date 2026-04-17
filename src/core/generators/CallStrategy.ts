import type { MethodAnalyzers } from "../method/Method.js";

/** Structural subset of `Method` that the generator and strategies actually read. */
export interface CallMethodInput {
  name: string;
  endpoint: string;
  description: string | undefined;
  responseTypeInterface: string;
  analyzers: MethodAnalyzers;
}

/**
 * Differences between the two flavors of generated `call` method
 * (per-endpoint Api class vs Module `_methodName` protected method).
 */
export interface CallStrategy {
  /** Full method signature incl. params — e.g. `async call(params?: ...)` or `protected async _foo(params?: ...)` */
  buildSignature(method: CallMethodInput): string;
  /** State field holding list results — e.g. `this.list` (module) or `this.data` (api) */
  readonly listStateAccess: string;
  /** State field receiving the fetched entity */
  entityStateAccess(method: CallMethodInput): string;
  /** Form instance accessed to bundle body data */
  formStateAccess(method: CallMethodInput): string;
}
