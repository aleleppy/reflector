# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1]

### Fixed
- 2.1.0 wired `params?.queryOverride` into the shared `call()` body but the
  experimental Api class strategy (`*.api.svelte.ts`, emitted when
  `experimentalFeatures: true`) kept emitting `ApiCallParams<TResponse>` /
  `ApiCallParams<TResponse, TPaths>` without the third generic. Result: the
  generated Api class did not typecheck on consumer projects whenever an
  endpoint had query params (e.g. List operations) — `Property
  'queryOverride' does not exist on type 'ApiCallParams<...>'`.
- Now the Api class emits `ApiCallParams<TResponse, TPaths | void, { ... }>`
  with an inline override shape derived from the operation's query props.
  Endpoints without query params keep the previous 1- or 2-arg form.
- Module strategy was already correct (it inlines the entire params type
  literal); the regression was only in the experimental path.

### Internal
- Extracted `queryOverrideEntryType` / `queryOverrideTypeLiteral` to
  `src/core/generators/queryOverride.ts`, shared between Module and Api
  strategies.

## [2.1.0]

### Added
- Generated `call()` methods that have query params now accept an optional
  `queryOverride` argument. When provided, the method skips
  `this.querys.bundle()` and uses `queryOverride` directly as `queryData`.
  The URL is not touched. Use case: ephemeral pagination outside the
  canonical route — sidebars, widgets, modals — that should not pollute
  the current URL.
- Without `queryOverride`, behavior is identical to 2.0.0 (reads the URL
  via `QueryBuilder.value`).
- `ApiCallParams<TResponse, TPaths, TQuery>` gained an optional third type
  parameter for the override shape. Existing call sites with one or two
  type args remain valid.

## [2.0.0] — BREAKING

### Changed
- `QueryBuilder` is now purely derived from the URL via a getter. `value`
  is read-only — every read goes through `page.url.searchParams.get(key)`.
  Multiple instances with the same key always agree; the local `$state`
  was removed.
- `update()` is the only write path. It calls `goto()` and no longer
  mutates a local field.
- `QueryBuilder` and `EnumQueryBuilder` constructors now accept a default
  fallback: `defaultValue` (single) and `defaultValues` (array). These
  are propagated automatically from the OpenAPI schema's `default` field.
- `EnumQueryBuilder.values` falls back to `defaultValues` when the URL
  does not contain the param (`searchParams.has(key) === false`). When
  the param is present (even empty), the URL wins.
- Generated controllers no longer wrap query builders in `$derived(...)`.
  Reactivity lives inside the builder; wrapping caused the builder to be
  reinstantiated on every URL change, which silently discarded any
  consumer-side defaults.
- The auto-injected `setQueryGroup([...])` constructor on the generated
  `Querys` class was removed. Defaults now live on the builder itself,
  not on the URL. `setQueryGroup` is still exported by the runtime for
  manual use.

### Migration
- Replace `q.value = "x"` or `q.value ??= "x"` with either:
  - `defaultValue: "x"` in the constructor (for declarative defaults), or
  - `q.update("x")` (for imperative changes that should also push the URL).
- If you relied on the auto-`setQueryGroup` to seed the URL with
  defaults on first mount, declare those defaults in your OpenAPI
  schema's `default` field — they will be propagated to the builder
  constructor automatically. The URL stays clean until the user
  interacts.
- The generated `Querys` class no longer has a constructor; importing
  `setQueryGroup` from the controllers' top-level is no longer
  automatic. Import it explicitly from `$reflector/reflector.svelte`
  if you still need it.

## [1.3.11] and prior

See git history.
