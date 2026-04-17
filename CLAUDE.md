# svelte-reflector

Codegen library that turns a consumer project's OpenAPI document into typed,
ready-to-import SvelteKit modules: one `*.module.svelte.ts` class per
controller, a companion `*.schema.svelte.ts` with the zod-ish schema classes
it needs, and shared runtime files (enums, field names, mocked path params,
a reflector runtime template).

Used two ways:
- As a **Vite plugin**: `reflector()` from `src/index.ts` is called during
  the dev server boot. In `DEV` it skips regeneration; in any other env it
  refetches the OpenAPI doc and rewrites the generated folder.
- As a **CLI**: `npx reflect` runs `reflector(true)` to force regeneration
  regardless of environment.

## Commands

- `npm run build` — compiles TS (`tsc`) and the runtime template
  (`tsc -p tsconfig.runtime.json`), then copies `src/runtime/*.svelte.ts`
  into `dist/runtime/`.
- `npm run typecheck:runtime` — type-checks only the runtime template, which
  has SvelteKit-specific globals (`$state`, `$derived`, `page.params`) and
  needs its own tsconfig.

There are no unit tests. Refactor safety relies on byte-identical output
against a known consumer project.

## Pipeline (one run)

```
generate-doc.reflector()          src/generate-doc.ts
 ├─ OpenAPILoader.load            HTTP GET + on-failure fallback to backup
 ├─ ConfigLoader.load*            reflector.config.ts / .types.ts / .json
 └─ new Reflector(...).build()    src/core/Reflector.ts
      ├─ InlineSchemaPromoter     promotes inline req-body + response.data
      │                           schemas to named components (mutates doc)
      ├─ ModuleFactory            groups paths by operationId prefix →
      │                           Module[] (one per controller)
      ├─ SchemaRegistry           builds Schema[] from components.schemas,
      │                           keeps a Map<string,Schema> for lookups,
      │                           resolveTransitiveDeps for per-module split
      ├─ ModuleSchemaFileBuilder  per-module *.schema.svelte.ts content
      ├─ RuntimeFilesEmitter      fields.ts, enums.ts, mocked-params.svelte.ts,
      │                           reflector.svelte.ts (template)
      └─ Promise.all saves        all Sources in parallel through prettier
```

`CodegenContext` is a per-run state bag shared across the pipeline:
`enumTypes` (joined-literals → generated type name) and `mockedParams`
(path-param names needing `$state` stubs). It replaces module-level
globals — two concurrent `Reflector` instances don't corrupt each other.

## Directory layout

Root of `src/` is kept deliberately thin — only entry points and
runtime-adjacent utilities:

- `cli.ts` / `generate-doc.ts` / `index.ts` — entries
- `file.ts` — `Source` wrapper (path + data, `save()` runs prettier)
- `loadTemplate.ts` — reads the reflector runtime template verbatim
- `vars.global.ts` — `generatedDir` ( = `src/reflector`)
- `runtime/` — the hand-written `.svelte.ts` template that gets copied into
  consumers' generated folders; typechecked with a separate tsconfig
- `types/` — OpenAPI spec interfaces + internal `Info`, `FieldConfigs`, etc.
- `props/` — `PrimitiveProp`, `ArrayProp`, `ObjectProp`, `EnumProp`: each
  knows how to render itself (`constructorBuild`, `classBuild`,
  `bundleBuild`, `interfaceBuild`, `staticBuild`)
- `helpers/` — `isReferenceObject`, `capitalizeFirstLetter`,
  `splitByUppercase`, `toKebabCase`, the `generate-doc.helper.ts` parsers
- `loaders/` — `OpenAPILoader` (HTTP+fallback), `ConfigLoader`
  (reflector.config.ts / reflector.types.ts / reflector.json)

All codegen logic lives under `src/core/`:

