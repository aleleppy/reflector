import type { MethodAnalyzers } from "../method/Method.js";

/** Structural subset of `Method` that the generator and strategies actually read. */
export interface CallMethodInput {
  name: string;
  /** Disambiguation suffix appended to the base name; empty when unique. */
  nameSuffix: string;
  /** Disambiguation suffix for the shared list state field; empty when
   *  the module has at most one list-typed method. */
  stateSuffix: string;
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
  /** Full signature of the discriminated `run` method incl. params —
   *  e.g. `async run(params?: ...)` (api) or `protected async _fooRun(params?: ...)` (module). */
  buildSignature(method: CallMethodInput): string;
  /** Full `@deprecated` legacy method that delegates to the `run` variant and
   *  reproduces the old `Res | null | undefined` return shape. Emitted verbatim
   *  after the run method. Api → `call()`; module → `_foo()`. */
  buildLegacyWrapper(method: CallMethodInput): string;
  /** State field holding list results — e.g. `this.list` / `this.listControllers` (module) or `this.data` (api).
   *  Takes `method` so the module strategy can suffix the field when two list
   *  operations collide in the same controller. */
  listStateAccess(method: CallMethodInput): string;
  /** State field receiving the fetched entity */
  entityStateAccess(method: CallMethodInput): string;
  /** Form instance accessed to bundle body data */
  formStateAccess(method: CallMethodInput): string;
}
