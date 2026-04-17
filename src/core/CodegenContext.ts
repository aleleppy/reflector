/**
 * Per-run codegen state. Replaces module-level mutable globals so two
 * concurrent Reflector instances don't corrupt each other's output.
 *
 * - `enumTypes`: maps the joined enum literal string (e.g. `'a','b','c'`) to
 *   its generated type name. `EnumProp` writes here on first sighting and
 *   reads back the stable name on repeat sightings.
 * - `mockedParams`: set of path-param names that need `$state` fallbacks in
 *   the generated `MockedParams` class. Written by `ModuleClassBuilder` when
 *   it sees path params.
 */
export class CodegenContext {
  readonly enumTypes = new Map<string, string>();
  readonly mockedParams = new Set<string>();
}