- `Reflector.ts` — orchestrator (~90 LOC)
- `CodegenContext.ts` — per-run state
- `config/ReflectorConfig.ts` — framework-injection surface (see below)
- `openapi/InlineSchemaPromoter.ts` — inline body/response promotion
- `schema/` — `Schema` (value-type orchestrator), `SchemaPropertyClassifier`
  (pure function: key+value → Prop subclass), `SchemaDependencyCollector`
  (schemaDeps/enumDeps/customTypeDeps), `SchemaClassRenderer` (class-string
  assembly), `SchemaRegistry` (builds Schema[] + resolveTransitiveDeps),
  `ReflectorInterface` (renders the `XxxInterface` type alongside each class)
- `module/` — `Module` (per-controller aggregate), `ModuleFactory`,
  `ModuleSchemaFileBuilder` (per-module schema file), and the internal
  processors/builders (`ModuleMethodProcessor`, `ModuleParamProcessor`,
  `ModuleClassBuilder`, `ModuleConstructorBuilder`, `ModuleFileBuilder`,
  `ModuleImports`)
- `method/` — `Method` + analyzers (`MethodBodyAnalyzer`,
  `MethodResponseAnalyzer`, `MethodRequestAnalyzer`,
  `MethodApiTypeAnalyzer`, `MethodEndpointBuilder`), `MethodBuilder`,
  `MethodValidator`, and code generators under `method/generators/`
- `api/` — the optional "experimental" Api class file
  (`ApiClassBuilder`, `ApiFileBuilder`, `ApiParamProcessor`) emitted when
  `reflector.json` sets `experimentalFeatures: true`
- `generators/` — shared call strategies (`ApiCallStrategy`,
  `ModuleCallStrategy`, `CallMethodGenerator`)
- `emit/RuntimeFilesEmitter.ts` — the four shared runtime files

## ReflectorConfig — framework strings

The library's output is SvelteKit-flavored by default (`$reflector/…`,
`$lib/sanitizers/validateFormats`, `$env/static/public`,
`PUBLIC_ENVIRONMENT`). Those four strings are **not** hard-coded in the
emitters — they're fields on `ReflectorConfig`:

- `reflectorAlias` — prefix for generated-folder imports (default `$reflector`)
- `validatorsImport` — full import path to the validators module
- `environmentImport` — module to import the env flag from
- `environmentFlag` — name of the env flag (non-`DEV` ⇒ production)

Defaults live in `src/core/config/ReflectorConfig.ts`. Consumers override
any subset via `reflector.json` → `"config": { ... }`. The config is
threaded through `Reflector` → `ModuleFactory` → `Module` →
`ModuleImports`/`ModuleConstructorBuilder`, and through
`ModuleSchemaFileBuilder`.

## Consumer-project files read at runtime

- `reflector.json` — `{ api: string, experimentalFeatures?: boolean, config?: Partial<ReflectorConfig> }`. Optional; ENOENT is silent.
- `src/reflector.config.ts` — `export const fieldConfigs = [{ fields, validator, type }]`. Parsed by regex/brace-walking — AST parser would be nicer but isn't worth the dep. Optional.
- `src/reflector.types.ts` — a file whose only purpose is to list `import type { X } from '…'` statements for custom field types. Optional.
- `src/reflector/backup.json` — written on every successful fetch; read if the live fetch fails.

## Hard rules when changing codegen

- **Generated output is the contract.** There are no tests — the only way
  to validate a change is to diff the generated folder of a reference
  consumer project before and after. Template string whitespace matters
  (including trailing spaces inside generated class constructors — a
  previous refactor had to preserve `"}) { "` byte-for-byte).
- **Constructors populate, `build()` executes.** No I/O in constructors.
- **No strings `$lib` / `$env` / `$reflector` in `src/core/**` outside
  `ReflectorConfig.ts` defaults.** Any new emitter takes the config.
- **`CodegenContext` is per-run.** Don't reintroduce module-level mutable
  state for shared enum / mocked-param tracking.

## Generated layout on the consumer side

```
src/reflector/
├── backup.json
├── fields.ts                       (FIELD_NAMES union)
├── enums.ts                        (generated enum unions)
├── mocked-params.svelte.ts         (MockedParams class)
├── reflector.svelte.ts             (copied template)
└── controllers/
    └── <module>/
        ├── <module>.module.svelte.ts
        ├── <module>.schema.svelte.ts
        └── <module>.api.svelte.ts   (only if experimentalFeatures)
```
