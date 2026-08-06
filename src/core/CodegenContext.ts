/**
 * Per-run codegen state. Replaces module-level mutable globals so two
 * concurrent Reflector instances don't corrupt each other's output.
 *
 * - `enumTypes`: maps the generated type name to its joined enum literal string
 *   (e.g. `ENUM_USER_ENTITY_ROLES` → `'admin','user'`). The name is always
 *   derived from the schema that declares the field, never inherited from
 *   whichever schema happened to be scanned first — see `EnumProp` for the
 *   collision rule. Keyed by name (not by literals) precisely so that a new
 *   back-end schema reusing an existing value-set can't rename an existing
 *   export.
 * - `mockedParams`: set of path-param names that need `$state` fallbacks in
 *   the generated `MockedParams` class. Written by `ModuleClassBuilder` when
 *   it sees path params.
 */
export class CodegenContext {
  readonly enumTypes = new Map<string, string>();
  readonly mockedParams = new Set<string>();
}
